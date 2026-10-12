"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { createReport } from "@/actions/safety";
import { Alert, FormMessage } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { REPORT_REASON_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";

type Target = "pet" | "user" | "message";

const TITLES: Record<Target, string> = {
  pet: "Reportar publicación",
  user: "Reportar a esta persona",
  message: "Reportar mensaje",
};

export function ReportButton({
  targetType,
  targetId,
  signedIn,
  loginNext,
  variant = "button",
  className,
}: {
  targetType: Target;
  targetId: string;
  signedIn: boolean;
  loginNext?: string;
  variant?: "button" | "link" | "icon";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState<ActionState & { key?: number }, FormData>(async (prev, formData) => {
    const result = await createReport(prev, formData);
    return { ...result, key: Number(formData.get("form_key")) };
  }, {});

  // Solo mostramos el resultado del envío correspondiente a esta apertura del diálogo.
  const current: ActionState = state.key === formKey ? state : {};
  const label = targetType === "message" ? "Reportar" : TITLES[targetType];
  const trigger =
    variant === "link"
      ? cn("inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-rose-600", className)
      : variant === "icon"
        ? cn("rounded-full p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600", className)
        : buttonClasses({ variant: "ghost", size: "sm", className: cn("text-stone-600", className) });

  if (!signedIn) {
    return (
      <Link href={`/ingresar?next=${encodeURIComponent(loginNext ?? "/")}`} className={trigger}>
        <Flag className="h-4 w-4" />
        {variant !== "icon" && label}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={trigger}
        onClick={() => {
          setFormKey((k) => k + 1);
          setOpen(true);
        }}
        aria-label={TITLES[targetType]}
      >
        <Flag className="h-4 w-4" />
        {variant !== "icon" && label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={TITLES[targetType]}
        description="Tu reporte es confidencial: la otra persona no sabrá quién lo envió."
      >
        {current.ok && current.message ? (
          <div className="space-y-4">
            <Alert variant="success">{current.message}</Alert>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Entendido
            </Button>
          </div>
        ) : (
          <form key={formKey} action={formAction} className="space-y-4">
            <input type="hidden" name="form_key" value={formKey} />
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <Field label="Motivo" htmlFor="report-reason" required errors={current.fieldErrors?.reason}>
              <Select id="report-reason" name="reason" required defaultValue="">
                <option value="" disabled>
                  Elige un motivo
                </option>
                {Object.entries(REPORT_REASON_LABELS).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Cuéntanos qué pasó"
              htmlFor="report-details"
              hint="Incluye todo lo que ayude a moderación: fechas, qué te pidieron, etc."
              errors={current.fieldErrors?.details}
            >
              <Textarea id="report-details" name="details" maxLength={2000} rows={4} />
            </Field>
            <Alert variant="warning">
              Si un animal está en peligro inmediato, llama a Carabineros al <strong>133</strong>.
            </Alert>
            {current.error && <FormMessage state={{ error: current.error }} />}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <SubmitButton variant="danger">Enviar reporte</SubmitButton>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
