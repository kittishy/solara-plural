import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { ThemeRuntime } from "@/components/providers/ThemeRuntime";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { ServiceWorkerRuntime } from "@/components/providers/ServiceWorkerRuntime";
import { KeyboardProvider } from "@/components/providers/KeyboardProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { cookies } from "next/headers";
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_COOKIE_KEY, isLanguage } from "@/lib/i18n";
import { getCachedSession } from "@/lib/auth/session";

// Brand font (see docs/PROJECT_STYLE_GUIDE.md) — warm, rounded, humanist.
// Falls back to the system stack while loading (display: swap).
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

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
    { media: "(prefers-color-scheme: light)", color: "#f5f2ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0b16" },
  ],
};

function getHtmlLang() {
  const cookieLanguage = cookies().get(LANGUAGE_COOKIE_KEY)?.value;
  const language = isLanguage(cookieLanguage) ? cookieLanguage : DEFAULT_LANGUAGE;
  return LANGUAGES.find((entry) => entry.code === language)?.htmlLang ?? "en";
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // JWT session (no DB hit) — seeds the client SessionProvider so useSession()
  // and the persistent SWR cache have the user id from the first render.
  const session = await getCachedSession();

  return (
    <html lang={getHtmlLang()} suppressHydrationWarning className={nunito.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider session={session}>
            <SWRProvider>
              <LanguageProvider>
                <ToastProvider>{children}</ToastProvider>
              </LanguageProvider>
            </SWRProvider>
            <ThemeRuntime />
            <ServiceWorkerRuntime />
            <KeyboardProvider />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
