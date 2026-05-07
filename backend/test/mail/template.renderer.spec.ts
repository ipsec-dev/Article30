import { describe, it, expect } from 'vitest';
import { loadTemplate, renderTemplate } from '../../src/modules/mail/template.renderer';

describe('template.renderer', () => {
  describe('loadTemplate', () => {
    it('splits subject from body on first blank line', () => {
      const result = loadTemplate('password-reset', 'en');
      expect(result.subject).toBe('Reset your Article30 password');
      expect(result.body).toContain('Hello,');
      expect(result.body.startsWith('\n')).toBe(false);
    });

    it('loads the French variant', () => {
      const result = loadTemplate('password-reset', 'fr');
      expect(result.subject).toBe('Réinitialisation de votre mot de passe Article30');
    });

    it('loads the password-changed variant', () => {
      const result = loadTemplate('password-changed', 'en');
      expect(result.subject).toBe('Your Article30 password was changed');
    });

    it('throws for an unknown template id', () => {
      expect(() => loadTemplate('nope' as 'password-reset', 'en')).toThrow();
    });

    it('throws for an unknown locale', () => {
      expect(() => loadTemplate('password-reset', 'de' as 'en')).toThrow();
    });
  });

  describe('renderTemplate', () => {
    it('interpolates {{var}} placeholders', () => {
      const result = renderTemplate(
        { subject: 'Hello {{name}}', body: 'Link: {{url}}' },
        { name: 'Alice', url: 'https://example.com' },
      );
      expect(result.subject).toBe('Hello Alice');
      expect(result.body).toBe('Link: https://example.com');
    });

    it('replaces repeated placeholders', () => {
      const result = renderTemplate({ subject: 's', body: '{{x}} and {{x}}' }, { x: 'y' });
      expect(result.body).toBe('y and y');
    });

    it('leaves unknown placeholders untouched', () => {
      const result = renderTemplate({ subject: 's', body: 'Hi {{missing}}' }, { other: 'value' });
      expect(result.body).toBe('Hi {{missing}}');
    });
  });
});
