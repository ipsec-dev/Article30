import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordResetTokenService } from '../auth/password-reset-token.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailService } from '../mail/mail.service';
import { resolveLocale } from '../mail/locale';
import { emailHash } from '../../common/logging/email-hash';
import { Role } from '@article30/shared';
import { InviteUserDto } from './dto/invite-user.dto';

const RESET_TOKEN_TTL_MINUTES = 60;
const BCRYPT_SALT_ROUNDS = 10;
const DISABLED_PASSWORD_BYTES = 32;

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  approved: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: PasswordResetTokenService,
    private readonly audit: AuditLogService,
    private readonly mail: MailService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ password: _password, ...u }) => u);
  }

  async approve(id: string) {
    await this.findOrFail(id);
    this.logger.log({ event: 'user.approved', targetUserId: id });
    return this.prisma.user.update({
      where: { id },
      data: { approved: true },
      select: USER_SELECT,
    });
  }

  async changeRole(id: string, role: Role, currentUserId: string) {
    if (id === currentUserId) {
      this.logger.warn({
        event: 'user.role.change.rejected',
        reason: 'self_role_change',
        actorId: currentUserId,
      });
      throw new ForbiddenException('Cannot change your own role');
    }
    await this.findOrFail(id);
    this.logger.log({ event: 'user.role.changed', targetUserId: id, role });
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: USER_SELECT,
    });
  }

  async deactivate(id: string, currentUserId: string) {
    if (id === currentUserId) {
      this.logger.warn({
        event: 'user.deactivate.rejected',
        reason: 'self_deactivate',
        actorId: currentUserId,
      });
      throw new ForbiddenException('Cannot deactivate yourself');
    }
    await this.findOrFail(id);
    this.logger.log({ event: 'user.deactivated', targetUserId: id });
    return this.prisma.user.update({
      where: { id },
      data: { approved: false },
      select: USER_SELECT,
    });
  }

  async adminResetPassword(
    targetUserId: string,
    actingAdminId: string,
    acceptLanguage?: string,
  ): Promise<{ resetUrl: string; expiresInMinutes: number; emailed: boolean }> {
    if (targetUserId === actingAdminId) {
      throw new ForbiddenException('admins cannot reset their own password via this endpoint');
    }
    const target = await this.findOrFail(targetUserId);

    await this.audit.create({
      action: 'user.admin_password_reset_issued',
      entity: 'user',
      entityId: targetUserId,
      performedBy: actingAdminId,
    });

    const token = await this.tokens.generate(targetUserId);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    this.logger.log({
      event: 'auth.password.admin_reset_issued',
      targetUserId,
      actingAdminId,
    });

    let emailed = false;
    if (this.mail.isEnabled()) {
      await this.mail.send({
        to: target.email,
        templateId: 'admin-password-reset',
        locale: resolveLocale(acceptLanguage),
        context: {
          resetUrl,
          expiresInMinutes: String(RESET_TOKEN_TTL_MINUTES),
        },
      });
      emailed = true;
    }

    return { resetUrl, expiresInMinutes: RESET_TOKEN_TTL_MINUTES, emailed };
  }

  async invite(
    dto: InviteUserDto,
    actingAdminId: string,
    acceptLanguage?: string,
  ): Promise<{
    user: { id: string; email: string; role: Role };
    resetUrl: string;
    expiresInMinutes: number;
    emailed: boolean;
  }> {
    // Single-tenant: no Membership to create, so the email-uniqueness check
    // and the user.create can share the default isolation. Postgres' UNIQUE
    // constraint on user.email rejects concurrent duplicates regardless.
    // The invitee is created with approved=false and placeholder names;
    // flipping to true and setting real firstName/lastName happens on a
    // successful password reset (auth.service.resetPassword).
    const newUser = await this.prisma.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        this.logger.warn({
          event: 'user.invite.rejected',
          reason: 'email_taken',
          emailHash: emailHash(dto.email),
        });
        throw new ConflictException('Email already in use');
      }
      const disabledPlaintext = randomBytes(DISABLED_PASSWORD_BYTES).toString('hex');
      const disabledHash = await bcrypt.hash(disabledPlaintext, BCRYPT_SALT_ROUNDS);
      const user = await tx.user.create({
        data: {
          email: dto.email,
          // Placeholder names: invitee fills real values via reset-password page.
          firstName: '',
          lastName: '',
          role: dto.role,
          password: disabledHash,
          approved: false,
        },
      });

      return user;
    });

    // Audit FIRST, token SECOND — so a partial failure never leaves an orphan live token.
    await this.audit.create({
      action: 'user.invited',
      entity: 'user',
      entityId: newUser.id,
      performedBy: actingAdminId,
      newValue: { email: newUser.email, role: newUser.role },
    });

    this.logger.log({
      event: 'user.invited',
      targetUserId: newUser.id,
      role: newUser.role,
      actingAdminId,
    });

    const token = await this.tokens.generate(newUser.id);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    // `invite=1` flag tells the reset-password page to show first/last name
    // fields. forgot-password and admin-issued resets omit it because those
    // flows hit *existing* users whose names already exist.
    const resetUrl = `${frontendUrl}/reset-password?token=${token}&invite=1`;

    let emailed = false;
    if (this.mail.isEnabled()) {
      await this.mail.send({
        to: newUser.email,
        templateId: 'user-invite',
        locale: resolveLocale(acceptLanguage),
        context: {
          resetUrl,
          expiresInMinutes: String(RESET_TOKEN_TTL_MINUTES),
        },
      });
      emailed = true;
    }

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role as Role,
      },
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      resetUrl,
      emailed,
    };
  }

  private async findOrFail(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
