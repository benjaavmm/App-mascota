import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const STYLES = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: Info, iconClass: "text-sky-600" },
  success: { box: "border-teal-200 bg-teal-50 text-teal-900", icon: CheckCircle2, iconClass: "text-teal-600" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle, iconClass: "text-amber-600" },
  danger: { box: "border-rose-200 bg-rose-50 text-rose-900", icon: ShieldAlert, iconClass: "text-rose-600" },
} as const;

export function Alert({
  variant = "info",
  title,
  children,
  className,
  role,
}: {
  variant?: keyof typeof STYLES;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const style = STYLES[variant];
  const Icon = style.icon;
  return (
    <div
      role={role ?? (variant === "danger" ? "alert" : "status")}
      className={cn("flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed", style.box, className)}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}

// Muestra el resultado de una Server Action (error o mensaje de éxito).
export function FormMessage({ state }: { state?: { error?: string; message?: string } | null }) {
  if (!state) return null;
  if (state.error) return <Alert variant="danger">{state.error}</Alert>;
  if (state.message) return <Alert variant="success">{state.message}</Alert>;
  return null;
}
