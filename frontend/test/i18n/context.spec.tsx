import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n } from '@/i18n/context';

function Probe() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="missing-key">{t('no.such.translation.key.exists')}</span>
      <button onClick={() => setLocale('en')}>to-en</button>
    </div>
  );
}

describe('I18nProvider / useI18n', () => {
  it('defaults to locale=fr', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
  });

  it('returns the key back when the translation is missing (passthrough)', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('missing-key')).toHaveTextContent('no.such.translation.key.exists');
  });

  it('switches locale when setLocale is invoked', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'to-en' }));
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
  });

  it('throws when useI18n is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useI18n must be used within I18nProvider/);
    spy.mockRestore();
  });
});
