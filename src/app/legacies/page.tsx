"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { AppHeader } from "../components/AppHeader";
import { CurvedDeck } from "../components/CurvedDeck";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Eyebrow,
  PageLoader,
  PageShell,
  Skeleton,
  Spinner,
  Textarea,
  useToast,
} from "../components/ui";
import { useRequireAuth } from "../hooks/useRequireAuth";
import {
  qk,
  useLegacies,
  useUpsertProfileFact,
  type Legacy,
} from "../lib/queries";
import { legacyApi, type LegacyQuestion } from "../lib/api";

function relativeTime(iso: string): string {
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

function Portrait({ legacy }: { legacy: Legacy }) {
  const usable =
    legacy.referenceImageUrl &&
    /^https?:\/\//i.test(legacy.referenceImageUrl)
      ? legacy.referenceImageUrl
      : null;

  const initials =
    legacy.deceasedName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "—";

  return (
    <Link
      href={`/legacies/${encodeURIComponent(legacy.personId)}`}
      className="group relative block press-soft"
      // Drag-to-prevent-image-drag — pictures don't get grabbed.
      draggable={false}
    >
      <div className="relative aspect-3/4 w-[64vw] max-w-[280px] overflow-hidden rounded-2xl border border-white/10 transition-[border-color,box-shadow] duration-300 group-hover:border-[rgb(var(--accent-soft))]/40 group-hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5)] group-active:border-[rgb(var(--accent-soft))]/60 group-active:shadow-[0_12px_36px_-16px_rgba(123,115,253,0.7)] sm:w-[280px] sm:rounded-3xl md:w-[300px]">
        {/* Base violet sheen */}
        <div className="absolute inset-0 bg-linear-to-br from-[rgb(var(--accent))]/30 via-[rgb(var(--accent-deep))]/25 to-black/50" />

        {usable ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={usable}
            alt={legacy.deceasedName}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="display-sans text-display select-none text-secondary">
              {initials}
            </span>
          </div>
        )}

        {/* Warm hover halo */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_120%,rgba(240,200,154,0.18)_0%,transparent_60%)]" />
        </div>

        {!legacy.onboardingComplete && (
          <span className="absolute right-3 top-3 rounded-full border border-[rgb(var(--warm))]/40 bg-[rgb(var(--warm))]/12 px-2 py-0.5 label-mono text-meta text-[rgb(var(--warm))]">
            Setup
          </span>
        )}

        {/* Caption gradient + content */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/95 via-black/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 sm:p-5">
          <p className="display-sans text-title text-white">
            {legacy.deceasedName}
          </p>
          <p className="mt-1.5 truncate label-mono text-meta text-secondary">
            <span className="capitalize">{legacy.relationship}</span>
            <span className="mx-1.5 text-tertiary">·</span>
            <span className="text-[rgb(var(--warm))]/85">
              {relativeTime(legacy.createdAt)}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function LegaciesPage() {
  const auth = useRequireAuth();
  const enabled = auth.status === "authenticated";

  const legaciesQuery = useLegacies({
    enabled,
    queryKey: ["legacies"],
  });

  const sorted = useMemo(() => {
    const items = legaciesQuery.data?.legacies ?? [];
    return [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [legaciesQuery.data]);

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <PageLoader label="Opening the archive" />
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <AppHeader />

      {legaciesQuery.isError && (
        <div className="mb-6">
          <ErrorBanner>
            {legaciesQuery.error instanceof Error
              ? legaciesQuery.error.message
              : "Failed to load legacies."}
          </ErrorBanner>
        </div>
      )}

      {legaciesQuery.isLoading ? (
        <>
          <HomeHero count={0} />
          <div className="-mx-4 sm:-mx-6 md:-mx-8">
            <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 py-8 sm:gap-5 sm:px-6 sm:py-10 md:px-8">
              {[0, 1, 2].map((i) => (
                <Skeleton
                  key={i}
                  rounded="rounded-2xl sm:rounded-3xl"
                  className="aspect-3/4 w-[64vw] max-w-[280px] shrink-0 sm:w-[280px] md:w-[300px]"
                />
              ))}
            </div>
            <p className="mt-2 text-center label-mono text-meta text-tertiary">
              Gathering portraits
            </p>
          </div>
        </>
      ) : sorted.length === 0 ? (
        <>
          <HomeHero count={0} />
          <EmptyState
            title="The room is empty."
            hint="Begin by adding someone. You'll need a photo, their relationship to you, and a few minutes."
            action={
              <Link href="/onboarding/new">
                <Button variant="primary">Begin a new legacy</Button>
              </Link>
            }
          />
        </>
      ) : (
        <HomeBody legacies={sorted} />
      )}
    </PageShell>
  );
}

/* The shared hero block — extracted so the question-stack layout can place
   it inside the left column of the grid (where its eyebrow lines up with
   the right rail's "Open" eyebrow on the same row). */
function HomeHero({ count }: { count: number }) {
  return (
    <section className="mb-8 mt-2 sm:mb-10">
      <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-soft))]/40" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.9)]" />
        </span>
        <span>Archive</span>
        <span className="text-white/20">/</span>
        <span>{count.toString().padStart(2, "0")} preserved</span>
      </div>
      <h1 className="display-sans text-display mt-5 leading-[0.92] text-white">
        THE PEOPLE
        <br />
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(var(--accent-soft),1) 0%, rgba(var(--accent),1) 100%)",
          }}
        >
          YOU LOVE.
        </span>
      </h1>
      <p className="mt-5 max-w-md text-body text-secondary">
        A private archive for the people who shaped you. Drag to browse — tap
        a portrait to step into their story.
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────
   HomeBody — the section below the hero. Decides between two layouts:

     A) There are open questions across one or more legacies →
        a 75/25 split: poker-stack of all questions on the left,
        compact legacy column on the right.

     B) No open questions exist (or none of the legacies are onboarded
        yet) → the original full-width curved deck of portraits.
   ──────────────────────────────────────────────────────────────────── */

