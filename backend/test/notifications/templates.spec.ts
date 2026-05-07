import { describe, it, expect } from 'vitest';
import { loadTemplate } from '../../src/modules/mail/template.renderer';
import {
  KIND_TO_TEMPLATE,
  NOTIFICATION_KINDS,
} from '../../src/modules/notifications/notification-kinds';
import type { TemplateId } from '../../src/modules/mail/mail.service';

describe('notification templates', () => {
  for (const kind of NOTIFICATION_KINDS) {
    const id = KIND_TO_TEMPLATE[kind];
    for (const locale of ['fr', 'en'] as const) {
      it(`loads ${id}.${locale}`, () => {
        const tpl = loadTemplate(id as TemplateId, locale);
        expect(tpl.subject.length).toBeGreaterThan(0);
        expect(tpl.body.length).toBeGreaterThan(0);
        // Every template must reference the recipient + record url so
        // alerts are useful.
        expect(tpl.body).toContain('{{recipientFirstName}}');
        expect(tpl.body).toContain('{{recordUrl}}');
      });
    }
  }
});
