import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  secondary: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 active:bg-stone-100",
  soft: "bg-brand-100 text-brand-800 hover:bg-brand-200",
  ghost: "text-stone-700 hover:bg-stone-100",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  "danger-soft": "bg-rose-50 text-rose-700 hover:bg-rose-100",
  success: "bg-teal-700 text-white shadow-sm hover:bg-teal-800",
} as const;

const SIZES = {
  sm: "h-9 gap-1.5 rounded-xl px-3 text-sm",
  md: "h-11 gap-2 rounded-xl px-5 text-sm",
  lg: "h-12 gap-2 rounded-2xl px-6 text-base",
  icon: "h-10 w-10 rounded-xl",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-bold whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
