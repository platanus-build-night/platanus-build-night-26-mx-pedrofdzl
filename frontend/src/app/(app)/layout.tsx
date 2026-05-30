"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronsUpDown,
  ClipboardList,
  Database,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  TriangleAlert,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AnalysisProvider } from "@/lib/analysis-ui";
import { CopilotProvider } from "@/lib/copilot-ui";
import { cn } from "@/lib/utils";
import { CopilotCanvas } from "@/components/copilot-canvas";
import { SidebarJobs } from "@/components/sidebar-jobs";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopBar } from "@/components/top-bar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/questionnaires", label: "Questionnaires", icon: ClipboardList },
  { href: "/documents", label: "Documents", icon: FolderTree },
  { href: "/facts", label: "Fact Base", icon: Database },
  { href: "/issues", label: "Issues", icon: TriangleAlert },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
    <AnalysisProvider>
      <CopilotProvider>
        <CopilotCanvas>
          <div className="flex h-full bg-background">
            <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
              <div className="flex h-12 items-center gap-2.5 border-b border-border px-4">
                <Image src="/ditto.png" alt="Ditto" width={24} height={24} className="size-6 rounded-md" />
                <span className="text-sm tracking-tight">Ditto</span>
              </div>

              <nav className="flex-1 px-2 py-2">
                <div className="space-y-0.5">
                  {NAV.map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
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

              <SidebarJobs />

              <div className="p-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-background text-xs font-medium text-foreground">
                      {user.email[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-foreground leading-none">
                        {user.email.split("@")[0]}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="min-w-52">
                    <div className="flex items-center gap-2.5 px-1.5 py-1.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-xs font-medium text-foreground">
                        {user.email[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground leading-none">
                          {user.email.split("@")[0]}
                        </p>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/account")}>
                      <UserCog className="size-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
                      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                      Appearance
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="size-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <header className="flex h-12 items-center gap-2 border-b border-border px-4 md:hidden">
                <Image src="/ditto.png" alt="Ditto" width={20} height={20} className="size-5 rounded-md" />
                <span className="text-sm tracking-tight">Ditto</span>
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </header>
              <TopBar />
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</div>
              </main>
            </div>
          </div>
        </CopilotCanvas>
      </CopilotProvider>
    </AnalysisProvider>
  );
}
