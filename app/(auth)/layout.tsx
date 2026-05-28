export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--ios-bg)] px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
