"use client";

import { MessageCircle } from "lucide-react";
import { useActionState } from "react";

import { contactAboutDog } from "@/actions/dogs";
import { FormMessage } from "@/components/ui/alert";
import type { ButtonVariant } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

export function ContactButton({
  dogId,
  label = "Enviar mensaje",
  variant = "secondary",
}: {
  dogId: string;
  label?: string;
  variant?: ButtonVariant;
}) {
  const [state, action] = useActionState<ActionState, FormData>(contactAboutDog, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="dog_id" value={dogId} />
      <SubmitButton variant={variant} size="lg" className="w-full" pendingText="Abriendo chat…">
        <MessageCircle className="h-5 w-5" />
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
