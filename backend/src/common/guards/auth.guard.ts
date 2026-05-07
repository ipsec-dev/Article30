import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Logger as PinoLoggerInstance } from 'pino';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../types/request-user';

interface RequestWithLog {
  log?: PinoLoggerInstance;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    if (!userId) {
      this.logger.warn({ event: 'auth.guard.rejected', reason: 'no_session' });
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn({ event: 'auth.guard.rejected', reason: 'user_not_found', userId });
      throw new UnauthorizedException();
    }

    request.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      approved: user.approved,
    } satisfies RequestUser;

    // Bind userId onto the per-request pino child so downstream logs carry it.
    const req: RequestWithLog = request;
    if (req.log && typeof req.log.setBindings === 'function') {
      req.log.setBindings({ userId: user.id });
    }

    return true;
  }
}
