"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { AppHeader } from "../../components/AppHeader";
import { Avatar } from "../../components/Avatar";
import {
  Card,
  EmptyState,
  ErrorBanner,
  Eyebrow,
  PageLoader,
  PageShell,
  ScreenIntro,
  SectionHeading,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { qk, useLegacies, type Legacy } from "../../lib/queries";
import { legacyApi, type LegacyHeader } from "../../lib/api";

/* ────────────────────────────────────────────────────────────────────
   Rewards screen — Legacy Mode

   Per PRD §9.1, raw points (XP, credits) must never be shown to the
   user, and per §10 the *real* user-facing payoffs are the legacy
   outputs themselves: Story Book chapters (unlock at Level 5), Comic
   Strips (Level 7), and the Biopic / Biography (Level 10).

   This screen flattens every unlocked artifact across every legacy
   into one ledger — the user comes here to see what their storytelling
   has actually earned them, not to track per-person progress (that
   lives on the legacy profile itself).
   ──────────────────────────────────────────────────────────────────── */

type ArtifactKind = "story_book" | "comic_strip" | "biopic";

type Artifact = {
  kind: ArtifactKind;
  legacy: Legacy;
  unlockedAtLevel: number;
  /** Level the legacy is at right now. Always >= unlockedAtLevel for
   *  rows we render as "unlocked". */
  currentLevel: number;
};

type LockedArtifact = {
  kind: ArtifactKind;
  legacy: Legacy;
  requiredLevel: number;
  currentLevel: number;
  /** 0-1 fraction of the way from the previous unlock to this one. */
  progress: number;
};

const ARTIFACT_META: Record<
  ArtifactKind,
  { label: string; level: number; tagline: string; preview: string }
> = {
  story_book: {
    label: "Story Book",
    level: 5,
    tagline: "An illustrated chapter of their life.",
    preview:
      "A short, illustrated narrative drawn from the stories you've shared — designed to be read aloud to children and grandchildren.",
  },
  comic_strip: {
    label: "Comic Strip",
    level: 7,
    tagline: "A defining moment, as a comic.",
    preview:
      "A specific memorable moment — a funny story, a decision, a turning point — rendered as illustrated comic panels you can share.",
  },
  biopic: {
    label: "Biography",
    level: 10,
    tagline: "Their full life, as a biographical film.",
    preview:
      "An AI-produced documentary of their life with chapters for childhood, career, family, turning points, values, and legacy — built from every story and piece of media you've added.",
  },
};

const ARTIFACT_ORDER: ArtifactKind[] = ["story_book", "comic_strip", "biopic"];

/* Level derivation — STUB.
   The PRD describes Flashback Points (§9.1, backend only) feeding into
   a 1–10 profile level (§9.2). The backend doesn't expose either yet,
   so we derive a level client-side from signals we *do* have on the
   LegacyHeader: profile facts (depth of biographical detail) and the
   coverageState map (per-dimension richness). Replace this function in
   one place once the API ships profileLevel. */
function deriveLevel(header: LegacyHeader | null | undefined): number {
  if (!header) return 1;
  const facts = header.profileFacts?.length ?? 0;
  const coverage = header.coverageState ?? {};
  const gold = Object.values(coverage).filter((v) => v >= 0.66).length;
  const silver = Object.values(coverage).filter(
    (v) => v >= 0.33 && v < 0.66
  ).length;
  // Facts contribute up to +4, gold dimensions +1 each (up to +5),
  // silvers +0.5 each (up to +2). Floors to an integer level.
  const raw =
    1 +
    Math.min(4, Math.floor(facts / 3)) +
    Math.min(5, gold) +
    Math.min(2, silver * 0.5);
  return Math.max(1, Math.min(10, Math.floor(raw)));
}

function nextLockedFor(
  legacy: Legacy,
  level: number
): LockedArtifact | null {
  const nextKind = ARTIFACT_ORDER.find((k) => level < ARTIFACT_META[k].level);
  if (!nextKind) return null;
  const required = ARTIFACT_META[nextKind].level;
  const previous = ARTIFACT_ORDER.filter(
    (k) => ARTIFACT_META[k].level < required
  )
    .map((k) => ARTIFACT_META[k].level)
    .reduce((a, b) => Math.max(a, b), 0);
  const span = required - previous;
  const reached = Math.max(0, level - previous);
  const progress = span > 0 ? Math.min(1, reached / span) : 0;
  return {
    kind: nextKind,
    legacy,
    requiredLevel: required,
    currentLevel: level,
    progress,
  };
}

export default function RewardsPage() {
  const auth = useRequireAuth();
  const enabled = auth.status === "authenticated";

  const legaciesQ = useLegacies({ enabled, queryKey: ["legacies"] });
  const legacies = useMemo(
    () => legaciesQ.data?.legacies ?? [],
    [legaciesQ.data]
  );

  // Headers carry coverageState + profileFacts, which our level-derivation
  // helper reads. Fan out one query per legacy in parallel.
  const headerQs = useQueries({
    queries: legacies.map((l) => ({
      queryKey: qk.legacy(l.personId),
      queryFn: () => legacyApi.getLegacyHeader(l.personId).then((r) => r.item),
      staleTime: 60_000,
      enabled,
    })),
  });

  const byLegacy = useMemo(() => {
    return legacies.map((l, i) => {
      const header = headerQs[i]?.data ?? null;
      const level = deriveLevel(header);
      const unlocked: Artifact[] = ARTIFACT_ORDER.filter(
        (k) => level >= ARTIFACT_META[k].level
      ).map((k) => ({
        kind: k,
        legacy: l,
        unlockedAtLevel: ARTIFACT_META[k].level,
        currentLevel: level,
      }));
      return { legacy: l, level, header, unlocked };
    });
  }, [legacies, headerQs]);

  const unlocked = useMemo(
    () => byLegacy.flatMap((b) => b.unlocked),
    [byLegacy]
  );

  // Closest-to-unlock artifact across every legacy. The single most
  // motivating "next thing" — surfaced above the empty state so the
  // screen never feels barren when nothing's unlocked yet.
  const nextLocked = useMemo<LockedArtifact | null>(() => {
    const candidates = byLegacy
      .map((b) => nextLockedFor(b.legacy, b.level))
      .filter((x): x is LockedArtifact => x !== null);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.progress - a.progress);
    return candidates[0];
  }, [byLegacy]);

  const loading = legaciesQ.isLoading || headerQs.some((q) => q.isLoading);
  const error =
    legaciesQ.error instanceof Error
      ? legaciesQ.error.message
      : headerQs.find((q) => q.error instanceof Error)?.error instanceof Error
        ? (headerQs.find((q) => q.error)!.error as Error).message
        : null;

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <PageLoader />
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <AppHeader title="Rewards" />
      <ScreenIntro
        compact
        module="Rewards"
        meta={
          unlocked.length > 0
            ? `${unlocked.length.toString().padStart(2, "0")} unlocked`
            : undefined
        }
        title={{ top: "WHAT YOU'VE", accent: "EARNED." }}
        subtitle="Biographies and story books unlocked from the legacies you're building."
        accent="warm"
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {loading && unlocked.length === 0 ? (
        <PageLoader label="Looking for unlocked artifacts" />
      ) : (
        <div className="space-y-10">
          <section>
            <SectionHeading
              title="Unlocked"
              hint={
                unlocked.length > 0
                  ? "Each one stays here forever. Generation is enabled as the system is ready."
                  : undefined
              }
            />
            {unlocked.length === 0 ? (
              <EmptyState
                title="Nothing unlocked yet."
                hint="Story Books appear at Level 5 of any legacy. Biographies at Level 10. Keep telling their stories and they'll surface here."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {unlocked.map((a) => (
                  <UnlockedCard
                    key={`${a.legacy.personId}-${a.kind}`}
                    artifact={a}
                  />
                ))}
              </div>
            )}
          </section>

          {nextLocked && (
            <section>
              <SectionHeading
                title="Next up"
                hint="The closest unlock across all your legacies."
              />
              <NextLockedCard locked={nextLocked} />
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}

function UnlockedCard({ artifact }: { artifact: Artifact }) {
  const meta = ARTIFACT_META[artifact.kind];
  const accent =
    artifact.kind === "biopic"
      ? "halo-warm"
      : artifact.kind === "story_book"
        ? "halo-violet"
        : "halo-mint";

  return (
    <Link
      href={`/legacies/${encodeURIComponent(artifact.legacy.personId)}`}
      className="group block"
    >
      <Card
        halo={
          artifact.kind === "biopic"
            ? "warm"
            : artifact.kind === "story_book"
              ? "violet"
              : "mint"
        }
        className="press-soft relative h-full overflow-hidden p-5 transition-[border-color,box-shadow,transform] duration-300 group-hover:-translate-y-0.5 group-hover:border-[rgb(var(--accent-soft))]/55 group-hover:shadow-[0_30px_70px_-25px_rgba(123,115,253,0.55)]"
      >
        <div className="relative flex items-center gap-3">
          <Avatar
            name={artifact.legacy.deceasedName}
            imageUrl={artifact.legacy.referenceImageUrl}
            size={44}
            rounded="rounded-full"
          />
          <div className="min-w-0">
            <p className="truncate text-caption text-white">
              {artifact.legacy.deceasedName}
            </p>
            <p className="truncate label-mono text-meta capitalize text-tertiary">
              {artifact.legacy.relationship}
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-[rgb(var(--accent-soft))]/50 bg-[rgb(var(--accent-soft))]/12 px-2 py-0.5 label-mono text-meta text-[rgb(var(--accent-soft))]">
            Lv {artifact.currentLevel}
          </span>
        </div>

        <div className="relative mt-5 flex items-start gap-3">
          <ArtifactGlyph kind={artifact.kind} />
          <div className="min-w-0">
            <p className="display-sans text-headline leading-tight text-white">
              {meta.label}
            </p>
            <p className="mt-1 text-caption text-secondary">{meta.tagline}</p>
          </div>
        </div>

        <p className="relative mt-4 text-caption leading-relaxed text-secondary">
          {meta.preview}
        </p>

        <div className="relative mt-5 flex items-center justify-between">
          <span className="label-mono text-meta text-tertiary">
            Unlocked at Lv {artifact.unlockedAtLevel}
          </span>
          <span className="inline-flex items-center gap-1.5 label-mono text-meta text-[rgb(var(--accent-soft))]">
            Open legacy
            <span aria-hidden>→</span>
          </span>
        </div>
        <span aria-hidden className="sr-only">
          {accent}
        </span>
      </Card>
    </Link>
  );
}

function NextLockedCard({ locked }: { locked: LockedArtifact }) {
  const meta = ARTIFACT_META[locked.kind];
  const pct = Math.round(locked.progress * 100);

  return (
    <Link
      href={`/legacies/${encodeURIComponent(locked.legacy.personId)}`}
      className="group block"
    >
      <Card className="relative overflow-hidden p-5 transition-[border-color,box-shadow,transform] duration-300 group-hover:-translate-y-0.5 group-hover:border-[rgb(var(--accent-soft))]/55 group-hover:shadow-[0_30px_70px_-25px_rgba(123,115,253,0.55)] sm:p-6">
        <div className="relative flex items-center gap-3">
          <Avatar
            name={locked.legacy.deceasedName}
            imageUrl={locked.legacy.referenceImageUrl}
            size={48}
            rounded="rounded-full"
          />
          <div className="min-w-0">
            <p className="truncate text-caption text-white">
              {locked.legacy.deceasedName}
            </p>
            <p className="truncate label-mono text-meta capitalize text-tertiary">
              {locked.legacy.relationship}
            </p>
          </div>
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/4 px-2 py-0.5 label-mono text-meta text-secondary">
            <LockGlyph />
            Lv {locked.currentLevel} / {locked.requiredLevel}
          </span>
        </div>

        <div className="relative mt-5 flex items-start gap-3">
          <ArtifactGlyph kind={locked.kind} muted />
          <div className="min-w-0">
            <Eyebrow>Next unlock</Eyebrow>
            <p className="mt-1 display-sans text-headline leading-tight text-white">
              {meta.label}
            </p>
            <p className="mt-1 text-caption text-secondary">{meta.tagline}</p>
          </div>
        </div>

        <p className="relative mt-4 text-caption leading-relaxed text-secondary">
          {meta.preview}
        </p>

        <div className="relative mt-5">
          <div className="mb-1.5 flex items-center justify-between label-mono text-meta text-tertiary">
            <span>Progress to Lv {locked.requiredLevel}</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-linear-to-r from-[rgb(var(--accent))] to-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.6)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ArtifactGlyph({
  kind,
  muted = false,
}: {
  kind: ArtifactKind;
  muted?: boolean;
}) {
  const cls = muted
    ? "text-white/40"
    : kind === "biopic"
      ? "text-[rgb(var(--warm))]"
      : kind === "story_book"
        ? "text-[rgb(var(--accent-soft))]"
        : "text-[rgb(var(--mint))]";

  if (kind === "biopic") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`h-9 w-9 ${cls}`}>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 9.5l5 2.5-5 2.5v-5z"
          fill="currentColor"
        />
        <path
          d="M7 5v14M17 5v14"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="1.5 2"
          opacity="0.6"
        />
      </svg>
    );
  }
  if (kind === "story_book") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`h-9 w-9 ${cls}`}>
        <path
          d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 1-2-2V5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 0 2-2V5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M7 8h2M7 11h2M15 8h2M15 11h2"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-9 w-9 ${cls}`}>
      <rect
        x="3"
        y="4"
        width="8"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="13"
        y="4"
        width="8"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3"
        y="13"
        width="18"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
      <rect
        x="5"
        y="11"
        width="14"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
