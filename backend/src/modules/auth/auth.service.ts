import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PasswordResetTokenService } from './password-reset-token.service';
import { SessionService } from './session.service';
import { MailService } from '../mail/mail.service';
import { resolveLocale } from '../mail/locale';
import { emailHash } from '../../common/logging/email-hash';
import { Role } from '@article30/shared';

const BCRYPT_SALT_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: PasswordResetTokenService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
  ) {}

  async signup(dto: SignupDto) {
    // Hash BEFORE the transaction — bcrypt is slow and we don't want to hold
    // row locks for ~100ms per signup. Plausible-attack window is already
    // closed by the transaction's serializable isolation.
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // Serializable isolation: two concurrent signups must not both observe
    // count=0 and both become ADMIN. Postgres aborts the loser with a
    // serialization failure.
    return this.prisma.$transaction(
      async tx => {
        const existing = await tx.user.findUnique({
          where: { email: dto.email },
        });
        if (existing) {
          // Do not log the email — GDPR Art. 5(1)(c) data minimisation.
          this.logger.warn({
            event: 'auth.signup.rejected',
            reason: 'email_taken',
            emailHash: emailHash(dto.email),
          });
          throw new ConflictException('Email already in use');
        }

        const userCount = await tx.user.count();
        if (userCount > 0) {
          this.logger.warn({
            event: 'auth.signup.rejected',
            reason: 'signup_closed',
            emailHash: emailHash(dto.email),
          });
          throw new GoneException({ error: 'signup_closed' });
        }

        // userCount === 0 → this is the bootstrap signup. First user becomes ADMIN + approved.
        const user = await tx.user.create({
          data: {
            role: Role.ADMIN,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            password: hashedPassword,
            approved: true,
          },
        });

        this.logger.log({
          event: 'auth.signup.succeeded',
          role: 'admin',
          userId: user.id,
        });
        const { password: _password, ...result } = user;
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      // Do not log the email — GDPR Art. 5(1)(c).
      this.logger.warn({
        event: 'auth.login.failed',
        reason: 'user_not_found',
        emailHash: emailHash(dto.email),
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      // Do not log the email — GDPR Art. 5(1)(c).
      this.logger.warn({
        event: 'auth.login.failed',
        reason: 'invalid_password',
        userId: user.id,
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    this.logger.log({ event: 'auth.login.succeeded', userId: user.id });
    const { password: _password, ...result } = user;
    return result;
  }

  async forgotPassword(dto: ForgotPasswordDto, acceptLanguage: string | undefined): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.approved) {
      return;
    }

    const token = await this.tokenService.generate(user.id);
    const locale = resolveLocale(acceptLanguage);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    await this.mailService.send({
      to: user.email,
      templateId: 'password-reset',
      context: {
        resetUrl: `${frontendUrl}/reset-password?token=${token}`,
        expiresInMinutes: '60',
      },
      locale,
    });

    this.logger.log({ event: 'auth.password.reset.requested', userId: user.id });
  }

  async resetPassword(dto: ResetPasswordDto, acceptLanguage: string | undefined): Promise<void> {
    const userId = await this.tokenService.verify(dto.token);
    if (!userId) {
      throw new BadRequestException('invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    // Successfully consuming a reset token implies the user has demonstrated
    // ownership of the email and is choosing a real password — flip approved
    // to true so an invitee can log in once they finish onboarding (#C).
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        approved: true,
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      },
    });

    await this.tokenService.markUsed(dto.token);
    await this.sessionService.destroyAllForUser(userId);

    const locale = resolveLocale(acceptLanguage);
    await this.mailService.send({
      to: user.email,
      templateId: 'password-changed',
      context: {},
      locale,
    });

    this.logger.log({ event: 'auth.password.reset.completed', userId });
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
    acceptLanguage: string | undefined,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('new password must differ from current');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.sessionService.destroyAllForUserExcept(userId, currentSessionId);

    const locale = resolveLocale(acceptLanguage);
    await this.mailService.send({
      to: user.email,
      templateId: 'password-changed',
      context: {},
      locale,
    });

    this.logger.log({ event: 'auth.password.changed', userId });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName },
    });
    this.logger.log({ event: 'auth.profile.updated', userId });
    const { password: _password, ...result } = user;
    return result;
  }
}
