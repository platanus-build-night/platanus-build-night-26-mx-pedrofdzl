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
    <section className={cn("border border-border bg-card", className)}>
      <header className="flex h-10 items-center justify-between border-b border-border px-3">
        <h2 className="text-sm font-medium tracking-tight">{title}</h2>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
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
    <div className="border border-border bg-card p-3">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className={cn("mt-1.5 text-2xl leading-none font-semibold tracking-tight", toneClass)}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
