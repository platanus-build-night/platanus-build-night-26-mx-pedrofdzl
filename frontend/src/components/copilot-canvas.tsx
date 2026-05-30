"use client";

import { useCopilot } from "@/lib/copilot-ui";
import { cn } from "@/lib/utils";
import { CopilotPanel } from "./copilot-panel";

export function CopilotCanvas({ children }: { children: React.ReactNode }) {
  const { open } = useCopilot();

  return (
    <div
      className={cn(
        "flex h-svh w-full transition-[padding,background-color,gap] duration-200 ease-out",
        open ? "bg-muted gap-5 p-5" : "bg-transparent gap-0 p-0",
      )}
    >
      <div
        className={cn(
          "relative min-w-0 flex-1 overflow-hidden transition-[border-radius,box-shadow] duration-200 ease-out",
          open
            ? "rounded-xl shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_0_14px_0_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.12)]"
            : "rounded-none shadow-none",
        )}
      >
        {children}
      </div>
      <CopilotPanel />
    </div>
  );
}
