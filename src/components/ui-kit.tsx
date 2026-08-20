import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

import { toFa } from "@/lib/format";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const toneClass: Record<Tone, string> = {
  success: "bg-primary-soft text-primary",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-accent text-accent-foreground",
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
};

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="app-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        {icon}
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="app-card space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="app-card flex flex-col items-center gap-3 border-destructive/30 px-6 py-10 text-center"
    >
      <h3 className="text-base font-bold text-destructive">خطا در دریافت اطلاعات</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          تلاش دوباره
        </button>
      ) : null}
    </div>
  );
}

export function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="scroll-x -mx-4 flex gap-2 px-4 pb-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground hover:bg-accent/70",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  tone = "info",
  to,
  search,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: Tone;
  /** When set the whole card becomes a link into the matching section. */
  to?: string;
  search?: Record<string, string>;
  hint?: string;
}) {
  const body = (
    <>
      <div className={cn("grid size-11 place-items-center rounded-2xl", toneClass[tone])}>
        {icon}
      </div>
      <p className="mt-3 text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="num mt-1 text-xl font-extrabold break-words sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs font-bold text-primary">{hint}</p> : null}
    </>
  );
  if (to)
    return (
      <Link
        to={to}
        {...(search ? { search } : {})}
        className="app-card block min-w-0 p-4 transition-transform hover:border-primary/40 active:scale-[0.98]"
      >
        {body}
      </Link>
    );

  return <div className="app-card min-w-0 p-4">{body}</div>;
}


export function Fa({ children }: { children: string | number }) {
  return <span className="num">{toFa(children)}</span>;
}
