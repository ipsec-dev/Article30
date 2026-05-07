import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { emailHash } from '../../common/logging/email-hash';
import { createMailTransport } from './transport.factory';
import { loadTemplate, renderTemplate } from './template.renderer';

export type TemplateId =
  | 'password-reset'
  | 'password-changed'
  | 'user-invite'
  | 'admin-password-reset'
  | 'dsr-submitted'
  | 'dsr-deadline'
  | 'violation-logged'
  | 'violation-72h-kickoff'
  | 'violation-72h'
  | 'vendor-questionnaire-returned'
  | 'vendor-dpa-expiring'
  | 'treatment-review-due'
  | 'action-item-assigned';
export type Locale = 'en' | 'fr';

export interface SendMailArgs {
  to: string;
  templateId: TemplateId;
  locale: Locale;
  context: Record<string, string>;
}

export type MailSink = Array<{ to: string; subject: string; text: string }>;

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transport: Transporter | null = null;
  private sink: MailSink | null = null;
  private enabled = true;
  private initialised = false;

  onModuleInit(): void {
    if (this.initialised) {
      return;
    }
    const result = createMailTransport(this.logger);
    this.transport = result.transport;
    this.sink = result.sink;
    this.enabled = result.enabled;
    this.initialised = true;
  }

  /** Test helper — swap in a real transport + capture sink. Marks as initialised + enabled. */
  setTransportForTesting(transport: Transporter, sink: MailSink | null = null): void {
    this.transport = transport;
    this.sink = sink;
    this.enabled = true;
    this.initialised = true;
  }

  /** Test helper — put the service in the disabled-at-boot state without touching env. */
  setDisabledForTesting(): void {
    this.transport = null;
    this.sink = null;
    this.enabled = false;
    this.initialised = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async send(args: SendMailArgs): Promise<void> {
    if (!this.enabled) {
      this.logger.log({
        event: 'mail.skipped',
        reason: 'smtp_disabled',
        templateId: args.templateId,
        locale: args.locale,
        emailHash: emailHash(args.to),
      });
      return;
    }

    if (!this.transport) {
      throw new Error('MailService.send called before onModuleInit');
    }

    const template = loadTemplate(args.templateId, args.locale);
    const rendered = renderTemplate(template, args.context);
    const from = process.env.SMTP_FROM ?? 'no-reply@localhost';

    await this.transport.sendMail({
      from,
      to: args.to,
      subject: rendered.subject,
      text: rendered.body,
    });

    if (this.sink) {
      this.sink.push({ to: args.to, subject: rendered.subject, text: rendered.body });
    }

    this.logger.log({
      event: 'mail.sent',
      templateId: args.templateId,
      locale: args.locale,
      emailHash: emailHash(args.to),
    });
  }
}
