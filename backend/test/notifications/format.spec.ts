import { describe, it, expect } from 'vitest';
import {
  formatDateLocale,
  formatDateTimeLocale,
  formatDsrType,
  formatSeverity,
  shortRef,
  buildFooterOrientation,
} from '../../src/modules/notifications/format';

describe('format helpers', () => {
  describe('formatDateLocale', () => {
    it('renders FR as DD/MM/YYYY', () => {
      // 2026-05-09 in Paris.
      const d = new Date('2026-05-09T10:00:00+02:00');
      expect(formatDateLocale(d, 'fr')).toBe('09/05/2026');
    });

    it('renders EN as YYYY-MM-DD', () => {
      const d = new Date('2026-05-09T10:00:00+02:00');
      expect(formatDateLocale(d, 'en')).toBe('2026-05-09');
    });
  });

  describe('formatDateTimeLocale', () => {
    it('renders FR with Paris timezone label', () => {
      const d = new Date('2026-05-04T17:30:00+02:00');
      expect(formatDateTimeLocale(d, 'fr')).toBe('04/05/2026 17:30 (heure de Paris)');
    });

    it('renders EN with Paris timezone label', () => {
      const d = new Date('2026-05-04T17:30:00+02:00');
      // EN uses 'DD MMM YYYY' so May = May.
      expect(formatDateTimeLocale(d, 'en')).toBe('04 May 2026 17:30 (Paris time)');
    });

    it('emits no commas regardless of ICU locale data', () => {
      const d = new Date('2026-05-04T17:30:00+02:00');
      expect(formatDateTimeLocale(d, 'fr')).not.toContain(',');
      expect(formatDateTimeLocale(d, 'en')).not.toContain(',');
    });
  });

  describe('formatDsrType', () => {
    it('FR labels every DsrType', () => {
      expect(formatDsrType('ACCESS', 'fr')).toBe("Demande d'accès (Art. 15 RGPD)");
      expect(formatDsrType('RECTIFICATION', 'fr')).toBe('Demande de rectification (Art. 16 RGPD)');
      expect(formatDsrType('ERASURE', 'fr')).toBe("Demande d'effacement (Art. 17 RGPD)");
      expect(formatDsrType('RESTRICTION', 'fr')).toBe('Demande de limitation (Art. 18 RGPD)');
      expect(formatDsrType('PORTABILITY', 'fr')).toBe('Demande de portabilité (Art. 20 RGPD)');
      expect(formatDsrType('OBJECTION', 'fr')).toBe('Opposition (Art. 21 RGPD)');
    });

    it('EN labels every DsrType', () => {
      expect(formatDsrType('ACCESS', 'en')).toBe('Access request (Art. 15 GDPR)');
      expect(formatDsrType('OBJECTION', 'en')).toBe('Objection (Art. 21 GDPR)');
    });
  });

  describe('formatSeverity', () => {
    it('FR labels every Severity', () => {
      expect(formatSeverity('LOW', 'fr')).toBe('Faible');
      expect(formatSeverity('MEDIUM', 'fr')).toBe('Moyenne');
      expect(formatSeverity('HIGH', 'fr')).toBe('Élevée');
      expect(formatSeverity('CRITICAL', 'fr')).toBe('Critique');
    });

    it('EN labels every Severity', () => {
      expect(formatSeverity('LOW', 'en')).toBe('Low');
      expect(formatSeverity('CRITICAL', 'en')).toBe('Critical');
    });
  });

  describe('shortRef', () => {
    it('takes the first 8 hex chars and prefixes the kind tag', () => {
      expect(shortRef('DSR', '47f8e352-5ad4-43b0-84d5-2b3e10718055')).toBe('DSR-47f8e352');
      expect(shortRef('VIO', 'bc91a9e8-a8c4-4fb1-9e0c-003a99a90000')).toBe('VIO-bc91a9e8');
    });
  });

  describe('buildFooterOrientation', () => {
    it('FR DPO line', () => {
      expect(buildFooterOrientation('dpo', 'Acme Demo', 'fr')).toBe(
        'Vous recevez cet e-mail en tant que DPO de Acme Demo.',
      );
    });

    it('FR assignee line', () => {
      expect(buildFooterOrientation('assignee', 'Acme Demo', 'fr')).toBe(
        'Vous recevez cet e-mail car cet élément vous est assigné.',
      );
    });

    it('EN DPO line', () => {
      expect(buildFooterOrientation('dpo', 'Acme Demo', 'en')).toBe(
        'You are receiving this email as the DPO of Acme Demo.',
      );
    });

    it('EN assignee line', () => {
      expect(buildFooterOrientation('assignee', 'Acme Demo', 'en')).toBe(
        'You are receiving this email because this item is assigned to you.',
      );
    });

    it('falls back to generic DPO line when orgCompanyName is empty (FR)', () => {
      expect(buildFooterOrientation('dpo', '', 'fr')).toBe(
        'Vous recevez cet e-mail en tant que DPO.',
      );
    });

    it('falls back to generic DPO line when orgCompanyName is empty (EN)', () => {
      expect(buildFooterOrientation('dpo', '', 'en')).toBe(
        'You are receiving this email as the DPO.',
      );
    });
  });
});
