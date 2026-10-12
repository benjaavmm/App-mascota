import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-xl border bg-white px-3.5 text-[15px] text-stone-900 shadow-xs transition-colors placeholder:text-stone-400 " +
  "focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500";

function controlClass(invalid?: boolean, className?: string) {
  return cn(controlBase, invalid ? "border-rose-400" : "border-stone-300", className);
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-bold text-stone-800", className)} {...props} />;
}

export function Hint({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-1.5 text-xs leading-relaxed text-stone-500", className)} {...props} />;
}

export function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-semibold text-rose-600" role="alert">
      {errors[0]}
    </p>
  );
}

type FieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  errors?: string[];
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, errors, required, className, children }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="text-rose-600" aria-hidden>
              {" "}
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {hint && !errors?.length && <Hint>{hint}</Hint>}
      <FieldError errors={errors} id={htmlFor ? `${htmlFor}-error` : undefined} />
    </div>
  );
}

type InvalidProp = { invalid?: boolean };

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & InvalidProp) {
  return <input aria-invalid={invalid || undefined} className={controlClass(invalid, cn("h-11", className))} {...props} />;
}

export function Textarea({ className, invalid, rows = 4, ...props }: ComponentProps<"textarea"> & InvalidProp) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("py-2.5 leading-relaxed", className))}
      {...props}
    />
  );
}

export function Select({ className, invalid, ...props }: ComponentProps<"select"> & InvalidProp) {
  return (
    <select aria-invalid={invalid || undefined} className={controlClass(invalid, cn("h-11 pr-8", className))} {...props} />
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode };

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-stone-300 accent-brand-600"
        {...props}
      />
      <span className="text-sm leading-snug">
        <span className="font-semibold text-stone-800">{label}</span>
        {description && <span className="mt-0.5 block text-stone-500">{description}</span>}
      </span>
    </label>
  );
}

type ChoiceOption = { value: string; label: ReactNode };

// Grupo de opciones tipo "píldora" (radio buttons accesibles).
export function ChoiceGroup({
  name,
  options,
  defaultValue,
  required,
  legend,
  errors,
  className,
}: {
  name: string;
  options: ChoiceOption[];
  defaultValue?: string | null;
  required?: boolean;
  legend?: ReactNode;
  errors?: string[];
  className?: string;
}) {
  return (
    <fieldset className={className}>
      {legend && (
        <legend className="mb-1.5 text-sm font-bold text-stone-800">
          {legend}
          {required && <span className="text-rose-600"> *</span>}
        </legend>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              required={required}
              className="peer sr-only"
            />
            <span className="inline-flex h-10 items-center rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-brand-200 hover:border-brand-400">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      <FieldError errors={errors} />
    </fieldset>
  );
}
