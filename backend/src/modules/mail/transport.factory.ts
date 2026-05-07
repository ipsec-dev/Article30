import nodemailer, { Transporter } from 'nodemailer';
import { Logger } from '@nestjs/common';

const SMTP_SECURE_PORT = 465;

export interface MailTransportResult {
  transport: Transporter | null;
  /** Test sink — populated only when NODE_ENV=test; null otherwise or when disabled. */
  sink: Array<{ to: string; subject: string; text: string }> | null;
  /** Whether outbound mail is wired. When false, `transport` and `sink` are null. */
  enabled: boolean;
}

// Only an explicit (case-insensitive) string 'false' disables SMTP.
// Any other value — including '0', 'no', 'off', or an empty string — is
// treated as enabled. This keeps the default backwards-compatible for
// operators who upgrade without setting the flag, and avoids silently
// accepting "truthy-looking" off values that would mask configuration
// mistakes.
function isSmtpEnabled(): boolean {
  return (process.env.SMTP_ENABLED ?? 'true').toLowerCase() !== 'false';
}

const DEFAULT_SMTP_HOST = 'localhost';
const DEFAULT_SMTP_PORT = '1025';

function resolveDefaultHost(nodeEnv: string): string | undefined {
  if (nodeEnv === 'production') {
    return undefined;
  }
  return DEFAULT_SMTP_HOST;
}

function resolveDefaultPort(nodeEnv: string): string | undefined {
  if (nodeEnv === 'production') {
    return undefined;
  }
  return DEFAULT_SMTP_PORT;
}

function resolveSmtpAuth(): { user: string; pass: string } | undefined {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (user && pass) {
    return { user, pass };
  }
  return undefined;
}

function createTestTransport(): MailTransportResult {
  const sink: MailTransportResult['sink'] = [];
  const testTransport = nodemailer.createTransport({ jsonTransport: true });
  return { transport: testTransport, enabled: true, sink };
}

function assertProductionSmtpConfig(
  nodeEnv: string,
  host: string | undefined,
  portRaw: string | undefined,
  from: string | undefined,
): void {
  if (nodeEnv === 'production' && (!host || !portRaw || !from)) {
    throw new Error(
      'SMTP_HOST, SMTP_PORT, and SMTP_FROM are required when NODE_ENV=production and SMTP_ENABLED=true. ' +
        'Set them in the environment, or set SMTP_ENABLED=false to disable email-based flows.',
    );
  }
}

function describeAuth(auth: { user: string; pass: string } | undefined): string {
  if (auth) {
    return 'yes';
  }
  return 'no';
}

function describeFrom(from: string | undefined): string {
  if (from) {
    return from;
  }
  return '(unset)';
}

export function createMailTransport(logger: Logger): MailTransportResult {
  if (!isSmtpEnabled()) {
    logger.log({ event: 'mail.transport.disabled', reason: 'SMTP_ENABLED=false' });
    return { transport: null, sink: null, enabled: false };
  }

  const nodeEnv = process.env.NODE_ENV ?? 'development';

  if (nodeEnv === 'test') {
    return createTestTransport();
  }

  const host = process.env.SMTP_HOST ?? resolveDefaultHost(nodeEnv);
  const portRaw = process.env.SMTP_PORT ?? resolveDefaultPort(nodeEnv);
  const from = process.env.SMTP_FROM;

  assertProductionSmtpConfig(nodeEnv, host, portRaw, from);

  const port = Number.parseInt(portRaw ?? DEFAULT_SMTP_PORT, 10);
  const auth = resolveSmtpAuth();

  const transport = nodemailer.createTransport({
    auth,
    host,
    port,
    secure: port === SMTP_SECURE_PORT,
  });

  logger.log(
    `Mail transport initialised: host=${host}, port=${port}, auth=${describeAuth(auth)}, from=${describeFrom(from)}`,
  );
  return { transport, sink: null, enabled: true };
}
