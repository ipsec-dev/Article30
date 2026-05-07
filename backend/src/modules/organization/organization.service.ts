import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { NotificationSettingsDto } from './dto/notification-settings.dto';

const NOTIFICATION_KEYS = [
  'notifyDsrDeadline',
  'notifyVendorDpaExpiry',
  'notifyTreatmentReview',
  'notifyViolation72h',
] as const;
type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

const NOTIFICATION_SETTINGS_SELECT = Object.fromEntries(
  NOTIFICATION_KEYS.map(k => [k, true]),
) as Record<NotificationKey, true>;

// Defaults all-true since the schema columns also default true. Used by the
// GET fallback only — first-run case when no Organization row exists yet.
const NOTIFICATION_SETTINGS_DEFAULTS: Record<NotificationKey, boolean> = Object.fromEntries(
  NOTIFICATION_KEYS.map(k => [k, true]),
) as Record<NotificationKey, boolean>;

export type NotificationSettings = Record<NotificationKey, boolean>;

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async get() {
    return this.prisma.organization.findFirst();
  }

  async update(dto: UpdateOrganizationDto) {
    const existing = await this.prisma.organization.findFirst();
    this.logger.log({ event: 'organization.settings.updated' });
    if (!existing) {
      return this.prisma.organization.create({
        data: { slug: `org-${Date.now()}`, ...dto },
      });
    }
    return this.prisma.organization.update({
      where: { id: existing.id },
      data: dto,
    });
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    const org = await this.prisma.organization.findFirst({
      select: NOTIFICATION_SETTINGS_SELECT,
    });
    return org ?? { ...NOTIFICATION_SETTINGS_DEFAULTS };
  }

  async updateNotificationSettings(
    dto: NotificationSettingsDto,
    actingUserId: string,
  ): Promise<NotificationSettings> {
    // class-transformer's plainToInstance populates every decorated property
    // as `undefined`, so Object.keys(dto) is always 4 even for an empty body.
    // Filter to defined values to detect "no actual changes requested".
    const definedEntries = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (definedEntries.length === 0) {
      throw new BadRequestException('At least one setting must be provided');
    }

    const existing = await this.prisma.organization.findFirst({
      select: { id: true, ...NOTIFICATION_SETTINGS_SELECT },
    });
    // Settings PATCH does NOT auto-create the org. The org row is provisioned
    // via PATCH /api/organization (profile endpoint); requiring it here avoids
    // an audit-row that misrepresents `oldValue` (defaults vs. never-existed).
    if (!existing) {
      throw new NotFoundException('No organization configured');
    }

    // Only the explicitly-set keys flow into the UPDATE — keeps the diff
    // narrow and avoids accidental column resets.
    const data = Object.fromEntries(definedEntries) as Partial<NotificationSettings>;
    const updated = await this.prisma.organization.update({
      where: { id: existing.id },
      data,
      select: NOTIFICATION_SETTINGS_SELECT,
    });

    const oldValue: NotificationSettings = {
      notifyDsrDeadline: existing.notifyDsrDeadline,
      notifyVendorDpaExpiry: existing.notifyVendorDpaExpiry,
      notifyTreatmentReview: existing.notifyTreatmentReview,
      notifyViolation72h: existing.notifyViolation72h,
    };

    await this.audit.create({
      action: 'UPDATE',
      entity: 'organization-settings',
      entityId: existing.id,
      oldValue: oldValue as unknown as Prisma.InputJsonValue,
      newValue: updated as unknown as Prisma.InputJsonValue,
      performedBy: actingUserId,
    });

    this.logger.log({
      event: 'organization.notification_settings.updated',
      actingUserId,
    });

    return updated;
  }
}
