import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Solara Plural',
  description: 'A warm space for plural systems to organize and thrive',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var key = 'solara.theme';
                  var theme = localStorage.getItem(key);
                  if (theme) document.documentElement.setAttribute('data-solara-theme', theme);
                  var language = localStorage.getItem('solara.language');
                  if (language === 'pt-BR' || language === 'es' || language === 'en') {
                    document.documentElement.lang = language;
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
