import Link from "next/link";

export const instant = false; // auth-gated: never prerender
import { redirect } from "next/navigation";
import { isAuthenticated, isUsingDevPassword } from "@/lib/auth";
import LogoutButton from "@/components/admin/LogoutButton";

// Guarded admin shell: every page under (panel) requires the session
// cookie. Unauthenticated visitors are redirected to /admin/login.
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const devPassword = isUsingDevPassword();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
        <Link href="/admin" className="text-lg font-black text-white">
          Watch<span className="text-red-500">Drama</span>{" "}
          <span className="text-sm font-bold text-zinc-400">Admin</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/admin" className="rounded-md bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
            Dashboard
          </Link>
          <Link href="/admin/titles" className="rounded-md bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
            Titles
          </Link>
          <Link href="/admin/titles/new" className="rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-500">
            + New title
          </Link>
          <Link href="/" className="rounded-md px-3 py-1.5 text-zinc-300 hover:text-white">
            View site ↗
          </Link>
        </nav>
        <span className="ml-auto">
          <LogoutButton />
        </span>
      </div>

      {devPassword && (
        <div className="mb-5 rounded-lg bg-amber-400/10 px-4 py-3 text-sm text-amber-300 ring-1 ring-amber-400/30">
          ⚠ <strong>Development password in use.</strong> ADMIN_PASSWORD is not
          set, so the admin password is <code className="font-bold">admin123</code>.
          Set a real password in <code>.env.local</code> before deploying this site.
        </div>
      )}

      {children}
    </div>
  );
}
