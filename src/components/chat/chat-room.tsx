"use client";

import { AlertTriangle, Loader2, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { ReportButton } from "@/components/safety/report-button";
import { Alert } from "@/components/ui/alert";
import { friendlyError } from "@/lib/errors";
import { formatDate, formatTime } from "@/lib/format";
import { looksRisky } from "@/lib/safety";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  sender_id: string;
  kind: "user" | "system";
  body: string;
  safety_flag: boolean;
  created_at: string;
};

const PAGE = 50;

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
}

export function ChatRoom({
  conversationId,
  meId,
  otherName,
  initialMessages,
  hasMore: initialHasMore,
  canSend,
  disabledReason,
}: {
  conversationId: string;
  meId: string;
  otherName: string;
  initialMessages: ChatMessage[];
  hasMore: boolean;
  canSend: boolean;
  disabledReason?: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const supabase = createClient();

  const markRead = useCallback(() => {
    void createClient().rpc("mark_conversation_read", { p_conversation_id: conversationId });
  }, [conversationId]);

  const append = useCallback((incoming: ChatMessage) => {
    setMessages((current) => (current.some((m) => m.id === incoming.id) ? current : [...current, incoming]));
  }, []);

  // Tiempo real: nuevos mensajes de la conversación.
  useEffect(() => {
    const client = createClient();
    let cancelled = false;
    const channel = client.channel(`chat:${conversationId}`);
    (async () => {
      await client.realtime.setAuth();
      if (cancelled) return;
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            append(payload.new as ChatMessage);
            if ((payload.new as ChatMessage).sender_id !== meId) markRead();
          },
        )
        .subscribe();
    })();
    markRead();
    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [conversationId, meId, append, markRead]);

  // Mantiene la vista abajo cuando llegan mensajes (si la persona no estaba leyendo más arriba).
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    if (!messages.length) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const previousHeight = el?.scrollHeight ?? 0;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, kind, body, safety_flag, created_at")
      .eq("conversation_id", conversationId)
      .lt("created_at", messages[0].created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const older = (data ?? []).reverse();
    stickToBottom.current = false;
    setMessages((current) => [...older, ...current]);
    setHasMore(older.length === PAGE);
    setLoadingOlder(false);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - previousHeight;
    });
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, body })
      .select("id, sender_id, kind, body, safety_flag, created_at")
      .single();
    setSending(false);
    if (insertError || !data) {
      setError(friendlyError(insertError, "No pudimos enviar el mensaje."));
      return;
    }
    stickToBottom.current = true;
    append(data);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  const risky = draft.length > 3 && looksRisky(draft);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5"
        aria-live="polite"
      >
        {hasMore && (
          <div className="text-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-600 shadow-xs hover:bg-stone-50"
            >
              {loadingOlder ? "Cargando…" : "Ver mensajes anteriores"}
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-500">
            Escribe tu primer mensaje a {otherName}. Preséntate y cuéntale por qué te interesa.
          </p>
        )}
        {messages.map((message, index) => {
          const showDay = index === 0 || dayKey(messages[index - 1].created_at) !== dayKey(message.created_at);
          const mine = message.sender_id === meId;
          return (
            <div key={message.id}>
              {showDay && (
                <p className="my-3 text-center text-xs font-bold text-stone-400">{formatDate(message.created_at)}</p>
              )}
              {message.kind === "system" ? (
                <p className="mx-auto my-2 max-w-md rounded-xl bg-stone-100 px-3 py-2 text-center text-xs font-semibold text-stone-600">
                  {message.body}
                </p>
              ) : (
                <div className={cn("group flex items-end gap-1.5", mine ? "justify-end" : "justify-start")}>
                  {!mine && (
                    <ReportButton
                      targetType="message"
                      targetId={message.id}
                      signedIn
                      variant="icon"
                      className="order-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    />
                  )}
                  <div className={cn("max-w-[85%] sm:max-w-[70%]", mine ? "order-1" : "order-1")}>
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap shadow-xs",
                        mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-stone-800",
                      )}
                    >
                      {message.body}
                      <span className={cn("mt-0.5 block text-right text-[10px]", mine ? "text-brand-100" : "text-stone-400")}>
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    {message.safety_flag && (
                      <p className="mt-1 flex items-start gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                        Este mensaje menciona dinero o datos sensibles. Adoptar es gratis: nunca transfieras dinero ni
                        compartas claves o códigos.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-stone-200 bg-white p-3 sm:p-4">
        {!canSend ? (
          <p className="text-center text-sm text-stone-500">{disabledReason ?? "No puedes enviar mensajes en esta conversación."}</p>
        ) : (
          <form onSubmit={send} className="space-y-2">
            {risky && (
              <Alert variant="warning">
                Parece que hablas de dinero, cuentas o códigos. En Huellitas la adopción es gratuita: nunca transfieras
                dinero por adelantado ni compartas códigos de verificación.
              </Alert>
            )}
            {error && <Alert variant="danger">{error}</Alert>}
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Escribe un mensaje
              </label>
              <textarea
                id="chat-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Escribe un mensaje…"
                className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-stone-300 px-4 py-2.5 text-[15px] focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                aria-label="Enviar mensaje"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
