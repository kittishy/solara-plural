// Next 14 templates re-mount on every route change inside the segment,
// which gives us a free hook to play a brief entrance animation per page.
// Pure CSS — no JS, GPU-friendly transform/opacity only.
//
// `.page-enter` plays a snap-in + a thin scanline sweep across the top edge.
// Respects prefers-reduced-motion via the global CSS rule.

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
