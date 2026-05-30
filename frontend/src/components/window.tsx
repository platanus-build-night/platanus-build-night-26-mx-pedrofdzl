import { cn } from "@/lib/utils";

export function Window({
  title,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("bevel bg-card", className)}>
      <header className="titlebar flex h-7 items-center justify-between px-2 select-none">
        <span className="font-mono text-xs font-semibold tracking-wider uppercase">
          {title}
        </span>
        <div className="flex items-center gap-1">
          {actions}
          <span className="ml-1 flex gap-1" aria-hidden>
            <i className="bevel block size-3 bg-secondary" />
            <i className="bevel block size-3 bg-secondary" />
            <i className="bevel block size-3 bg-secondary" />
          </span>
        </div>
      </header>
      <div className={cn("p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "success" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    danger: "text-destructive",
    success: "text-success",
    warning: "text-warning",
  }[tone];
  return (
    <div className="bevel-inset bg-input px-3 py-2">
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <div className={cn("font-mono text-2xl leading-tight font-semibold", toneClass)}>
        {value}
      </div>
      {hint ? (
        <div className="font-mono text-[10px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