function HomeBody({ legacies }: { legacies: Legacy[] }) {
  // Fan out one questions query per onboarded legacy. The endpoint is
  // gated by onboardingComplete server-side too, but skipping un-set-up
  // ones here saves a round trip and avoids 4xxs on incomplete people.
  const completed = useMemo(
    () => legacies.filter((l) => l.onboardingComplete),
    [legacies]
  );

  const questionQueries = useQueries({
    queries: completed.map((l) => ({
      queryKey: qk.questions(l.personId),
      queryFn: () => legacyApi.listQuestions(l.personId).then((r) => r.items),
      staleTime: 60_000,
    })),
  });

  // Combine into a single deck, each question tagged with its owning legacy.
  // Sort newest first so the freshest threads surface to the top of the stack.
  const stack = useMemo(() => {
    const combined: Array<{ question: LegacyQuestion; legacy: Legacy }> = [];
    questionQueries.forEach((q, i) => {
      const legacy = completed[i];
      if (!legacy || !q.data) return;
      for (const question of q.data) combined.push({ question, legacy });
    });
    combined.sort(
      (a, b) =>
        new Date(b.question.createdAt).getTime() -
        new Date(a.question.createdAt).getTime()
    );
    return combined;
  }, [questionQueries, completed]);

  const anyLoading = questionQueries.some((q) => q.isLoading);
  const hasQuestions = stack.length > 0;

  // Decide which layout we're in. When questions exist we go full-bleed
  // on desktop: the portrait deck (75%) starts at the viewport left edge
  // and the question rail (25%) extends to the viewport right edge so the
  // wide screen isn't wasted on a centered column. PageShell still owns
  // the hero header above; the trick below breaks just this row out of it.
  if (hasQuestions) {
    return (
      // The hero lives inside the left column of the grid so its eyebrow
      // ("Archive / N preserved") sits on the same row as the right-rail
      // eyebrow ("Open · 1/N"). Both anchor to row 1 of their column → they
      // align vertically without any negative-margin math.
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
        <section className="md:col-span-9">
          <HomeHero count={legacies.length} />
          <div className="deck-fade-x -mx-4 sm:-mx-6 md:mx-0">
            <CurvedDeck bend={70} rotation={7} className="py-6 md:py-8">
              {[
                <div key="lead" className="w-[10vw] min-w-[32px] md:w-6" />,
                ...legacies.map((l) => <Portrait key={l.personId} legacy={l} />),
                <div key="tail" className="w-[10vw] min-w-[32px] md:w-6" />,
              ]}
            </CurvedDeck>
          </div>
          <p className="mt-2 text-center label-mono text-meta text-tertiary">
            Drag · scroll · tap to enter
          </p>
        </section>
        <aside className="md:col-span-3">
          <QuestionStack stack={stack} compact />
        </aside>
      </div>
    );
  }

  // No questions yet — keep the existing showpiece deck so the home screen
  // still has a centerpiece.
  return (
    <>
      <HomeHero count={legacies.length} />
      {anyLoading && (
        <p className="mb-4 flex items-center justify-center gap-2 label-mono text-meta text-tertiary">
          <span className="breath-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          Looking for open threads
        </p>
      )}
      <div className="deck-fade-x -mx-4 sm:-mx-6 md:-mx-8">
        <CurvedDeck bend={70} rotation={7} className="py-8 sm:py-10">
          {[
            <div key="lead" className="w-[10vw] min-w-[32px]" />,
            ...legacies.map((l) => <Portrait key={l.personId} legacy={l} />),
            <div key="tail" className="w-[10vw] min-w-[32px]" />,
          ]}
        </CurvedDeck>
      </div>
      <p className="mt-2 text-center label-mono text-meta text-tertiary">
        Drag · scroll · tap to enter
      </p>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────
   QuestionStack — poker-fan of every open question across every legacy.
   ────────────────────────────────────────────────────────────────────
   The top card is interactive: it shows the question, the legacy it
   belongs to, and a big answer field. Saving (or skipping) animates the
   top card out and snaps the next one forward. Up to three more cards
   peek behind it, fanned with alternating rotations so it reads as a
   real stack you could thumb through.

   Mobile-friendly: peek cards reduce to two on small viewports so the
   fan doesn't crowd the active card. */

function slugifyQuestion(text: string, fallback: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || fallback
  );
}
function questionFactKey(qq: LegacyQuestion): string {
  const fromAttr = qq.attributes?.factKey ?? qq.attributes?.fact_key;
  if (typeof fromAttr === "string" && fromAttr.trim()) return fromAttr.trim();
  return slugifyQuestion(qq.text, qq.id);
}

function QuestionStack({
  stack,
  compact = false,
}: {
  stack: Array<{ question: LegacyQuestion; legacy: Legacy }>;
  /** Tightens padding, type scale, and peek count to fit a 25% rail. */
  compact?: boolean;
}) {
  // Snapshot order once so a background refetch doesn't shuffle cards
  // out from under the user mid-answer.
  const ordered = useMemo(() => stack, [stack.map((s) => s.question.id).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const [exitingId, setExitingId] = useState<string | null>(null);
  // The user can promote any queued question to the active slot by tapping
  // it in the list below. We track that as a pinned ID; advance() clears it.
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const queue = useMemo(
    () => ordered.filter((it) => !doneIds.has(it.question.id)),
    [ordered, doneIds]
  );
  // Resolve the active card — either the pinned one (if still queued) or
  // the natural head of the queue.
  const current = useMemo(() => {
    if (pinnedId) {
      const found = queue.find((q) => q.question.id === pinnedId);
      if (found) return found;
    }
    return queue[0];
  }, [pinnedId, queue]);
  // Everything else, in their original order, listed below the active card.
  const rest = useMemo(
    () => queue.filter((q) => q.question.id !== current?.question.id),
    [queue, current]
  );

  const totalCount = ordered.length;
  const answeredThisSession = totalCount - queue.length;
  const progressPct = totalCount
    ? Math.round((answeredThisSession / totalCount) * 100)
    : 0;

  const [answer, setAnswer] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const toast = useToast();

  // We dispatch the upsert against whichever legacy owns the active card.
  // The hook itself is stable across renders, so this is safe.
  const upsert = useUpsertProfileFact(current?.legacy.personId ?? "");

  useEffect(() => {
    setAnswer("");
    setLocalError(null);
  }, [current?.question.id]);

  const advance = (id: string) => {
    // Trigger the exit animation, then mark done one frame later so the
    // CSS transition has time to play.
    setExitingId(id);
    window.setTimeout(() => {
      setDoneIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      // Drop the pinned override so the next natural-head card surfaces.
      setPinnedId((prev) => (prev === id ? null : prev));
      setExitingId(null);
    }, 280);
  };

  const skip = () => {
    if (!current) return;
    advance(current.question.id);
  };

  const save = async () => {
    if (!current) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setLocalError("Type a few words before saving.");
      textareaRef.current?.focus();
      return;
    }
    setLocalError(null);
    try {
      await upsert.mutateAsync({
        factKey: questionFactKey(current.question),
        answerText: trimmed,
        questionText: current.question.text,
      });
      toast.show(
        `Saved · added to ${current.legacy.deceasedName}'s facts`,
        "success"
      );
      advance(current.question.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save.";
      setLocalError(msg);
      toast.show(msg, "error");
    }
  };

  // CASE — every question answered or skipped this session.
  if (!current) {
    return (
      <Card variant="glass" className="step-in relative overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--mint))]/45" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--mint))]" />
          </span>
          <span>Done for now</span>
        </div>
        <p className="mt-4 serif text-headline leading-snug text-primary sm:text-display">
          {answeredThisSession === 1
            ? "One memory secured."
            : `${answeredThisSession} memories secured.`}
        </p>
        <p className="mt-3 text-body leading-relaxed text-secondary">
          New questions surface as you keep telling their stories.
        </p>
      </Card>
    );
  }

  return (
    <div>
      {/* Header strip — eyebrow + counter + progress bar */}
      <div className={`flex items-center justify-between gap-2 ${compact ? "mb-2" : "mb-4"}`}>
        <div className="flex min-w-0 items-center gap-2 label-mono text-meta text-tertiary">
          <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-soft))]/40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.9)]" />
          </span>
          <span className="truncate">{compact ? "Open" : "The deck"}</span>
          {!compact && (
            <>
              <span className="text-white/20">/</span>
              <span>{totalCount.toString().padStart(2, "0")} open</span>
            </>
          )}
        </div>
        <span className="shrink-0 label-mono text-meta text-secondary tabular-nums">
          {answeredThisSession + 1}/{totalCount}
        </span>
      </div>

      <div className={`h-1 overflow-hidden rounded-full bg-white/8 ${compact ? "mb-3" : "mb-5"}`}>
        <div
          className="h-full rounded-full bg-linear-to-r from-[rgb(var(--accent))] to-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.6)] transition-[width] duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Active card on top */}
      <div className="relative">
        <div
          key={current.question.id}
          className="relative transition-[transform,opacity] duration-300 ease-out"
          style={
            exitingId === current.question.id
              ? {
                  transform: "translateX(-22%) rotate(-7deg) scale(0.96)",
                  opacity: 0,
                }
              : undefined
          }
        >
          <Card
            variant="glass"
            className={`relative overflow-hidden border-[rgb(var(--accent-soft))]/55 shadow-[0_30px_70px_-25px_rgba(123,115,253,0.55)] ${
              compact ? "p-4" : "p-5 sm:p-7"
            }`}
          >
            {/* Violet bloom — signals "this is the live card" */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
            >
              <span className="absolute inset-0 bg-[radial-gradient(120%_70%_at_0%_50%,rgba(123,115,253,0.22)_0%,transparent_60%)]" />
            </span>

            <div className="relative flex flex-wrap items-center justify-between gap-2 label-mono text-meta text-tertiary">
              <Link
                href={`/legacies/${encodeURIComponent(current.legacy.personId)}`}
                className="inline-flex items-center gap-2 rounded-full -mx-2 px-2 py-1 text-secondary hover:bg-white/6 hover:text-white active:bg-white/10 transition"
              >
                <span className="truncate capitalize text-white">
                  {current.legacy.deceasedName}
                </span>
                {!compact && (
                  <>
                    <span className="text-white/30">·</span>
                    <span className="capitalize">
                      {current.legacy.relationship}
                    </span>
                  </>
                )}
              </Link>
              {!compact && (
                <span>Source · {current.question.source.replace(/_/g, " ")}</span>
              )}
            </div>

            <p
              className={`relative serif leading-snug text-primary ${
                compact
                  ? "mt-3 text-title"
                  : "mt-5 text-headline sm:text-display"
              }`}
            >
              {current.question.text}
            </p>

            <div className={`relative ${compact ? "mt-3" : "mt-5"}`}>
              <Eyebrow>Your answer</Eyebrow>
              <Textarea
                ref={textareaRef}
                rows={compact ? 4 : 3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void save();
                  }
                }}
                placeholder={
                  compact
                    ? "What do you remember?"
                    : "A memory, a name, a story — anything you remember."
                }
                disabled={upsert.isPending || !!exitingId}
                className="mt-2"
              />
              {!compact && (
                <p className="mt-2 label-mono text-meta text-tertiary">
                  ⌘/Ctrl + Enter to save
                </p>
              )}
            </div>

            {localError && (
              <div className="relative mt-3">
                <ErrorBanner>{localError}</ErrorBanner>
              </div>
            )}

            <div className={`relative flex flex-wrap items-center justify-end gap-2 ${compact ? "mt-3" : "mt-5 gap-2.5"}`}>
              <Button
                variant="ghost"
                onClick={skip}
                disabled={upsert.isPending || !!exitingId}
              >
                Skip
              </Button>
              <Button
                onClick={() => void save()}
                disabled={upsert.isPending || !!exitingId}
              >
                {upsert.isPending && <Spinner />}
                {upsert.isPending ? "Saving…" : "Save answer"}
              </Button>
            </div>
          </Card>
        </div>

      </div>

      {/* The other open questions — listed below the active card, same
          stack pattern the Entities tab uses. Tap one to promote it to the
          active slot. */}
      {rest.length > 0 && (
        <div className={`${compact ? "mt-3 space-y-2" : "mt-5 space-y-2.5"}`}>
          <div className="px-1 label-mono text-meta text-tertiary">
            Up next · {rest.length}
          </div>
          {rest.map((p) => (
            <button
              key={p.question.id}
              type="button"
              onClick={() => setPinnedId(p.question.id)}
              className={`group relative block w-full overflow-hidden rounded-2xl border border-white/16 bg-[rgba(18,15,34,0.62)] text-left backdrop-blur-xl shadow-[0_18px_45px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color,transform] duration-300 hover:border-[rgb(var(--accent-soft))]/55 hover:bg-[rgba(28,22,52,0.78)] hover:shadow-[0_26px_50px_-22px_rgba(123,115,253,0.5)] active:scale-[0.985] active:duration-75 ${
                compact ? "p-3" : "p-4 sm:p-5"
              }`}
            >
              {/* Left accent bar slides in on hover — matches RowLink */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b from-transparent via-[rgb(var(--accent-soft))] to-transparent opacity-0 transition group-hover:opacity-100"
              />
              <div className="relative flex items-center justify-between gap-3 label-mono text-meta text-tertiary">
                <span className="truncate capitalize text-secondary">
                  {p.legacy.deceasedName}
                </span>
                <span className="shrink-0 opacity-0 transition group-hover:opacity-100 text-[rgb(var(--accent-soft))]">
                  Answer →
                </span>
              </div>
              <p
                className={`mt-2 serif text-primary ${
                  compact
                    ? "text-caption line-clamp-2"
                    : "text-title line-clamp-2"
                }`}
              >
                {p.question.text}
              </p>
            </button>
          ))}
        </div>
      )}

      <p className={`text-center label-mono text-meta text-tertiary ${compact ? "mt-3" : "mt-5"}`}>
        {rest.length === 0 ? "Last card." : "Tap any card to answer next."}
      </p>
    </div>
  );
}

