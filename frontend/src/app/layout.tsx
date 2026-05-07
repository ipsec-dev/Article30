import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { I18nProvider } from '@/i18n/context';
import { ConfigProvider } from '@/lib/config/context';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'optional',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'optional',
});

export const metadata: Metadata = {
  title: 'Article30',
  description: 'GDPR Article 30 processing register',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      data-theme="ink"
      data-density="comfortable"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Synchronously applies user tweak prefs (theme/density/dark) from
            localStorage to <html> before first paint. Eliminates FOUC.
            Source: /public/init-tweaks.js. */}
        <Script src="/init-tweaks.js" strategy="beforeInteractive" />
      </head>
      <body
        className="font-sans antialiased"
        style={{ background: 'var(--bg)', color: 'var(--ink)' }}
      >
        <ConfigProvider>
          <I18nProvider>{children}</I18nProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
