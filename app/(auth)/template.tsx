// Pass-through template. Auth pages already animate their own content
// (e.g. `animate-fade-in` + `animate-slide-up` on the form cards), so the
// outer snap-in wrapper here added no real value and risked the same
// containing-block bug we hit on the dashboard side.

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
