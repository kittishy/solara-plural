import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunito.variable} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  function h2r(h) { var n=parseInt(h.replace('#',''),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
                  function mix(h1,h2,t) {
                    var a=h2r(h1),b=h2r(h2);
                    return '#'+[0,1,2].map(function(i){return Math.max(0,Math.min(255,Math.round(a[i]+(b[i]-a[i])*t))).toString(16).padStart(2,'0');}).join('');
                  }
                  function rgb(h) { var c=h2r(h); return c[0]+' '+c[1]+' '+c[2]; }
                  function sv(n,h) { var r=document.documentElement.style; r.setProperty(n,h); r.setProperty(n+'-rgb',rgb(h)); }
                  var raw = localStorage.getItem('solara.customTheme');
                  if (raw) {
                    var c = JSON.parse(raw);
                    var W='#ffffff', B='#000000';
                    if (c.bg && c.surface && c.primary && c.front && c.text && c.border) {
                      sv('--theme-bg',c.bg);
                      sv('--theme-surface',c.surface);
                      sv('--theme-surface-alt',mix(c.surface,W,0.10));
                      sv('--theme-surface-raised',mix(c.surface,W,0.20));
                      sv('--theme-border',c.border);
                      sv('--theme-border-soft',mix(c.border,c.bg,0.42));
                      sv('--theme-border-strong',mix(c.border,W,0.20));
                      sv('--theme-text',c.text);
                      sv('--theme-muted',mix(c.text,c.bg,0.38));
                      sv('--theme-subtle',mix(c.text,c.bg,0.60));
                      sv('--theme-primary',c.primary);
                      sv('--theme-primary-soft',mix(c.primary,B,0.28));
                      sv('--theme-primary-glow',mix(c.primary,W,0.18));
                      sv('--theme-front',c.front);
                      sv('--theme-front-soft',mix(c.front,B,0.52));
                    }
                  }
                  var language = localStorage.getItem('solara.language');
                  var pathname = window.location.pathname;
                  var parts = pathname.split('/').filter(Boolean);
                  var localeFromPath = parts[0];
                  if (language === 'pt-BR' || language === 'es' || language === 'en') {
                    var finalLanguage = (localeFromPath === 'pt-BR' || localeFromPath === 'es' || localeFromPath === 'en')
                      ? localeFromPath
                      : language;
                    document.documentElement.lang = finalLanguage;
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
