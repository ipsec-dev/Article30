export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'var(--bg)', color: 'var(--ink)' }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
