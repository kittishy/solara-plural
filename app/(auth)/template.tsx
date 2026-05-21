// Light page transition for auth routes (login / register / forgot / reset).
// The auth pages are small forms; a snap-in is enough — no scanline sweep here.

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-snap-in">{children}</div>;
}
