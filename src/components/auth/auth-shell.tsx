import type { ReactNode } from "react";

import { PawIcon } from "@/components/layout/logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10 sm:py-16">
      <div className="mb-6 flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <PawIcon className="h-8 w-8" />
        </span>
      </div>
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-center text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-center text-sm text-stone-600">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-stone-600">{footer}</div>}
    </div>
  );
}
