"use client";

import { MessageCircle } from "lucide-react";
import { useActionState } from "react";

import { contactAboutPet } from "@/actions/pets";
import { FormMessage } from "@/components/ui/alert";
import type { ButtonVariant } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

export function ContactButton({
  petId,
  label = "Enviar mensaje",
  variant = "secondary",
}: {
  petId: string;
  label?: string;
  variant?: ButtonVariant;
}) {
  const [state, action] = useActionState<ActionState, FormData>(contactAboutPet, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="pet_id" value={petId} />
      <SubmitButton variant={variant} size="lg" className="w-full" pendingText="Abriendo chat…">
        <MessageCircle className="h-5 w-5" />
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
