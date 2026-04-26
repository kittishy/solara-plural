# UX_NOTES.md — Solara Plural

> UX principles, patterns, and notes for Solara Plural.
> Read alongside PROJECT_STYLE_GUIDE.md before building any UI.

---

## Core UX Philosophy

This app serves plural systems — people with multiple headmates sharing one body.
The UX must honor:

1. **Plurality is not a problem to solve** — the app assists, not fixes
2. **Safety and privacy are paramount** — no accidental data exposure
3. **Different members may use the app** — UI should be accessible even to those unfamiliar with it
4. **Cognitive load awareness** — keep UI simple; avoid overwhelming layouts
5. **Emotional neutrality** — no language that pathologizes or infantilizes

---

## Navigation Principles

- Sidebar always visible on desktop
- Bottom navigation on mobile (accessible thumb zones)
- Current page clearly highlighted
- No more than 5 primary navigation items (Home, Members, Front, Notes, Settings)
- Breadcrumbs on deep pages (member profile, note edit)
- Back button always visible on mobile

---

## Forms and Input

- Labels above fields (not floating labels — clearer for all users)
- Placeholder text as examples, not as labels
- Validation: show errors inline, not in a toast
- Submit buttons: always clearly labeled ("Save member", not just "Save")
- Cancel is always available and safe
- Destructive actions (delete) require confirmation and are styled in error color
- Auto-save for notes where possible

---

## Empty States

Empty states must be warm and inviting:

| Screen | Empty State Message |
|--------|-------------------|
| Members list | "Your system members will appear here. Add your first one 💜" |
| Front tracker (no active front) | "No one is listed as fronting right now. Want to add someone?" |
| Front history | "Front history will appear here as you track." |
| Notes | "Notes you write will live here. Start writing something 📝" |
| Search results | "Nothing found — try a different name?" |

---

## Loading States

- Use skeleton screens (not spinners) for list pages
- Use inline spinner for form submissions
- Avoid layout shift during loading
- Loading should feel calm — no aggressive animation

---

## Error States

Error messages are human and kind:

| Error | Message |
|-------|---------|
| Network error | "Couldn't connect right now — check your connection and try again?" |
| Save failed | "Something went wrong saving that. Want to try again?" |
| Not found | "We couldn't find that page. You might want to go back home." |
| Auth error | "That email or password didn't match. Try again?" |
| Permission | "You don't have access to that." |

---

## Mobile UX

- Touch targets: minimum 44×44px
- Bottom nav (not sidebar) on mobile
- Keep bottom nav to the primary 3-5 destinations and avoid visual weight that competes with page content
- Let Home behave as a mobile navigation/action page when the app has multiple important destinations
- Prefer one primary task per mobile screen; move supporting details below or into a secondary section
- Use larger readable text on mobile instead of shrinking content to fit more at once
- Avoid double-nesting cards on mobile; use spacing, dividers, or plain sections when grouping is enough
- Swipe-to-go-back respected
- Modal sheets (bottom sheet) on mobile instead of centered modals
- Font size minimum 16px for inputs (prevents iOS zoom)
- No hover-only interactions — everything touchable

---

## Accessibility Checklist

- [ ] All images have alt text
- [ ] All icon buttons have aria-label
- [ ] Focus order is logical (top-to-bottom, left-to-right)
- [ ] Focus ring visible on all interactive elements
- [ ] Color is not the only indicator of state
- [ ] Screen reader tested with VoiceOver / NVDA
- [ ] Keyboard navigable (Tab, Enter, Escape)
- [ ] `prefers-reduced-motion` respected

---

## Sensitive UX Moments

These interactions deserve extra care:

### Deleting a member
- Two-step confirmation
- Warning: "This will permanently remove [Name] from your system records."
- Alternative offered: "Archive instead" (hides without deleting)

### Ending a front entry
- Single tap to end
- Shows duration: "You were fronting for 2h 15m"
- No guilt, no judgment

### Importing data
- Clear warning about what will be overwritten
- Backup download offered first
- Import is never destructive without explicit confirmation
- Import/export actions must show inline progress and inline results; no alert-only feedback
- Failed import/export actions must always return controls to an enabled state

### Writing notes
- Notes can be written during memory gaps, stress, or front switches; never silently lose text
- Note editors should keep a local draft when possible and warn before accidental page unload
- Save failures must reassure the user that their text is still present
- Use gentle prompts as optional support, not instructions or clinical framing

### Editing front history
- Must be possible after the fact because users may have memory gaps
- Allow start/end time edits without shame language
- Preserve notes and cofronting members when changing timestamps
- Warn clearly if a change overlaps another front entry

### Sharing with trusted people
- Future sharing must be opt-in, reversible, and scoped
- Do not expose current front by default
- Use role labels that are easy to understand: partner, trusted friend, friend
- Per-member and per-field visibility should exist before broad friend features

---

## Language Guidelines

- Use "member" not "alter" or "headmate" (let users use their own terms)
- Use "system" not "system name" — just "your system"
- Use "fronting" as default term, but future: allow customization
- Avoid clinical language ("disorder", "condition", "symptoms")
- Pronouns: always respect the member's pronouns in UI text
- Inclusive defaults: use "they/them" when member pronouns unknown

---

## Reference Research UX Signals

From Sheaf, PluralKit, PluralSpace, Plural Star, SElves, and imPlural research:

- Front tracking is not only "start/end"; users need retroactive edits, cofronting, and eventually front tiers.
- Import/export is an emotional safety feature because community tools can disappear.
- Dark mode, reduced motion, text size, contrast, and low sensory load belong in the product foundation.
- Friend sharing is important, but dangerous without privacy labels and clear trust boundaries.
- Avoid gatekeeping language. Some users use clinical terms; others do not. The UI should not force either.


