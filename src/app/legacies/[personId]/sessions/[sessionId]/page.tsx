"use client";

import { use, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../../../components/AppHeader";
import {
  BreathDots,
  Button,
  ConfirmDialog,
  ErrorBanner,
  PageLoader,
  PageShell,
  Sparkle,
  Spinner,
  Textarea,
} from "../../../../components/ui";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import {
  useLegacyHeader,
  useLegacySessions,
  useLegacyTurns,
  useSendTurn,
  useStartSession,
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

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return `${Math.floor(day / 30)}mo ago`;
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ personId: string; sessionId: string }>;
}) {
  const { personId, sessionId } = use(params);
  const auth = useRequireAuth();
  const router = useRouter();

  const headerQ = useLegacyHeader(personId);
  const sessionsQ = useLegacySessions(personId, 50);
  const turnsQ = useLegacyTurns(personId, sessionId);
  const sendTurn = useSendTurn(personId, sessionId);
  const wrapSession = useWrapSession(personId, sessionId);
  const startSession = useStartSession(personId);

  const session = useMemo(
    () => sessionsQ.data?.find((s) => s.sessionId === sessionId) ?? null,
    [sessionsQ.data, sessionId]
  );

  const personName = headerQ.data?.name ?? "";
  const firstName = personName.split(/\s+/)[0] || personName;

  const [draft, setDraft] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [wrapConfirmOpen, setWrapConfirmOpen] = useState(false);
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
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key.length !== 1) return;
      ta.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session?.status]);

  // When a new turn arrives, scroll the page to the bottom. The spacer below
  // the scroller is sized to match the fixed composer, so landing at page
  // bottom puts the freshly added message right above the composer. Using
  // scrollIntoView on the last child instead lands it *behind* the composer
  // because that element doesn't know about the fixed overlay.
  useEffect(() => {
    if (!scrollerRef.current) return;
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
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

  const handleWrap = () => {
    if (!session || session.status !== "open") return;
    setWrapConfirmOpen(true);
  };

  const confirmWrap = async () => {
    setLocalError(null);
    try {
      await wrapSession.mutateAsync();
      setWrapConfirmOpen(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to wrap session.");
    }
  };

  const handleStartNew = async () => {
    setLocalError(null);
    try {
      const res = await startSession.mutateAsync();
      router.push(
        `/legacies/${encodeURIComponent(personId)}/sessions/${encodeURIComponent(
          res.sessionId
        )}`
      );
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Could not start a new conversation."
      );
    }
  };

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <PageLoader label="Loading conversation" />
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

  const isOpen = session?.status === "open";
  const isWrapped = session?.status === "wrapped";

  const statusBadge = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 label-mono text-meta text-secondary">
      <span
        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
          isOpen
            ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]"
            : isWrapped
              ? "bg-[rgb(var(--warm))] shadow-[0_0_10px_rgba(240,200,154,0.7)]"
              : "bg-white/40"
        }`}
      >
        {isOpen && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/40" />
        )}
      </span>
      <span>
        {isWrapped ? "Archived" : isOpen ? "Live · in progress" : "Loading"}
      </span>
      {session && (
        <>
          <span className="text-white/30">/</span>
          <span>
            {session.turnCount} turn{session.turnCount === 1 ? "" : "s"}
          </span>
          {session.openedAt && (
            <>
              <span className="text-white/30">/</span>
              <span>opened {relativeTime(session.openedAt)}</span>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <PageShell wide>
      <AppHeader
        back={`/legacies/${encodeURIComponent(personId)}`}
        title={firstName ? `with ${firstName}` : "Conversation"}
      />

      {/* Mobile-only compact status strip. Replaces the big "TELL ME MORE."
          editorial headline on phones so the chat thread sits above the
          fold instead of being pushed below a hero. The full editorial
          treatment lives in the desktop left rail (aside) below. */}
      <div className="mb-4 lg:hidden">{statusBadge}</div>

      {error && (
        <div className="mb-6">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {/* Two-column editorial split on lg+ — sticky editorial rail on the
          left, the conversation thread on the right. Mobile stacks them
          (and skips the big headline entirely via lg:block). */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-6 space-y-7">
            {/* Editorial intro — only the desktop rail shows the big
                "TELL ME MORE." / "LOOKING BACK." headline; mobile already
                has the compact status strip above the thread. */}
            <section className="hidden lg:block">
              {statusBadge}
              <h1 className="display-sans text-display mt-5 leading-[0.92] text-white">
                {isWrapped ? (
                  <>
                    LOOKING
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage:
                          "linear-gradient(180deg, rgba(var(--warm),1) 0%, rgba(var(--warm-deep),1) 100%)",
                      }}
                    >
                      BACK.
                    </span>
                  </>
                ) : (
                  <>
                    TELL ME
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage:
                          "linear-gradient(180deg, rgba(var(--accent-soft),1) 0%, rgba(var(--accent),1) 100%)",
                      }}
                    >
                      MORE.
                    </span>
                  </>
                )}
              </h1>
            </section>

            {isWrapped && session?.sessionSummary && (
              <div>
                <p className="eyebrow">Summary</p>
                <div className="mt-3 border-l-2 border-[rgb(var(--warm))]/55 pl-4">
                  <p className="serif text-title italic leading-relaxed text-primary">
                    {session.sessionSummary}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {personName && (
                <div>
                  <p className="eyebrow">Speaking with</p>
                  <p className="mt-2 display-sans text-title text-white">
                    {personName}
                  </p>
                </div>
              )}

              {session?.lastTurnAt && (
                <div>
                  <p className="eyebrow">Last reply</p>
                  <p className="mt-2 text-body text-secondary">
                    {relativeTime(session.lastTurnAt)}
                  </p>
                </div>
              )}
            </div>

            {isOpen && (
              <div className="border-t border-white/20 pt-6">
                <Button
                  variant="secondary"
                  onClick={() => void handleWrap()}
                  disabled={wrapSession.isPending}
                  className="w-full justify-center"
                >
                  {wrapSession.isPending && <Spinner />}
                  {wrapSession.isPending ? "Closing…" : "Close conversation"}
                </Button>
                <p className="mt-3 text-caption text-tertiary">
                  Closing seals the session and writes a summary you can revisit later.
                </p>
              </div>
            )}

            {isWrapped && (
              <div className="space-y-3 border-t border-white/20 pt-6">
                <p className="label-mono text-meta text-secondary">
                  This conversation is sealed
                </p>
                {/* Primary action — start a new conversation with the same person */}
                <button
                  type="button"
                  onClick={() => void handleStartNew()}
                  disabled={startSession.isPending}
                  aria-label={`Start a new conversation with ${firstName || "this person"}`}
                  className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border-2 border-[rgb(var(--accent-soft))]/55 bg-linear-to-br from-[rgba(60,46,110,0.78)] via-[rgba(36,28,72,0.82)] to-[rgba(20,16,42,0.85)] px-5 py-4 text-left backdrop-blur-xl shadow-[0_24px_60px_-20px_rgba(123,115,253,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-soft))]/80 hover:shadow-[0_32px_80px_-20px_rgba(123,115,253,0.7),inset_0_1px_0_0_rgba(255,255,255,0.18)] disabled:cursor-wait disabled:opacity-70"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-[rgba(200,170,255,0.6)] to-transparent"
                  />
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/12 text-white"
                  >
                    {startSession.isPending ? (
                      <Spinner className="h-5 w-5" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 9v4M10 11h4"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <p className="text-body font-medium text-white">
                      {startSession.isPending
                        ? "Opening…"
                        : `Talk to ${firstName || "them"} again`}
                    </p>
                    <p className="mt-0.5 text-caption text-secondary">
                      Begin a new conversation
                    </p>
                  </span>
                </button>

                {/* Secondary action — back to the legacy detail page */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/legacies/${encodeURIComponent(personId)}`)
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/22 bg-white/4 px-4 py-3 text-left text-caption text-secondary transition hover:border-white/40 hover:bg-white/8 hover:text-white"
                >
                  <span>Back to {firstName || "legacy"}'s page</span>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M9 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right: the conversation thread. Constrained to a readable
            reading width inside the wide column so lines don't span the
            full canvas — chat copy past ~80ch is hard to track. */}
        <div className="lg:col-span-8">
          <div
            ref={scrollerRef}
            className="mx-auto w-full max-w-3xl space-y-8 sm:space-y-10"
          >
            {turnsQ.isLoading ? (
              <div className="flex items-center gap-3 text-body text-secondary">
                <Spinner /> Loading conversation
              </div>
            ) : display.length === 0 ? (
              <p className="text-body text-tertiary">
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

        </div>
      </div>

      {/* Reserve vertical space so the fixed composer never sits on top
          of the last assistant reply. Smaller on mobile so the thread
          uses more of the visible viewport above the keyboard. */}
      {isOpen && <div aria-hidden className="h-40 sm:h-56" />}

      {/* Composer — fixed to the viewport so it never unpins on short
          pages. Tight padding + smaller textarea on mobile so the input
          feels chat-app-native (sits flush near the bottom edge); roomier
          on desktop where there's more space to breathe. */}
      {isOpen && (
        <form
          onSubmit={handleSend}
          className="fixed inset-x-0 bottom-0 z-30 px-3 pt-6 pb-safe sm:px-6 sm:pt-12 md:px-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(8, 7, 20, 0) 0%, rgba(8, 7, 20, 0.7) 30%, rgba(8, 7, 20, 0.95) 70%)",
          }}
        >
          <div className="mx-auto w-full max-w-3xl">
            <div
              className="rounded-2xl border-2 border-white/28 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:rounded-3xl sm:p-4"
              style={{
                background:
                  "linear-gradient(180deg, rgba(20, 16, 38, 0.96) 0%, rgba(10, 8, 22, 0.98) 100%)",
              }}
            >
              <Textarea
                ref={textareaRef}
                rows={1}
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
                className="border-0 bg-transparent px-1 py-1 text-body shadow-none sm:rows-2 focus:bg-transparent focus:shadow-none"
              />
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/22 pt-2 sm:mt-3 sm:pt-3">
                <p className="hidden text-caption text-secondary sm:block">
                  Enter to send · Shift+Enter for a new line
                </p>
                <Button
                  type="submit"
                  disabled={sendTurn.isPending || !draft.trim()}
                >
                  {sendTurn.isPending && <Spinner />}
                  {sendTurn.isPending ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={wrapConfirmOpen}
        onClose={() => {
          if (!wrapSession.isPending) setWrapConfirmOpen(false);
        }}
        onConfirm={() => void confirmWrap()}
        busy={wrapSession.isPending}
        title="Wrap this conversation?"
        description="We'll summarise what was shared and archive it. You can start a new conversation anytime."
        confirmLabel={wrapSession.isPending ? "Wrapping…" : "Wrap & archive"}
        cancelLabel="Keep talking"
        icon={
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="4" rx="1.2" />
            <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
            <path d="M10 12h4" />
          </svg>
        }
      />
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
      <div className="relative pl-6 sm:pl-8">
        <span className="absolute left-0 top-1.5 text-[rgb(var(--accent-soft))] drop-shadow-[0_0_12px_rgba(180,173,255,0.7)]">
          <Sparkle size={18} />
        </span>
        {pending ? (
          <span className="inline-flex items-center gap-3 text-body text-secondary">
            <BreathDots /> Listening
          </span>
        ) : (
          <p className="whitespace-pre-wrap text-title leading-relaxed text-primary">
            {text}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="relative pl-5 sm:pl-6">
      <span className="absolute left-0 top-2 inline-block h-5 w-[3px] rounded-full bg-[rgb(var(--accent-soft))]/65" />
      <p className="text-body whitespace-pre-wrap text-secondary">{text}</p>
    </div>
  );
}
