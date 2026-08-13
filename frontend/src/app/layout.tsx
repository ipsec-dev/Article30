import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import { I18nProvider } from '@/i18n/context';
import { ConfigProvider } from '@/lib/config/context';
import './globals.css';

// Self-hosted instead of `next/font/google`: that loader downloads the woff2
// from fonts.gstatic.com during `next build`, and when Google rotates the file
// hashes the CSS it just served can point at binaries that already 404 — which
// fails the Turbopack build outright (CI run 31636195759).
// ponytail: latin subset only (variable weight axis); add the latin-ext file if
// UI copy ever needs glyphs outside U+0000-00FF.
const inter = localFont({
  src: './fonts/inter-latin-var.woff2',
  weight: '100 900',
  variable: '--font-sans',
  display: 'optional',
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin-var.woff2',
  weight: '100 800',
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
