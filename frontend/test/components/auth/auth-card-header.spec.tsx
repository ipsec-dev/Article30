import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthCardHeader } from '@/components/auth/auth-card-header';
import { I18nProvider } from '@/i18n/context';

describe('<AuthCardHeader />', () => {
  it('renders the app title and translates the subtitle key', () => {
    render(
      <I18nProvider>
        <AuthCardHeader subtitleKey="auth.signin.subtitle" />
      </I18nProvider>,
    );
    expect(screen.getByText(/Article30/)).toBeInTheDocument();
  });

  it('falls back to the raw key when the translation is missing', () => {
    render(
      <I18nProvider>
        <AuthCardHeader subtitleKey="this.key.is.unlikely.to.exist" />
      </I18nProvider>,
    );
    expect(screen.getByText('this.key.is.unlikely.to.exist')).toBeInTheDocument();
  });
});
