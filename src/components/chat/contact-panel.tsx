import { Mail, Phone, ShieldCheck } from "lucide-react";

import { shareContact } from "@/actions/messaging";
import { ConfirmAction } from "@/components/ui/confirm-action";

export function ContactPanel({
  conversationId,
  otherName,
  iShared,
  contact,
  canShare,
}: {
  conversationId: string;
  otherName: string;
  iShared: boolean;
  contact: { phone: string | null; email: string | null } | null;
  canShare: boolean;
}) {
  const waNumber = contact?.phone?.replace(/[^\d]/g, "");
  return (
    <div className="space-y-3">
      {contact ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm">
          <p className="font-extrabold text-teal-900">Datos de contacto de {otherName}</p>
          <ul className="mt-2 space-y-1.5 text-teal-900">
            {contact.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="font-semibold underline">
                  {contact.phone}
                </a>
                {waNumber && (
                  <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold underline">
                    WhatsApp
                  </a>
                )}
              </li>
            )}
            {contact.email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${contact.email}`} className="font-semibold break-all underline">
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-stone-500">{otherName} aún no comparte sus datos de contacto.</p>
      )}
      {iShared ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-700">
          <ShieldCheck className="h-4 w-4" /> Compartiste tus datos de contacto.
        </p>
      ) : (
        canShare && (
          <ConfirmAction
            action={shareContact}
            fields={{ conversation_id: conversationId }}
            label="Compartir mis datos de contacto"
            variant="soft"
            size="sm"
            confirmLabel="Sí, compartir"
            title="¿Compartir tus datos de contacto?"
            description={`${otherName} podrá ver tu teléfono (si lo registraste) y tu correo. Hazlo solo si confías en esta persona.`}
            className="w-full"
          >
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Nunca compartas datos bancarios, claves ni códigos que te lleguen por SMS.</li>
              <li>Si te piden dinero, reporta la conversación.</li>
            </ul>
          </ConfirmAction>
        )
      )}
    </div>
  );
}
