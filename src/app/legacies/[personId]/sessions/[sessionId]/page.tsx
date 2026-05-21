"use client";

import { use, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../../../components/AppHeader";
import {
  BreathDots,
  Button,
  Card,
  ErrorBanner,
  Eyebrow,
  PageShell,
  Sparkle,
  Spinner,
  Textarea,
} from "../../../../components/ui";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import {
  useLegacySessions,
  useLegacyTurns,
  useSendTurn,
  useWrapSession,
} from "../../../../lib/queries";

type DisplayTurn =
  | { kind: "opener"; text: string }
  | {
      kind: "turn";
      turnIndex: number;
      userMessage: string;
      assistantReply: string;
      pending?: boolean;
    };

export default function ConversationPage({
  params,
}: {
  params: Promise<{ personId: string; sessionId: string }>;
}) {
  const { personId, sessionId } = use(params);
  const auth = useRequireAuth();
  const router = useRouter();

  const sessionsQ = useLegacySessions(personId, 50);
  const turnsQ = useLegacyTurns(personId, sessionId);
  const sendTurn = useSendTurn(personId, sessionId);
  const wrapSession = useWrapSession(personId, sessionId);

  const session = useMemo(
    () => sessionsQ.data?.find((s) => s.sessionId === sessionId) ?? null,
    [sessionsQ.data, sessionId]
  );

  const [draft, setDraft] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the composer when the conversation loads, and again after each
  // send + reply, so the user can keep typing without ever clicking the field.
  useEffect(() => {
    if (session?.status !== "open") return;
    textareaRef.current?.focus({ preventScroll: true });
  }, [session?.status, turnsQ.data, sendTurn.isPending]);

  // Page-level keypress: any printable key (when nothing else is focused) should
  // route into the composer. Chat-app feel — start typing and you're already in.
  useEffect(() => {
    if (session?.status !== "open") return;
    const onKey = (e: KeyboardEvent) => {
      const ta = textareaRef.current;
      if (!ta) return;
      // Don't interfere with modifier shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't override if user is already in a form control.
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      // Only trigger on printable single characters.
      if (e.key.length !== 1) return;
      ta.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session?.status]);

  // When a new turn arrives, scroll the latest message into view.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const lastChild = el.lastElementChild as HTMLElement | null;
    if (lastChild) {
      lastChild.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [turnsQ.data, pendingUserMessage]);

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    const message = draft.trim();
    if (
      !message ||
      sendTurn.isPending ||
      !session ||
      session.status !== "open"
    )
      return;

    setLocalError(null);
    setPendingUserMessage(message);
    setDraft("");

    try {
      await sendTurn.mutateAsync(message);
      setPendingUserMessage(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to send message.");
      setDraft(message);
      setPendingUserMessage(null);
    }
  };

  const handleWrap = async () => {
    if (!session || session.status !== "open") return;
    if (!confirm("Close this conversation? It will be summarised and archived."))
      return;

    setLocalError(null);
    try {
      await wrapSession.mutateAsync();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to wrap session.");
    }
  };

  if (auth.status !== "authenticated") {
    return (
      <PageShell narrow>
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-5 w-5" />
        </div>
      </PageShell>
    );
  }

  const turns = turnsQ.data;
  const error =
    localError ||
    (turnsQ.error instanceof Error ? turnsQ.error.message : null) ||
    (sessionsQ.error instanceof Error ? sessionsQ.error.message : null);

  const display: DisplayTurn[] = [];
  if (session?.opener) display.push({ kind: "opener", text: session.opener });
  for (const t of turns ?? []) {
    display.push({
      kind: "turn",
      turnIndex: t.turnIndex,
      userMessage: t.userMessage,
      assistantReply: t.assistantReply,
    });
  }
  if (pendingUserMessage) {
    display.push({
      kind: "turn",
      turnIndex: (turns?.length ?? 0) + 1,
      userMessage: pendingUserMessage,
      assistantReply: "",
      pending: true,
    });
  }

  return (
    <PageShell narrow>
      {/* Sticky header chrome — back arrow, page label, title + Close conversation.
          Stays pinned at the top of the viewport while the page scrolls. */}
      <div
        className="sticky top-0 z-30 -mx-4 px-4 pt-4 sm:-mx-6 sm:px-6 sm:pt-6 md:-mx-8 md:px-8 md:pt-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(8, 7, 20, 0.97) 0%, rgba(8, 7, 20, 0.92) 80%, rgba(8, 7, 20, 0) 100%)",
        }}
      >
        <AppHeader
          back={`/legacies/${encodeURIComponent(personId)}`}
          title="Conversation"
        />
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 label-mono text-meta text-tertiary">
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  session?.status === "open"
                    ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]"
                    : "bg-white/40"
                }`}
              >
                {session?.status === "open" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/40" />
                )}
              </span>
              <span>
                {session?.status === "wrapped"
                  ? "Archived"
                  : session?.status === "open"
                    ? "Live · in progress"
                    : "Loading"}
              </span>
            </div>
            <h1 className="display-sans text-headline mt-2 text-white">
              {session?.status === "wrapped" ? "Looking back" : "Tell me more"}
            </h1>
          </div>
          {session?.status === "open" && (
            <div className="shrink-0">
              <Button
                variant="secondary"
                onClick={() => void handleWrap()}
                disabled={wrapSession.isPending}
              >
                {wrapSession.isPending && <Spinner />}
                {wrapSession.isPending ? "Closing…" : "Close conversation"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div>
        {error && (
          <div className="mb-6">
            <ErrorBanner>{error}</ErrorBanner>
          </div>
        )}

        {session?.status === "wrapped" && session.sessionSummary && (
          <Card className="mb-8 p-5">
            <Eyebrow>Summary</Eyebrow>
            <p className="mt-2 text-sm italic leading-relaxed text-secondary">
              {session.sessionSummary}
            </p>
          </Card>
        )}

        {/* Messages flow normally in the page — page scrolls, sticky chrome stays put. */}
        <div ref={scrollerRef} className="space-y-8 sm:space-y-10">
          {turnsQ.isLoading ? (
            <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
              <Spinner /> Loading conversation
            </div>
          ) : display.length === 0 ? (
            <p className="label-mono text-meta text-tertiary">
              No turns yet.
            </p>
          ) : (
            display.map((item, i) =>
              item.kind === "opener" ? (
                <Line key={`op-${i}`} role="assistant" text={item.text} />
              ) : (
                <div key={item.turnIndex} className="space-y-6">
                  <Line role="user" text={item.userMessage} />
                  {item.pending ? (
                    <Line role="assistant" text="" pending />
                  ) : (
                    item.assistantReply && (
                      <Line role="assistant" text={item.assistantReply} />
                    )
                  )}
                </div>
              )
            )
          )}
        </div>

        {session?.status === "open" && (
          <form
            onSubmit={handleSend}
            className="sticky bottom-24 z-20 -mx-4 mt-6 mb-4 px-4 pb-3 pt-10 backdrop-blur-2xl backdrop-saturate-150 sm:-mx-6 sm:bottom-28 sm:px-6 sm:pb-4 sm:pt-12 md:-mx-8 md:px-8"
            style={{
              background:
                "linear-gradient(180deg, rgba(8, 7, 20, 0) 0%, rgba(8, 7, 20, 0.55) 22%, rgba(8, 7, 20, 0.9) 55%, rgba(8, 7, 20, 0.97) 100%)",
            }}
          >
            <div
              className="rounded-2xl border border-white/12 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:rounded-3xl sm:p-4"
              style={{
                background:
                  "linear-gradient(180deg, rgba(14, 12, 28, 0.92) 0%, rgba(8, 7, 20, 0.95) 100%)",
              }}
            >
            <Textarea
              ref={textareaRef}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="A memory. A moment. Anything."
              disabled={sendTurn.isPending}
              autoFocus
              className="border-b-0 px-1 py-1 text-base placeholder:italic"
            />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/6 pt-3">
              <p className="hidden label-mono text-meta text-tertiary sm:block">
                Enter to send · Shift+Enter for new line
              </p>
              <Button type="submit" disabled={sendTurn.isPending || !draft.trim()}>
                {sendTurn.isPending && <Spinner />}
                {sendTurn.isPending ? "Sending…" : "Send"}
              </Button>
            </div>
            </div>
          </form>
        )}

        {session?.status === "wrapped" && (
          <div className="mt-8 text-center">
            <p className="label-mono text-meta text-tertiary">
              This conversation is sealed.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(`/legacies/${encodeURIComponent(personId)}`)
              }
              className="mt-4 label-mono text-meta text-secondary hover:text-white"
            >
              Return to legacy →
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Line({
  role,
  text,
  pending,
}: {
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
}) {
  if (role === "assistant") {
    return (
      <div className="relative pl-6 sm:pl-7">
        <span className="absolute left-0 top-1 text-[rgb(var(--accent-soft))] drop-shadow-[0_0_12px_rgba(180,173,255,0.7)]">
          <Sparkle size={16} />
        </span>
        {pending ? (
          <span className="inline-flex items-center gap-3 label-mono text-meta text-secondary">
            <BreathDots /> Listening
          </span>
        ) : (
          <p className="serif whitespace-pre-wrap text-lg leading-relaxed text-primary sm:text-xl">
            {text}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="relative pl-5 sm:pl-6">
      <span className="absolute left-0 top-2.5 inline-block h-3 w-px bg-white/30" />
      <p className="text-body whitespace-pre-wrap text-secondary">{text}</p>
    </div>
  );
}
