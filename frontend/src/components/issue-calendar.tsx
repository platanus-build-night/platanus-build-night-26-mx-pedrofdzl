"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Issue, IssueSeverity } from "@/lib/resources";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SEVERITY_RANK: Record<IssueSeverity, number> = { low: 0, medium: 1, high: 2 };

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Days are keyed on the date-only portion so a YYYY-MM-DD due_date matches regardless of timezone.
function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function IssueCalendar({
  issues,
  selectedDay,
  onSelectDay,
  compact = false,
}: {
  issues: Issue[];
  selectedDay?: string | null;
  onSelectDay?: (day: string | null) => void;
  compact?: boolean;
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const todayKey = ymd(today);

  const byDay = useMemo(() => {
    const map = new Map<string, Issue[]>();
    for (const issue of issues) {
      if (!issue.due_date) continue;
      const key = issue.due_date.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(issue);
      else map.set(key, [issue]);
    }
    return map;
  }, [issues]);

  const grid = useMemo(
    () => buildGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const shiftMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] font-medium tabular-nums">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Today
          </Button>
          <Button variant="tertiary" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <Button variant="tertiary" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-border/60">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-b border-r border-border/60 bg-muted/40 px-1.5 py-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {grid.map((date) => {
          const key = ymd(date);
          const inMonth = date.getMonth() === cursor.getMonth();
          const dayIssues = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = selectedDay === key;
          const isOverdue =
            key < todayKey && dayIssues.some((i) => i.status !== "closed");
          const topSeverity = dayIssues.reduce<IssueSeverity | null>(
            (acc, i) => (acc === null || SEVERITY_RANK[i.severity] > SEVERITY_RANK[acc] ? i.severity : acc),
            null,
          );
          const dotClass = isOverdue
            ? "bg-destructive text-destructive-foreground"
            : topSeverity === "high"
              ? "bg-destructive/15 text-destructive"
              : topSeverity === "medium"
                ? "bg-warning/15 text-warning"
                : "bg-accent text-muted-foreground";

          return (
            <button
              key={key}
              type="button"
              disabled={!onSelectDay}
              onClick={() => onSelectDay?.(isSelected ? null : key)}
              className={cn(
                "flex flex-col items-start gap-1 border-b border-r border-border/60 px-1.5 py-1 text-left transition-colors",
                compact ? "h-12" : "h-20",
                onSelectDay && "hover:bg-accent/40 cursor-pointer",
                !inMonth && "bg-muted/20 text-muted-foreground/50",
                isSelected && "bg-accent",
              )}
            >
              <span
                className={cn(
                  "text-[11.5px] tabular-nums",
                  isToday && "grid size-5 place-items-center rounded-full bg-brand text-white font-medium",
                )}
              >
                {date.getDate()}
              </span>
              {dayIssues.length > 0 ? (
                <span
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums",
                    dotClass,
                  )}
                >
                  {dayIssues.length} due
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
