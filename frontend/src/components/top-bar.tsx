"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  requirements: "Requirements",
  issues: "Issues",
  facts: "Fact Base",
  account: "Account",
};

const label = (seg: string) =>
  LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);

export function TopBar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/dashboard"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Ditto
        </Link>
        {segments.map((seg, i) => {
          const href = "/" + segments.slice(0, i + 1).join("/");
          const last = i === segments.length - 1;
          return (
            <span key={href} className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5 text-muted-foreground/40" />
              {last ? (
                <span className="text-foreground">{label(seg)}</span>
              ) : (
                <Link
                  href={href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label(seg)}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      <div
        id="topbar-actions"
        className="ml-auto flex items-center gap-2"
      />
    </div>
  );
}

export function TopBarActions({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  // Portal target lives in TopBar; resolve it after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setEl(document.getElementById("topbar-actions")), []);
  return el ? createPortal(children, el) : null;
}
