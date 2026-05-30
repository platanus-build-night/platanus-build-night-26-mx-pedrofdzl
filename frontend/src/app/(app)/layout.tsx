"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/requirements", label: "Requirements" },
  { href: "/issues", label: "Issues" },
  { href: "/facts", label: "Fact Base" },
];

const MENUS = ["File", "Edit", "Audit", "View", "Help"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center font-mono text-sm text-muted-foreground">
        Authenticating...
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="titlebar flex h-7 items-center justify-between px-2 text-xs">
        <span className="font-mono font-semibold tracking-widest uppercase">
          Ditto // Compliance Workstation
        </span>
        <Link href="/account" className="font-mono hover:underline">
          {user.email}
        </Link>
      </div>

      <div className="flex items-center gap-3 border-b border-border bg-secondary px-2 py-0.5 text-xs">
        {MENUS.map((m) => (
          <span
            key={m}
            className="cursor-default px-1 hover:bg-primary hover:text-primary-foreground"
          >
            <u>{m[0]}</u>
            {m.slice(1)}
          </span>
        ))}
        <button
          onClick={logout}
          className="ml-auto px-1 hover:bg-primary hover:text-primary-foreground"
        >
          Log&nbsp;Off
        </button>
      </div>

      <nav className="flex items-end gap-0.5 border-b-2 border-border bg-muted px-2 pt-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "bevel rounded-none px-3 py-1 font-mono text-xs",
                active
                  ? "relative top-px bg-card font-semibold text-primary"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 overflow-auto p-4">{children}</main>

      <footer className="bevel-inset flex items-center justify-between bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
        <span>READY</span>
        <span>v1.0.0 // {user.two_factor_enabled ? "2FA ON" : "2FA OFF"}</span>
      </footer>
    </div>
  );
}
