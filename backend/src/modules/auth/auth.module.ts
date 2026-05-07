import { Module, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { SessionService, REDIS_CLIENT } from './session.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetTokenService,
    SessionService,
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const logger = new Logger('AuthRedis');
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const password = process.env.REDIS_PASSWORD;
        const resolved = (() => {
          if (!password) {
            return url;
          }
          const parsed = new URL(url);
          if (parsed.username || parsed.password) {
            return url;
          }
          parsed.password = password;
          return parsed.toString();
        })();
        const client = new Redis(resolved);
        client.on('error', err => logger.error({ event: 'redis.error', err }));
        return client;
      },
    },
  ],
  exports: [PasswordResetTokenService, SessionService],
})
export class AuthModule {}
