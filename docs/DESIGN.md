# DESIGN.md — Solara Plural

> **[AGENT INSTRUCTION — READ FIRST]**
> This file IS the design system for Solara Plural. It follows the `design-md` skill format.
> - DO NOT create, overwrite, or replace this file. It already exists and is the source of truth.
> - DO NOT generate a new DESIGN.md. If you are about to create one, STOP — read this one instead.
> - Before any UI work, load the `design-md` skill AND read this file in full.
> - All UI decisions MUST align with the tokens, patterns, and emotional principles defined here.
> - If you need to add something to the design system, EDIT this file — never replace it.

> The visual and emotional design system for Solara Plural.
> ALWAYS consult this file before making any UI decision.
> This is a warm, human, safe space — not a corporate app.

---

## Core Emotional Principles

Solara Plural must feel like:
- A **cozy room** that belongs to you
- **Safe and private** — not exposed or clinical
- **Warm** but not infantilizing
- **Gentle** in its use of color and space
- **Human** — imperfect, personal, alive
- **Accessible** to all members, including those who are sensitive to harsh visuals

Never feel like: a dashboard, a productivity tool, a medical record, a form.

---

## Color Palette

### Base Tokens

```css
/* Warm neutrals — the foundation */
--color-bg:           #1a1625;   /* Deep warm purple-black (dark mode base) */
--color-surface:      #231d33;   /* Card/panel surface */
--color-surface-alt:  #2d2640;   /* Slightly lifted surface */
--color-border:       #3d3454;   /* Subtle border */
--color-border-soft:  #2d2640;   /* Even softer border */

/* Text */
--color-text:         #e8e0f0;   /* Primary text — soft lavender-white */
--color-text-muted:   #9d91b5;   /* Secondary text */
--color-text-subtle:  #6b5f85;   /* Hints, placeholders */

/* Primary accent — warm lavender/violet */
--color-primary:      #a78bfa;   /* violet-400 */
--color-primary-soft: #7c3aed;   /* violet-600 (buttons) */
--color-primary-glow: #c4b5fd;   /* violet-300 (highlights) */

/* Secondary — warm rose/pink for front indicator */
--color-front:        #f9a8d4;   /* pink-300 — "in front" glow */
--color-front-soft:   #831843;   /* pink-900 (front badge bg) */

/* Success, Warning, Error */
--color-success:      #86efac;   /* green-300 */
--color-warning:      #fcd34d;   /* amber-300 */
--color-error:        #fca5a5;   /* red-300 */

/* Member color swatches (user-assignable) */
--color-member-1:     #a78bfa;   /* violet */
--color-member-2:     #f9a8d4;   /* pink */
--color-member-3:     #93c5fd;   /* blue */
--color-member-4:     #86efac;   /* green */
--color-member-5:     #fcd34d;   /* amber */
--color-member-6:     #fb923c;   /* orange */
--color-member-7:     #f87171;   /* red */
--color-member-8:     #67e8f9;   /* cyan */
--color-member-9:     #d8b4fe;   /* purple */
--color-member-10:    #a5b4fc;   /* indigo */
--color-member-11:    #fdba74;   /* amber-warm */
--color-member-12:    #6ee7b7;   /* emerald */
```

### Light Mode Support (future)
Light mode will use warm ivory backgrounds with deep plum text. Not prioritized for MVP.

---

## Typography

