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
import { TopBar } from "@/components/top-bar";
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
        <div className="flex h-12 items-center gap-2.5 px-4">
          <span className="grid size-6 place-items-center bg-brand text-xs text-white">
            D
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-sm tracking-tight">Ditto</span>
            <span className="text-[11px] text-muted-foreground">Compliance</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2">
          <p className="px-2.5 pb-1.5 text-[11px] tracking-wider text-muted-foreground/70 uppercase">
            Workspace
          </p>
          <div className="space-y-0.5">
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
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-brand" : "text-muted-foreground",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border p-2">
          <Link
            href="/account"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 text-sm transition-colors",
              pathname.startsWith("/account")
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <span className="grid size-7 shrink-0 place-items-center border border-border bg-background text-xs">
              {user.email[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground">
              {user.email}
            </span>
          </Link>
          <div className="mt-1 flex items-center gap-1">
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
          <span className="grid size-5 place-items-center bg-brand text-xs text-white">
            D
          </span>
          <span className="text-sm tracking-tight">Ditto</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <TopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
