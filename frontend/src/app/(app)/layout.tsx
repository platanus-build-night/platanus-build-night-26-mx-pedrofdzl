"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Database,
  LayoutDashboard,
  LogOut,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/requirements", label: "Requirements", icon: ClipboardList },
  { href: "/issues", label: "Issues", icon: TriangleAlert },
  { href: "/facts", label: "Fact Base", icon: Database },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Authenticating...
      </div>
    );
  }

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-12 items-center gap-2 border-b border-border px-3">
          <span className="grid size-5 place-items-center bg-brand text-xs font-bold text-white">
            D
          </span>
          <span className="text-sm font-semibold tracking-tight">Ditto</span>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          <Link
            href="/account"
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 text-sm transition-colors",
              pathname.startsWith("/account")
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="grid size-6 shrink-0 place-items-center border border-border bg-secondary text-xs font-medium">
              {user.email[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 truncate">{user.email}</span>
          </Link>
          <div className="mt-0.5 flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 text-muted-foreground"
              onClick={logout}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b border-border px-4 md:hidden">
          <span className="grid size-5 place-items-center bg-brand text-xs font-bold text-white">
            D
          </span>
          <span className="text-sm font-semibold tracking-tight">Ditto</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
