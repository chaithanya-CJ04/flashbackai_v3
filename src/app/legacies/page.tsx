"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { AppHeader } from "../components/AppHeader";
import { Avatar } from "../components/Avatar";
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
        A private archive for the people who shaped you. Drag to browse, tap
        a portrait to step into their story.
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────
   HomeBody — the section below the hero. Two acts, always in the same
   order:

     1. Curved portrait deck (full-bleed) — the people you've added.
     2. QuestionConstellation (full-width) — every open question across
        every onboarded legacy, surfaced as a fanned hero card plus a
        horizontal rail of every remaining thread. Only renders when at
        least one open question exists.
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

  // The home is always two acts now: portrait deck on top (full-bleed) →
  // magical Question Constellation below. The constellation pulls every
  // open question across every onboarded legacy into a single deck — same
  // depth the workshop's Questions tab exposes — so the home no longer
  // looks "limited" relative to a single person's inbox.
  return (
    <>
      <HomeHero count={legacies.length} />

      {!hasQuestions && anyLoading && (
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

      {hasQuestions && (
        <section className="mt-14 sm:mt-20">
          <QuestionConstellation stack={stack} />
        </section>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────
   QuestionConstellation — full-width "every open question across every
   legacy" showcase that lives directly under the portrait deck.
   ────────────────────────────────────────────────────────────────────
   Centre-stage: the active question on a large hero card, with the
   answering legacy's portrait + name chip and a generous answer field.

   Flanking the hero on wide screens: up to four PEEK cards fanned out
   in 3D — they bob gently, blur softly, and tilt so the deck reads as
   alive, not stamped. Each peek card is tappable to promote it to the
   centre.

   Underneath: a horizontal *all-questions rail* that lists every
   remaining open question as a portrait-tagged tile, scrollable. That
   rail is the answer to "show them all" — every open thread from every
   person is one swipe away. */

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

function QuestionConstellation({
  stack,
}: {
  stack: Array<{ question: LegacyQuestion; legacy: Legacy }>;
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
      {/* Header strip — eyebrow + counter + progress bar. On narrow
          screens we drop the "across the archive" suffix so the row stays
          on one line and doesn't compete with the counter for room. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 label-mono text-meta text-tertiary">
          <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-soft))]/40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.9)]" />
          </span>
          <span className="truncate">Open threads</span>
          <span className="text-white/20">/</span>
          <span className="truncate tabular-nums">
            {totalCount.toString().padStart(2, "0")}
            <span className="hidden sm:inline"> across the archive</span>
          </span>
        </div>
        <span className="shrink-0 label-mono text-meta text-secondary tabular-nums">
          {answeredThisSession + 1}/{totalCount}
        </span>
      </div>

      <div className="mb-8 h-1 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-linear-to-r from-[rgb(var(--accent))] to-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.6)] transition-[width] duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* The stage — relative wrapper so the ambient backdrop can sit
          behind the active card without disturbing its flow.
          overflow-hidden + isolate prevents the negative-inset ambient
          gradient below from spilling past the viewport edge (which on
          mobile was creating horizontal overflow and bumping fixed
          elements like the BottomNav off-axis). */}
      <div className="relative isolate mx-auto w-full max-w-3xl overflow-hidden rounded-3xl">
        {/* Ambient backdrop — soft violet bloom + a sprinkle of twinkling
            stars, purely decorative. Sits behind everything. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_50%,rgba(123,115,253,0.20)_0%,transparent_70%)]" />
          <span className="twinkle absolute left-[8%] top-[14%] block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.9)]" />
          <span className="twinkle-d1 absolute right-[10%] top-[20%] block h-1 w-1 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <span className="twinkle-d2 absolute left-[18%] bottom-[14%] block h-1 w-1 rounded-full bg-[rgb(var(--warm))]/80 shadow-[0_0_8px_rgba(240,200,154,0.8)]" />
          <span className="twinkle-d3 absolute right-[16%] bottom-[20%] block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_10px_rgba(123,115,253,0.9)]" />
        </div>

        {/* Centre stage — the active hero card. We wrap with a deeply
            opaque inner layer below the glass so the busy hex-grid
            background never reads through the question text. */}
        <div
          key={current.question.id}
          className="relative z-10 card-forward transition-[transform,opacity] duration-300 ease-out"
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
            className="relative overflow-hidden border-[rgb(var(--accent-soft))]/55 bg-[rgba(10,8,22,0.94)] p-5 shadow-[0_40px_90px_-30px_rgba(123,115,253,0.55)] sm:p-8"
          >
            {/* Inner violet bloom — keeps the hero card warm. */}
            <span aria-hidden className="pointer-events-none absolute inset-0">
              <span className="absolute inset-0 bg-[radial-gradient(120%_70%_at_0%_50%,rgba(123,115,253,0.22)_0%,transparent_60%)]" />
              <span className="absolute inset-0 bg-[radial-gradient(60%_50%_at_100%_0%,rgba(240,200,154,0.12)_0%,transparent_70%)]" />
            </span>

            {/* Person + source row. The avatar+name reads as a chip you
                can tap to enter the workshop without leaving the deck. */}
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/legacies/${encodeURIComponent(current.legacy.personId)}`}
                className="group inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/4 px-2.5 py-1.5 transition hover:border-[rgb(var(--accent-soft))]/55 hover:bg-white/8 active:scale-[0.985]"
              >
                <Avatar
                  name={current.legacy.deceasedName}
                  imageUrl={current.legacy.referenceImageUrl}
                  size={32}
                  rounded="rounded-full"
                />
                <span className="flex min-w-0 flex-col leading-tight pr-2">
                  <span className="truncate text-caption text-white">
                    {current.legacy.deceasedName}
                  </span>
                  <span className="truncate label-mono text-meta capitalize text-tertiary">
                    {current.legacy.relationship}
                  </span>
                </span>
              </Link>
              <span className="label-mono text-meta text-tertiary">
                Source · {current.question.source.replace(/_/g, " ")}
              </span>
            </div>

            <p className="relative mt-6 serif text-headline leading-snug text-primary sm:text-display">
              {current.question.text}
            </p>

            <div className="relative mt-6">
              <Eyebrow>Your answer</Eyebrow>
              <Textarea
                ref={textareaRef}
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void save();
                  }
                }}
                placeholder="A memory, a name, a story, anything you remember."
                disabled={upsert.isPending || !!exitingId}
                className="mt-2"
              />
              <p className="mt-2 label-mono text-meta text-tertiary">
                ⌘/Ctrl + Enter to save
              </p>
            </div>

            {localError && (
              <div className="relative mt-3">
                <ErrorBanner>{localError}</ErrorBanner>
              </div>
            )}

            <div className="relative mt-6 flex flex-wrap items-center justify-end gap-2.5">
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

      {/* Every other open question — horizontal rail. Each tile is
          portrait-tagged so the home reads as "all the threads, from
          everyone, in one place" — the workshop's depth, surfaced. */}
      {rest.length > 0 && (
        <div className="mt-10 sm:mt-12">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 label-mono text-meta text-tertiary">
              <span>Every open thread</span>
              <span className="text-white/20">/</span>
              <span className="tabular-nums">{rest.length.toString().padStart(2, "0")}</span>
            </div>
            <span className="label-mono text-meta text-tertiary">
              Tap to answer
            </span>
          </div>
          <div className="scroll-fade-x -mx-4 sm:-mx-6 md:-mx-8">
            <div className="no-scrollbar flex snap-x snap-proximity items-stretch gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-6 md:px-8">
              {rest.map((p, i) => (
                <QuestionTile
                  key={p.question.id}
                  p={p}
                  index={i}
                  onClick={() => setPinnedId(p.question.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-center label-mono text-meta text-tertiary">
        {rest.length === 0 ? "Last card." : "Drag the rail · tap a card to bring it centre-stage."}
      </p>
    </div>
  );
}

/* Question tile for the horizontal rail. The rail is the "browseable
   inventory" — every remaining open question across every onboarded
   legacy, scrollable in one place. Portrait-led so a glance tells you
   which person you'd be answering for. */
function QuestionTile({
  p,
  index,
  onClick,
}: {
  p: { question: LegacyQuestion; legacy: Legacy };
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="rise-in group relative w-[78vw] max-w-[18rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/20 bg-[rgba(10,8,22,0.94)] p-4 text-left backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-[border-color,box-shadow,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-soft))]/55 hover:bg-[rgba(18,14,38,0.96)] hover:shadow-[0_40px_80px_-25px_rgba(123,115,253,0.55)] active:scale-[0.985] sm:w-88"
    >
      {/* Left-edge accent — slides in on hover, matches RowLink. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 h-12 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b from-transparent via-[rgb(var(--accent-soft))] to-transparent opacity-0 transition group-hover:opacity-100"
      />
      <div className="relative flex items-center gap-3">
        <Avatar
          name={p.legacy.deceasedName}
          imageUrl={p.legacy.referenceImageUrl}
          size={36}
          rounded="rounded-full"
        />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-caption text-white">
            {p.legacy.deceasedName}
          </span>
          <span className="truncate label-mono text-meta capitalize text-tertiary">
            {p.legacy.relationship}
            <span className="mx-1.5 text-white/20">·</span>
            {p.question.source.replace(/_/g, " ")}
          </span>
        </div>
        <span className="shrink-0 opacity-0 transition group-hover:opacity-100 label-mono text-meta text-[rgb(var(--accent-soft))]">
          →
        </span>
      </div>
      <p className="relative mt-3 serif text-title leading-snug text-primary line-clamp-3">
        {p.question.text}
      </p>
    </button>
  );
}

