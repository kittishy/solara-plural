// Pass-through template.
//
// Earlier this wrapped {children} in a `.page-enter` div that played a
// snapIn animation. That wrapper, even after the animation finished with
// `transform: none`, intermittently re-created a containing block for
// descendant `position: fixed` elements (e.g. the members BottomSheet),
// causing it to render in-flow and trigger an auto-scroll on open.
//
// Per-page entrance animations now live on the inner content components
// (e.g. `animate-fade-in` on the MembersClient root div), which are
// SIBLINGS of any fixed-position UI, not ancestors.

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
