import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // iOS 26 system colors
        // `blue` is the app accent: it reads the runtime CSS variable so the
        // user's custom primary colour applies to every text-ios-blue /
        // bg-ios-blue usage (compiled hex would ignore personalization).
        ios: {
          blue: "rgb(var(--ios-blue-rgb, 0 122 255) / <alpha-value>)",
          indigo: "#5856D6",
          purple: "#AF52DE",
          pink: "#FF2D55",
          red: "#FF3B30",
          orange: "#FF9500",
          yellow: "#FFCC00",
          green: "#34C759",
          teal: "#5AC8FA",
          cyan: "#32ADE6",
          mint: "#00C7BE",
          gray: {
            1: "#8E8E93",
            2: "#AEAEB2",
            3: "#C7C7CC",
            4: "#D1D1D6",
            5: "#E5E5EA",
            6: "#F2F2F7",
          },
        },
        // Member accent colors
        "m-violet": "#8B5CF6",
        "m-pink": "#EC4899",
        "m-rose": "#F43F5E",
        "m-red": "#EF4444",
        "m-orange": "#F97316",
        "m-amber": "#F59E0B",
        "m-yellow": "#EAB308",
        "m-lime": "#84CC16",
        "m-green": "#22C55E",
        "m-emerald": "#10B981",
        "m-teal": "#14B8A6",
        "m-cyan": "#06B6D4",
        "m-sky": "#0EA5E9",
        "m-blue": "#3B82F6",
        "m-indigo": "#6366F1",
        "m-purple": "#A855F7",
        "m-fuchsia": "#D946EF",
        "m-slate": "#64748B",
        "m-gray": "#6B7280",
        "m-neutral": "#737373",
        "m-stone": "#78716C",
        // Semantic tokens
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        "ios-xs": "8px",
        "ios-sm": "10px",
        ios: "14px",
        "ios-md": "16px",
        "ios-lg": "20px",
        "ios-xl": "24px",
        "ios-2xl": "28px",
        "ios-3xl": "36px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "var(--font-nunito)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        "large-title": ["34px", { lineHeight: "41px", fontWeight: "800" }],
        "title-1": ["28px", { lineHeight: "34px", fontWeight: "800" }],
        "title-2": ["22px", { lineHeight: "28px", fontWeight: "700" }],
        "title-3": ["20px", { lineHeight: "25px", fontWeight: "700" }],
        headline: ["17px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["17px", { lineHeight: "22px", fontWeight: "400" }],
        callout: ["16px", { lineHeight: "21px", fontWeight: "400" }],
        subheadline: ["15px", { lineHeight: "20px", fontWeight: "400" }],
        footnote: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "caption-1": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "caption-2": ["11px", { lineHeight: "13px", fontWeight: "400" }],
      },
      backdropBlur: {
        ios: "40px",
        "ios-sm": "20px",
        "ios-lg": "60px",
      },
      boxShadow: {
        // Softer, more diffuse, faintly warm (brown-black) floats with a
        // hairline top highlight so cards read "lit from above" — premium glass
        // instead of the hard generic drop shadow.
        ios: "inset 0 1px 0 0 rgba(255, 255, 255, 0.6), 0 1px 2px rgba(28, 20, 12, 0.05), 0 8px 24px rgba(28, 20, 12, 0.07)",
        "ios-md":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.6), 0 2px 6px rgba(28, 20, 12, 0.06), 0 14px 36px rgba(28, 20, 12, 0.09)",
        "ios-lg":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.7), 0 4px 12px rgba(28, 20, 12, 0.07), 0 24px 56px rgba(28, 20, 12, 0.12)",
        "ios-dark":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.4), 0 14px 36px rgba(0, 0, 0, 0.32)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
