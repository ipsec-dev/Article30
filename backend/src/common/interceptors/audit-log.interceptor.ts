import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, switchMap, tap } from 'rxjs';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SKIP_AUDIT_KEY } from '../decorators/skip-audit.decorator';

const ENTITY_MODEL_MAP: Record<string, string> = {
  treatment: 'treatment',
  checklist: 'checklistResponse',
  violation: 'violation',
  user: 'user',
  organization: 'organization',
  dsr: 'dataSubjectRequest',
};

const READ_ONLY_METHODS: Set<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (READ_ONLY_METHODS.has(method)) {
      return next.handle();
    }

    const user = request.user;
    const routePath: string = request.route?.path || request.url;
    const routeEntity = this.extractEntity(routePath);
    if (!user && routeEntity !== 'dsr') {
      return next.handle();
    }

    const fetchOldValue = async (): Promise<unknown> => {
      if (method === 'POST') {
        return undefined;
      }

      const path: string = request.route?.path || request.url;
      const entity = this.extractEntity(path);
      const modelName = ENTITY_MODEL_MAP[entity];
      if (!modelName) {
        return undefined;
      }

      const id = request.params?.id || request.params?.itemId;
      if (!id) {
        return undefined;
      }

      try {
        const model = (this.prisma as unknown as Record<string, unknown>)[modelName] as
          | { findUnique?: (args: unknown) => Promise<unknown> }
          | undefined;
        if (!model?.findUnique) {
          return undefined;
        }
        return await model.findUnique({ where: { id } });
      } catch {
        return undefined;
      }
    };

    return from(fetchOldValue()).pipe(
      switchMap(oldValue =>
        next.handle().pipe(
          tap(responseData => {
            const path: string = request.route?.path || request.url;
            const entity = this.extractEntity(path);
            const entityId = request.params?.id || request.params?.itemId || responseData?.id || '';
            const action = this.extractAction(method, path);

            this.auditLogService
              .create({
                action,
                entity,
                entityId: String(entityId),
                oldValue: oldValue ?? null,
                newValue: responseData ?? null,
                performedBy: user?.id ?? null,
              })
              .catch((err: Error) => this.logger.error({ event: 'audit.write.failed', err }));
          }),
        ),
      ),
    );
  }

  private extractEntity(path: string): string {
    const segments = path.split('/').filter(Boolean);
    const entitySegment = segments.find(s => !s.startsWith(':') && s !== 'api');
    return entitySegment?.replace(/s$/, '') || 'unknown';
  }

  private extractAction(method: string, path: string): string {
    // Order matters: 'invalidate' contains 'validate', so match the longer
    // keyword first to avoid misclassifying invalidation as validation.
    if (path.includes('invalidate')) {
      return 'INVALIDATE';
    }
    if (path.includes('validate')) {
      return 'VALIDATE';
    }
    if (path.includes('approve')) {
      return 'APPROVE';
    }
    if (path.includes('deactivate')) {
      return 'DEACTIVATE';
    }
    if (path.includes('role')) {
      return 'CHANGE_ROLE';
    }
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PATCH':
        return 'UPDATE';
      case 'PUT':
        return 'UPSERT';
      case 'DELETE':
        return 'DELETE';
      default:
        return method;
    }
  }
}
