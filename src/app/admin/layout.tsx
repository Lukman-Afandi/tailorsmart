import Link from "next/link";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/admin/tenants" className="text-sm font-semibold tracking-tight">
            TailorFlow <span className="text-zinc-400">Platform</span>
          </Link>
          <nav className="flex gap-4 text-xs text-zinc-400">
            <Link className="hover:text-white" href="/admin/login">
              Login
            </Link>
            <Link className="hover:text-white" href="/admin/tenants">
              Tenant
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl p-4 md:p-6">{children}</div>
    </div>
  );
}