### Font Stack
```css
/* Primary: Warm, readable, modern humanist */
font-family: 'Inter', 'Nunito', system-ui, sans-serif;

/* Display/headings: Slightly softer, more personal */
font-family: 'Nunito', 'Inter', sans-serif;

/* Monospace (import/export, code) */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Scale
```
text-xs:   0.75rem / 12px  — captions, timestamps, subtle info
text-sm:   0.875rem / 14px — secondary text, labels, tags
text-base: 1rem / 16px     — body text (default)
text-lg:   1.125rem / 18px — card titles, member names
text-xl:   1.25rem / 20px  — section headers
text-2xl:  1.5rem / 24px   — page titles
text-3xl:  1.875rem / 30px — dashboard greeting
```

### Weight Usage
- `font-normal` (400) — body text, descriptions
- `font-medium` (500) — labels, nav items
- `font-semibold` (600) — member names, section titles
- `font-bold` (700) — primary headings, front indicator

---

## Spacing & Layout

```
Sidebar width:        240px (desktop), full-screen (mobile)
Content max-width:    1024px (centered)
Card padding:         p-4 (16px) or p-6 (24px)
Section gap:          gap-4 or gap-6
Border radius:        rounded-xl (cards), rounded-full (avatars, chips)
```

---

## Component Design Patterns

### Member Card
```
┌─────────────────────────────┐
│  [Avatar]  Name             │
│            Pronouns         │
│            [Tag] [Tag]      │
│            ● IN FRONT       │
└─────────────────────────────┘
```
- Avatar: 48px circle with member color border
- Name: text-lg font-semibold text-text
- Pronouns: text-sm text-muted
- Tags: small rounded badges
- Front indicator: pulsing pink dot + "IN FRONT" text

### Member Chip (compact)
```
[●] Name
```
- Small colored dot + name
- Used in front tracker, history entries

### Front Indicator (Dashboard)
```
╔══════════════════════════════╗
║  Currently fronting:         ║
║  [Avatar] Name  [Avatar] Name║
║  Since 2h ago                ║
╚══════════════════════════════╝
```
- Prominent card, soft glow border in pink
- Pulsing indicator
- "Start" / "End front" buttons

### Note Card
```
┌─────────────────────────────┐
│  📝 Title                   │
│  Content preview...         │
│  2 days ago · @MemberName  │
└─────────────────────────────┘
```

### Avatar Component
- Circle, 32px (chip) / 48px (card) / 96px (profile)
- Background: member color (solid or gradient)
- Initials fallback if no image
- Soft shadow, not harsh

### Navigation Sidebar
```
╔══════════════╗
║  ☀ Solara   ║
║  SystemName  ║
╠══════════════╣
║  🏠 Home    ║
║  👥 Members ║
║  ✨ Front   ║
║  📝 Notes   ║
║  ⚙ Settings ║
╚══════════════╝
```
- Minimal icons + labels
- Active state: soft violet highlight, not harsh
- No border-right separator — use bg contrast

---

## Animation & Motion

```
Transitions:    150ms ease (hover states)
Page change:    200ms fade (via Next.js layout)
Pulsing front:  2s ease-in-out infinite (front indicator dot)
Card hover:     translate-y-[-2px] shadow-lg (subtle lift)
Modal open:     scale from 95% opacity 0 → 100% opacity 1, 200ms
```

---

## Tailwind Config Tokens

```ts
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: '#1a1625',
        surface: '#231d33',
        'surface-alt': '#2d2640',
        border: '#3d3454',
        text: '#e8e0f0',
        muted: '#9d91b5',
        subtle: '#6b5f85',
        primary: '#a78bfa',
        'primary-soft': '#7c3aed',
        'primary-glow': '#c4b5fd',
        front: '#f9a8d4',
        'front-soft': '#831843',
        success: '#86efac',
        warning: '#fcd34d',
        error: '#fca5a5',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.3)',
        glow: '0 0 20px rgba(167,139,250,0.2)',
        'front-glow': '0 0 24px rgba(249,168,212,0.25)',
      },
    },
  },
}
```

---

## Accessibility Principles

- Minimum contrast ratio 4.5:1 for all body text
- Focus rings: visible, violet-colored (`ring-primary/60`)
- No information conveyed by color alone — always pair with text/icon
- Font sizes minimum 14px for secondary content
- Touch targets minimum 44x44px on mobile
- Screen reader labels on all icon buttons
- Reduced motion respects `prefers-reduced-motion`

---

## Emotional Design Notes

- Use the system's name in greetings ("Good morning, [System Name]")
- Show care in empty states — not "No data" but "No members yet — add your first one 💜"
- Confirmation dialogs must be gentle, not alarming
- Destructive actions (delete) must be clearly labeled but not aggressive
- Loading states should feel calm, not anxious (gentle spinner, not aggressive animation)
- Error messages should be human and kind ("Something went wrong — try again?")

---
