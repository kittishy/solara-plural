import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { ThemeRuntime } from "@/components/providers/ThemeRuntime";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { ServiceWorkerRuntime } from "@/components/providers/ServiceWorkerRuntime";
import { cookies } from "next/headers";
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_COOKIE_KEY, isLanguage } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Solara",
  description: "App para sistemas plurais",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Solara",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

function getHtmlLang() {
  const cookieLanguage = cookies().get(LANGUAGE_COOKIE_KEY)?.value;
  const language = isLanguage(cookieLanguage) ? cookieLanguage : DEFAULT_LANGUAGE;
  return LANGUAGES.find((entry) => entry.code === language)?.htmlLang ?? "en";
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={getHtmlLang()} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <SWRProvider>
              <LanguageProvider>{children}</LanguageProvider>
            </SWRProvider>
            <ThemeRuntime />
            <ServiceWorkerRuntime />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
