export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-bg min-h-dvh flex items-center justify-center p-4"
    >
      {children}
    </div>
  );
}
