import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApprovedGuard implements CanActivate {
  private readonly logger = new Logger(ApprovedGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (!request.user?.approved) {
      this.logger.warn({
        event: 'guard.access.denied',
        reason: 'not_approved',
        userId: request.user?.id,
      });
      throw new ForbiddenException('Account not yet approved');
    }
    return true;
  }
}
