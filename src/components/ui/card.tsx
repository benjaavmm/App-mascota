import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-stone-200 bg-white shadow-xs", className)} {...props} />
  );
}

export function CardSection({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)} id={id}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-extrabold text-stone-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-bold text-brand-700">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-stone-600">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border-2 border-dashed border-stone-200 bg-white/60 px-6 py-14 text-center">
      {icon && <div className="mb-4 text-brand-500">{icon}</div>}
      <p className="text-lg font-extrabold text-stone-800">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
