"use client";

import { Printer } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";

export function PrintButton({ label = "Imprimir o guardar PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses({ className: "no-print" })}>
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
