import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService, type Locale } from '../mail/mail.service';
import {
  type NotificationKind,
  type NotificationSettingKey,
  KIND_TO_SETTING,
  KIND_TO_TEMPLATE,
} from './notification-kinds';
import { resolveRecipient } from './recipient-resolver';
import { resolveRecipientLocale } from './locale-resolver';
import { buildFooterOrientation, type RecipientRole } from './format';

const INSTANT_LEAD_TIME = 'INSTANT';

export interface NotifyArgs {
  kind: NotificationKind;
  recordId: string;
  /** "T-7" / "T-1" / "T+1" / "T-24h" / "T-6h" / "T-30" — required for scheduled kinds, ignored for instant. */
  leadTime?: string;
  assigneeEmail?: string | null;
  orgDpoEmail?: string | null;
  orgLocale?: string | null;
  /** Org company name — used for sign-off + footer orientation. Falls back to ''. */
  orgCompanyName?: string | null;
  /** Which fallback path resolved the recipient — drives the footer orientation line. */
  recipientRole?: RecipientRole;
  /** Settings record from the org row — only the toggle for `kind` is consulted. */
  settings?: Partial<Record<NotificationSettingKey, boolean>>;
  /** Template variables. Common keys: recordTitle, recipientFirstName, recordUrl, deadlineDate, leadTimeLabel. */
  context: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async notify(args: NotifyArgs): Promise<void> {
    const { kind, recordId } = args;
    const leadTime = args.leadTime ?? INSTANT_LEAD_TIME;

    if (!this.mail.isEnabled()) {
      this.logger.log({
        event: 'notification.skipped',
        reason: 'smtp_disabled',
        kind,
        recordId,
      });
      return;
    }

    const settingKey = KIND_TO_SETTING[kind as keyof typeof KIND_TO_SETTING];
    if (settingKey && args.settings && args.settings[settingKey] === false) {
      this.logger.log({
        event: 'notification.skipped',
        reason: 'setting_off',
        kind,
        recordId,
      });
      return;
    }

    const recipient = resolveRecipient({
      assigneeEmail: args.assigneeEmail,
      dpoEmail: args.orgDpoEmail,
    });
    if (!recipient) {
      this.logger.warn({
        event: 'notification.dropped',
        reason: 'no_recipient',
        kind,
        recordId,
      });
      return;
    }

    const existing = await this.prisma.notificationLog.findUnique({
      where: { kind_recordId_leadTime: { kind, recordId, leadTime } },
    });
    if (existing) {
      this.logger.log({
        event: 'notification.skipped',
        reason: 'already_sent',
        kind,
        recordId,
        leadTime,
      });
      return;
    }

    const locale: Locale = resolveRecipientLocale(args.orgLocale ?? null);
    const templateId = KIND_TO_TEMPLATE[kind];

    const orgCompanyName = args.orgCompanyName ?? '';
    const settingsUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/settings#notifications`;
    const footerOrientation = args.recipientRole
      ? buildFooterOrientation(args.recipientRole, orgCompanyName, locale)
      : '';

    await this.mail.send({
      to: recipient,
      templateId,
      context: {
        ...args.context,
        orgCompanyName,
        settingsUrl,
        footerOrientation,
      },
      locale,
    });

    // findUnique above is a best-effort fast-path; under concurrent calls two
    // notify()s for the same (kind, recordId, leadTime) can both pass it, so
    // the unique constraint is still authoritative. Treat the duplicate-key
    // loser as a successful no-op — the mail already went out, and the winner
    // owns the audit row.
    try {
      await this.prisma.notificationLog.create({
        data: { kind, recordId, leadTime, recipientEmail: recipient },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        this.logger.log({
          event: 'notification.skipped',
          reason: 'race_lost',
          kind,
          recordId,
          leadTime,
        });
        return;
      }
      throw e;
    }

    this.logger.log({
      event: 'notification.sent',
      kind,
      recordId,
      leadTime,
      templateId,
    });
  }
}
