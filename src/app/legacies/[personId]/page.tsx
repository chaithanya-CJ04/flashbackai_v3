"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/AppHeader";
import { Avatar } from "../../components/Avatar";
import { DeckRail } from "../../components/DeckRail";
import { MomentViewer, type ViewerMoment } from "../../components/MomentViewer";
import TiltedCard from "../../components/TiltedCard";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  EntityMedia,
  ErrorBanner,
  Eyebrow,
  Input,
  PageLoader,
  PageShell,
  RowLink,
  SectionHeading,
  Spinner,
  ThemeIcon,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { usePostWrapPoll } from "../../hooks/usePostWrapPoll";
import {
  useApproveMerge,
  useEntities,
  useIdentityMerges,
  useLegacies,
  useLegacyHeader,
  useLegacyQuestions,
  useLegacySessions,
  useMoments,
  useOpenConversationFor,
  useProfileFacts,
  useRejectMerge,
  useScanIdentityMerges,
  useStartSession,
  useThemeMoments,
  useThemes,
  useThreads,
  useTraits,
  useUpsertProfileFact,
} from "../../lib/queries";
import type { ProfileFact, Theme } from "../../lib/api";

// ---------- Tab IDs preserved under the Workshop drawer ----------

type TabId =
  | "sessions"
  | "entities"
  | "threads"
  | "facts"
  | "questions"
  | "traits"
  | "merges";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "sessions", label: "Conversations" },
  { id: "entities", label: "Entities" },
  { id: "threads", label: "Threads" },
  { id: "facts", label: "Facts" },
  { id: "questions", label: "Questions" },
  { id: "traits", label: "Traits" },
  { id: "merges", label: "Merges" },
];

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

export default function LegacyDetailPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = use(params);
  const auth = useRequireAuth();

  // Picks up the schedule armed by the session page after a wrap and
  // keeps moments/entities/themes refreshing every 5s for 2 minutes,
  // toasting any genuinely new items so the user notices.
  usePostWrapPoll(personId);

  const headerQ = useLegacyHeader(personId);

  // Detail endpoint's `imageUrl` is often null; list endpoint exposes
  // `referenceImageUrl` for the same person. Fall back to that.
  const legaciesQ = useLegacies();
  const listEntry = legaciesQ.data?.legacies.find(
    (l) => l.personId === personId
  );

  // Badge selection drives the gallery filter (PRD §11.3).
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <PageLoader label="Opening" />
      </PageShell>
    );
  }

  const header = headerQ.data;

  return (
    <PageShell wide>
      <AppHeader back="/legacies" title={header?.name} />

      {headerQ.isError && (
        <div className="mb-6">
          <ErrorBanner>
            {headerQ.error instanceof Error
              ? headerQ.error.message
              : "Failed to load legacy."}
          </ErrorBanner>
        </div>
      )}

      {!header ? (
        <PageLoader label="Loading" />
      ) : (
        <div className="pb-32">
          {/* Section 1/5 — Profile (PRD §6 row 1).
              Avatar with phase badge top-right. The PRD asks for a 1–10
              numeric level here; backend currently exposes `phase` (string).
              When backend ships `level: number`, swap the badge contents. */}
          <ProfileSection
            name={header.name}
            relationship={header.relationship}
            imageUrl={header.imageUrl ?? listEntry?.referenceImageUrl ?? null}
            thumbnailUrl={header.thumbnailUrl}
            phaseLabel={header.phase}
            profileSummary={header.profileSummary}
          />

          {/* Section 2/5 — Primary action: start or continue talking.
              Previously hidden behind a low-contrast bottom chat-bar that
              overlapped the BottomNav and was unusable for older users.
              Replaced with a big, obvious CTA card. */}
          <ConversationCTA
            personId={personId}
            personName={header.name}
          />

          {/* Section 3/5 — Badges strip (PRD §8). */}
          <BadgesSection
            personId={personId}
            selectedThemeId={selectedThemeId}
            onSelect={setSelectedThemeId}
          />

          {/* Sections 4 & 5 — Unified gallery (PRD §11).
              Backend currently only exposes AI-generated moments, not
              user-uploaded media. We render moments here and filter via
              listThemeMoments when a badge is tapped. Uploaded-media half
              of §11 lands when the upload + linking endpoints exist. */}
          <GallerySection
            personId={personId}
            selectedThemeId={selectedThemeId}
          />

          {/* Existing power-user surfaces preserved below — sessions list,
              entities, threads, facts, questions, traits, identity merges.
              Collapsed by default so the PRD layout reads cleanly. */}
          <WorkshopSection personId={personId} headerFacts={header.profileFacts ?? []} />
        </div>
      )}
    </PageShell>
  );
}

// ---------- Section 1: Profile ----------

function ProfileSection({
  name,
  relationship,
  imageUrl,
  thumbnailUrl,
  phaseLabel,
  profileSummary,
}: {
  name: string;
  relationship: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  phaseLabel: string;
  profileSummary: string | null;
}) {
  return (
    <section className="mb-8">
      <Card halo="violet" className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
        <div className="relative shrink-0">
          <Avatar
            name={name}
            imageUrl={imageUrl}
            thumbnailUrl={thumbnailUrl}
            size={112}
          />
          {/* Level badge top-right of avatar (PRD §6 row 1, §9.2).
              Until backend exposes a 1–10 level, render the `phase` string. */}
          {phaseLabel && (
            <span
              className="absolute -right-1 -top-1 rounded-full border border-[rgb(var(--accent-soft))]/55 bg-[rgb(var(--accent))]/25 px-2 py-1 label-mono text-meta text-white backdrop-blur"
              title="Profile phase"
            >
              {phaseLabel}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="label-mono text-meta text-tertiary">
            {relationship}
          </div>
          <p className="display-sans text-headline mt-1.5 truncate leading-[1.05] text-white">
            {name}
          </p>
          {profileSummary && (
            <p className="text-caption mt-1.5 line-clamp-2 leading-relaxed text-secondary">
              {profileSummary}
            </p>
          )}
        </div>
      </Card>
    </section>
  );
}

// ---------- Section 2: Conversation CTA ----------

/** Big, obvious "Talk about {name}" card sitting right under the profile.
 *  The primary action of this screen for the target audience (memory care,
 *  older users) — never hidden behind an input bar or workshop drawer. */
function ConversationCTA({
  personId,
  personName,
}: {
  personId: string;
  personName: string;
}) {
  const router = useRouter();
  const sessionsQ = useLegacySessions(personId);
  const startSession = useStartSession(personId);
  const [error, setError] = useState<string | null>(null);

  const sessions = sessionsQ.data ?? [];
  const openSession = sessions.find((s) => s.status === "open");
  const sorted = [...sessions].sort((a, b) => {
    const at = new Date(a.lastTurnAt || a.openedAt).getTime();
    const bt = new Date(b.lastTurnAt || b.openedAt).getTime();
    return bt - at;
  });
  const lastSession = sorted[0];
  const totalCount = sessions.length;
  const firstName = personName.split(/\s+/)[0] || personName;

  const isContinuing = !!openSession;
  const hasPast = !openSession && totalCount > 0;

  const label = isContinuing
    ? `Continue talking about ${firstName}`
    : hasPast
      ? `Talk about ${firstName} again`
      : `Begin talking about ${firstName}`;

  const subtitle = isContinuing
    ? `Conversation in progress${
        openSession.lastTurnAt
          ? ` · last reply ${relativeTime(openSession.lastTurnAt)}`
          : ""
      }`
    : hasPast
      ? `${totalCount} conversation${totalCount === 1 ? "" : "s"} so far · last ${relativeTime(lastSession.lastTurnAt || lastSession.openedAt)}`
      : "This will be your first chat together.";

  const handleClick = async () => {
    setError(null);
    try {
      if (openSession) {
        router.push(
          `/legacies/${encodeURIComponent(personId)}/sessions/${encodeURIComponent(
            openSession.sessionId
          )}`
        );
        return;
      }
      const res = await startSession.mutateAsync();
      router.push(
        `/legacies/${encodeURIComponent(personId)}/sessions/${encodeURIComponent(
          res.sessionId
        )}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the conversation.");
    }
  };

  const pending = startSession.isPending;

  return (
    <section className="mb-8 flex flex-col items-center text-center">
      {error && (
        <div className="mb-3 w-full">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={pending || sessionsQ.isLoading}
        aria-label={label}
        className="cta-pill text-caption px-5 py-2.5"
      >
        <span className="inline-flex items-center gap-2">
          {pending ? (
            <Spinner className="h-4 w-4" />
          ) : isContinuing ? (
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-300/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <path
                d="M8 10h8M8 13h5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          )}
          <span className="font-medium">{label}</span>
        </span>
      </button>
      <p className="mt-2 label-mono text-meta tracking-[0.18em] text-tertiary">
        {subtitle}
      </p>
    </section>
  );
}

// ---------- Section 3: Badges ----------

type TierVisual = {
  // Border + small-element fill (used on the inner tier emblem)
  ring: string;
  // Outer-tile surface: dark glass tinted toward the tier color so the badge
  // holds shape against the animated hex background.
  surface: string;
  // tier label color
  label: string;
};

function tierVisual(tier: string | null): TierVisual {
  const t = (tier || "").toLowerCase();
  if (t.includes("gold"))
    return {
      ring: "border-amber-300/70 bg-amber-400/15",
      surface: "border-amber-300/55 bg-[rgba(48,32,12,0.62)]",
      label: "text-amber-200",
    };
  if (t.includes("silver"))
    return {
      ring: "border-slate-200/60 bg-slate-200/10",
      surface: "border-slate-200/45 bg-[rgba(28,28,38,0.62)]",
      label: "text-slate-100",
    };
  if (t.includes("bronze"))
    return {
      ring: "border-orange-400/60 bg-orange-500/12",
      surface: "border-orange-400/50 bg-[rgba(46,24,12,0.62)]",
      label: "text-orange-200",
    };
  // No tier yet — bronze-just-touched visual is reserved for actual bronze
  // (see PRD §8.2). Untiered themes render as a dim outline.
  return {
    ring: "border-white/12 bg-white/3",
    surface: "border-white/22 bg-[rgba(18,15,34,0.82)]",
    label: "text-tertiary",
  };
}

/** Hex-shaped sigil for a theme badge. The hex echoes the app's hex-grid
 *  background motif and reads as a sealed artifact when locked (dashed
 *  stroke + tiny lock seal at the lower-right corner). Unlocked variants
 *  use a solid stroke and inherit the tier color via the wrapping pill. */
function HexSigil({
  locked,
  iconNode,
  tone,
}: {
  locked: boolean;
  iconNode: React.ReactNode;
  tone: { fill: string; stroke: string; dashed: boolean };
}) {
  // Flat-top hexagon points in a 44×44 viewBox, leaving 2-3px headroom for
  // the stroke so it doesn't clip on Retina.
  const pts = "22,3 39.3,12.6 39.3,31.4 22,41 4.7,31.4 4.7,12.6";
  return (
    <span aria-hidden className="relative block h-11 w-11 shrink-0">
      <svg
        viewBox="0 0 44 44"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* Inner faint hatch — sealed-glass feel when locked. Drawn only
            once via a single line set rotated diagonally; clipped to the
            hex with a polygon mask so it stays inside the frame. */}
        {locked && (
          <>
            <defs>
              <clipPath id="hex-clip">
                <polygon points={pts} />
              </clipPath>
            </defs>
            <g clipPath="url(#hex-clip)" opacity="0.35">
              {Array.from({ length: 9 }).map((_, i) => (
                <line
                  key={i}
                  x1={-10 + i * 8}
                  y1={-2}
                  x2={-10 + i * 8 + 44}
                  y2={50}
                  stroke="rgba(180,173,255,0.18)"
                  strokeWidth="0.6"
                />
              ))}
            </g>
          </>
        )}
        <polygon
          points={pts}
          fill={tone.fill}
          stroke={tone.stroke}
          strokeWidth="1"
          strokeDasharray={tone.dashed ? "3 3" : undefined}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        {iconNode}
      </span>
      {locked && (
        <span className="absolute -bottom-0.5 -right-0.5 grid h-[15px] w-[15px] place-items-center rounded-full border border-white/30 bg-black text-[rgb(var(--accent-soft))] shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="6" width="6" height="4.5" rx="0.8" />
            <path d="M4.2 6V4.6a1.8 1.8 0 0 1 3.6 0V6" />
          </svg>
        </span>
      )}
    </span>
  );
}

function BadgesSection({
  personId,
  selectedThemeId,
  onSelect,
}: {
  personId: string;
  selectedThemeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const q = useThemes(personId);
  const router = useRouter();

  // Surface unlocked themes first, then any with a tier, then the rest.
  const themes: Theme[] = useMemo(() => {
    const all = q.data ?? [];
    const score = (t: Theme) =>
      (t.state === "unlocked" ? 100 : 0) + (t.tier ? 10 : 0) + t.qualifyingCount;
    return [...all].sort((a, b) => score(b) - score(a));
  }, [q.data]);

  if (q.isLoading) {
    return (
      <section className="mb-8">
        <SectionHeading title="Badges" hint="Loading…" />
      </section>
    );
  }

  if (themes.length === 0) {
    return (
      <section className="mb-8">
        <SectionHeading
          title="Badges"
          hint="Share stories to start filling out the dimensions of their life."
        />
      </section>
    );
  }

  return (
    <section className="mb-8">
      <SectionHeading
        title="Badges"
        hint={
          selectedThemeId
            ? "Showing moments tied to the selected badge. Tap again to clear."
            : "Tap a badge to filter the gallery."
        }
        action={
          selectedThemeId ? (
            <button
              className="label-mono text-meta text-secondary hover:text-white"
              onClick={() => onSelect(null)}
            >
              Clear filter
            </button>
          ) : null
        }
      />

      <div
        className="no-scrollbar -mx-4 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
        }}
      >
        {themes.map((t) => {
          const active = selectedThemeId === t.id;
          // A theme is "truly locked" only when it has zero qualifying
          // moments. If qualifyingCount > 0 the gallery filter already
          // works against it, so labelling it LOCKED is misleading — it
          // reads as functionally unlocked even if the backend state
          // hasn't flipped to "unlocked" yet.
          const trulyLocked = t.state === "locked" && t.qualifyingCount === 0;
          const vis = tierVisual(t.tier);
          const subtitle = trulyLocked
            ? "LOCKED"
            : t.tier
              ? `${t.tier.toUpperCase()} · ${t.qualifyingCount}`
              : `${t.qualifyingCount} MOMENT${t.qualifyingCount === 1 ? "" : "S"}`;
          // Truly-locked badges route to the theme detail page where the
          // archetype unlock questions live. Anything with moments toggles
          // the gallery filter inline.
          const handleClick = () => {
            if (trulyLocked) {
              router.push(
                `/legacies/${encodeURIComponent(personId)}/themes/${encodeURIComponent(t.id)}`
              );
              return;
            }
            onSelect(active ? null : t.id);
          };
          return (
            <button
              key={t.id}
              onClick={handleClick}
              aria-label={
                trulyLocked
                  ? `Unlock ${t.displayName}`
                  : active
                    ? `Clear ${t.displayName} filter`
                    : `Filter by ${t.displayName}`
              }
              className={`group relative shrink-0 snap-start overflow-hidden rounded-2xl border px-3.5 py-3 text-left backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color,transform] duration-300 active:scale-[0.98] ${
                active
                  ? "border-[rgb(var(--accent-soft))]/65 bg-[rgba(60,46,110,0.7)] shadow-[0_30px_60px_-20px_rgba(123,115,253,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                  : `${vis.surface} hover:border-[rgb(var(--accent-soft))]/45 hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]`
              }`}
            >
              {/* Top hairline gleam */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/22 to-transparent"
              />
              {trulyLocked && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-[rgb(var(--accent-soft))]/8 blur-2xl"
                />
              )}
              <div className="relative flex items-center gap-3">
                <HexSigil
                  locked={trulyLocked}
                  iconNode={
                    <ThemeIcon
                      slug={t.slug}
                      name={t.displayName}
                      size={18}
                      className={
                        trulyLocked
                          ? "text-[rgb(var(--accent-soft))]/70"
                          : vis.label
                      }
                    />
                  }
                  tone={
                    trulyLocked
                      ? {
                          fill: "rgba(123,115,253,0.08)",
                          stroke: "rgba(180,173,255,0.38)",
                          dashed: false,
                        }
                      : {
                          fill: "rgba(123,115,253,0.10)",
                          stroke: "rgba(180,173,255,0.55)",
                          dashed: false,
                        }
                  }
                />
                <div className="min-w-0">
                  <p
                    className={`max-w-40 truncate text-caption ${
                      trulyLocked ? "text-secondary" : "text-primary"
                    }`}
                  >
                    {t.displayName}
                  </p>
                  <p
                    className={`mt-1 label-mono text-meta ${
                      trulyLocked
                        ? "text-[rgb(var(--accent-soft))]/70"
                        : "text-tertiary"
                    }`}
                  >
                    {subtitle}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------- Section 4–5: Gallery ----------

function momentImageSrc(m: { title?: string; narrative: string; thumbnailUrl?: string | null }): string {
  if (m.thumbnailUrl && /^https?:\/\//i.test(m.thumbnailUrl)) {
    return m.thumbnailUrl;
  }
  const seed = (m.title || m.narrative.slice(0, 40)).replace(/[<>&"']/g, "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#7B73FD'/>
        <stop offset='55%' stop-color='#5046D2'/>
        <stop offset='100%' stop-color='#1A1238'/>
      </linearGradient>
    </defs>
    <rect width='800' height='600' fill='url(#g)'/>
    <text x='400' y='320' text-anchor='middle' font-family='system-ui,sans-serif' font-size='42' font-weight='700' fill='white' opacity='0.85'>${seed.slice(0, 28)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function GallerySection({
  personId,
  selectedThemeId,
}: {
  personId: string;
  selectedThemeId: string | null;
}) {
  const allMoments = useMoments(personId);
  const themeMoments = useThemeMoments(personId, selectedThemeId ?? "");

  const items: ViewerMoment[] = useMemo(() => {
    if (selectedThemeId) {
      return (themeMoments.data ?? []) as ViewerMoment[];
    }
    return (allMoments.data ?? []) as ViewerMoment[];
  }, [selectedThemeId, themeMoments.data, allMoments.data]);

  const isLoading = selectedThemeId
    ? themeMoments.isLoading
    : allMoments.isLoading;
  const isError = selectedThemeId ? themeMoments.isError : allMoments.isError;
  const error = selectedThemeId ? themeMoments.error : allMoments.error;

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <section className="mb-8">
      <SectionHeading
        title="Gallery"
        hint={
          selectedThemeId
            ? "Filtered by the selected badge."
            : "Flashbacks and moments from their life."
        }
      />

      {isError ? (
        <ErrorBanner>
          {error instanceof Error ? error.message : "Failed to load gallery."}
        </ErrorBanner>
      ) : isLoading ? (
        <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
          <Spinner /> Loading
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={
            selectedThemeId
              ? "Nothing tagged to this badge yet."
              : "No moments captured yet."
          }
          hint={
            selectedThemeId
              ? "Try another badge, or share more stories below to deepen this one."
              : "Stories shared in conversations crystallise into moments here."
          }
        />
      ) : (
        <>
          <DeckRail>
            {items.map((m, i) => {
              const hasVideo =
                !!m.videoUrl &&
                (/^https?:\/\//i.test(m.videoUrl) || m.videoUrl.startsWith("/"));
              return (
                <div key={m.id} className="shrink-0 snap-center">
                  <TiltedCard
                    imageSrc={momentImageSrc(m)}
                    altText={m.title || "Moment"}
                    captionText={m.title || "Moment"}
                    containerHeight="clamp(340px, 65vw, 460px)"
                    containerWidth="clamp(260px, 72vw, 360px)"
                    imageHeight="clamp(340px, 65vw, 460px)"
                    imageWidth="clamp(260px, 72vw, 360px)"
                    rotateAmplitude={12}
                    scaleOnHover={1.05}
                    displayOverlayContent
                    onClick={() => setViewerIndex(i)}
                    overlayContent={
                      <div className="relative flex h-full w-full flex-col justify-between rounded-[18px] p-4 sm:p-5">
                        <div className="flex items-start justify-between">
                          <span className="rounded-full bg-black/55 px-2 py-0.5 label-mono text-meta text-primary backdrop-blur">
                            {String(i + 1).padStart(3, "0")}
                          </span>
                          {hasVideo && (
                            <span
                              aria-hidden
                              className="grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-black/55 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4 translate-x-px"
                                fill="currentColor"
                              >
                                <path d="M8 5.5v13l11-6.5L8 5.5z" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="rounded-2xl bg-black/55 p-3 text-left backdrop-blur sm:p-4">
                          {m.title && (
                            <p className="display-sans text-title text-white">
                              {m.title}
                            </p>
                          )}
                          <p className="mt-1.5 line-clamp-2 text-caption leading-relaxed text-secondary">
                            {m.narrative}
                          </p>
                          {m.createdAt && (
                            <p className="mt-2 label-mono text-meta text-tertiary">
                              {relativeTime(m.createdAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    }
                  />
                </div>
              );
            })}
          </DeckRail>

          <p className="mt-2 text-center label-mono text-meta text-tertiary">
            Swipe · scroll · tap to open
          </p>
        </>
      )}

      {viewerIndex !== null && (
        <MomentViewer
          moments={items}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNavigate={(i) => setViewerIndex(i)}
        />
      )}
    </section>
  );
}

// ---------- Workshop: preserved tab data, expanded by default ----------
//
// We persist the user's collapse choice in localStorage so anyone who
// deliberately hides it stays hidden across navigations. Default state for
// fresh sessions / first visits is OPEN — the tab data (Conversations,
// Entities, Threads, …) is core to the experience and shouldn't sit behind
// a click.

const WORKSHOP_KEY = "flashback:workshop-open";

function WorkshopSection({
  personId,
  headerFacts,
}: {
  personId: string;
  headerFacts: ProfileFact[];
}) {
  const [open, setOpen] = useState(true);
  // Rehydrate the user's prior choice on mount — only flips to closed if
  // they previously hid it. Avoids SSR hydration mismatch by reading after
  // first paint.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(WORKSHOP_KEY);
      if (stored === "0") setOpen(false);
    } catch {}
  }, []);
  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(WORKSHOP_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };
  const [tab, setTab] = useState<TabId>("sessions");
  const router = useRouter();
  const startSession = useStartSession(personId);

  const onStartFullSession = async () => {
    try {
      const res = await startSession.mutateAsync();
      router.push(
        `/legacies/${encodeURIComponent(personId)}/sessions/${encodeURIComponent(
          res.sessionId
        )}`
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start session.");
    }
  };

  return (
    <section className="mt-4">
      <button
        onClick={toggle}
        aria-expanded={open}
        className={`group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border p-4 text-left backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-300 active:scale-[0.995] active:duration-75 ${
          open
            ? // Highlighted (open) — accent-violet border, brand bloom, brighter inset
              "border-[rgb(var(--accent-soft))]/55 bg-[rgba(36,28,68,0.78)] shadow-[0_30px_60px_-20px_rgba(123,115,253,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:bg-[rgba(42,32,80,0.85)]"
            : // Collapsed — quieter dark glass, same surface as RowLink
              "border-white/22 bg-[rgba(18,15,34,0.82)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.10)] hover:border-[rgb(var(--accent-soft))]/60 hover:bg-[rgba(28,22,52,0.88)] hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5),inset_0_1px_0_0_rgba(255,255,255,0.14)]"
        }`}
      >
        {/* Violet radial wash — always present when open, fades in on hover when closed */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
            open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_50%,rgba(123,115,253,0.28)_0%,transparent_60%)]" />
        </span>
        {/* Top sheen — brighter when open */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent transition ${
            open ? "via-[rgba(200,170,255,0.7)]" : "via-white/25 group-hover:via-[rgba(200,170,255,0.6)]"
          } to-transparent`}
        />
        {/* Left accent bar — visible when open, signals "active section" */}
        <span
          aria-hidden
          className={`pointer-events-none absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b from-transparent via-[rgb(var(--accent-soft))] to-transparent transition ${
            open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />

        <span className="relative flex min-w-0 items-center gap-3">
          {/* Pulsing live dot — brand "this is the active workspace" signifier */}
          <span
            aria-hidden
            className={`relative inline-flex h-1.5 w-1.5 shrink-0 ${open ? "" : "opacity-60"}`}
          >
            {open && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-soft))]/50" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.9)]" />
          </span>
          <span className="min-w-0">
            <span
              className={`label-mono text-meta ${
                open ? "text-white" : "text-secondary"
              }`}
            >
              Workshop
            </span>
            <p
              className={`mt-1 text-caption ${
                open ? "text-primary" : "text-secondary"
              }`}
            >
              Conversations, entities, threads, facts, questions, traits, merges.
            </p>
          </span>
        </span>

        <span
          aria-hidden
          className={`relative shrink-0 rounded-full border px-2.5 py-1 label-mono text-meta transition ${
            open
              ? "border-[rgb(var(--accent-soft))]/55 bg-[rgb(var(--accent))]/25 text-white"
              : "border-white/20 bg-white/4 text-tertiary group-hover:text-white"
          }`}
        >
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div className="mt-5">
          <div className="-mx-4 mb-6 sm:-mx-6">
            <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 sm:px-6">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 label-mono text-meta transition ${
                      active
                        ? "border-[rgb(var(--accent-soft))]/45 bg-[rgb(var(--accent))]/18 text-white"
                        : "border-white/10 bg-white/2 text-tertiary hover:border-white/25 hover:text-white/80"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="min-h-[200px]">
            {tab === "sessions" && (
              <SessionsTab personId={personId} onStart={() => void onStartFullSession()} />
            )}
            {tab === "entities" && <EntitiesTab personId={personId} />}
            {tab === "threads" && <ThreadsTab personId={personId} />}
            {tab === "facts" && (
              <FactsTab personId={personId} headerFacts={headerFacts} />
            )}
            {tab === "questions" && <QuestionsTab personId={personId} />}
            {tab === "traits" && <TraitsTab personId={personId} />}
            {tab === "merges" && <MergesTab personId={personId} />}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- Shared helpers ----------

function TabHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        <h2 className="display-sans text-headline text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-caption text-tertiary">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function LoaderRow() {
  return (
    <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
      <Spinner /> Loading
    </div>
  );
}

function ErrText({ q }: { q: { isError: boolean; error: unknown } }) {
  if (!q.isError) return null;
  return (
    <ErrorBanner>
      {q.error instanceof Error ? q.error.message : "Failed to load."}
    </ErrorBanner>
  );
}

// ---------- Preserved tab components ----------

function SessionsTab({
  personId,
  onStart,
}: {
  personId: string;
  onStart: () => void;
}) {
  const q = useLegacySessions(personId);
  if (q.isError) return <ErrText q={q} />;
  if (q.isLoading) return <LoaderRow />;
  const items = q.data ?? [];
  if (items.length === 0)
    return (
      <EmptyState
        title="No conversations yet."
        hint="Open one to start collecting their stories."
        action={<Button onClick={onStart}>Begin a conversation</Button>}
      />
    );

  const sorted = [...items].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
  );

  return (
    <div>
      <TabHeader
        title="Conversations"
        subtitle={`${items.length} recorded so far`}
      />
      <div className="space-y-2.5">
        {sorted.map((s) => (
          <RowLink
            key={s.sessionId}
            href={`/legacies/${encodeURIComponent(
              personId
            )}/sessions/${encodeURIComponent(s.sessionId)}`}
            className="p-4 sm:p-5"
          >
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="hidden shrink-0 flex-col items-end label-mono text-meta text-tertiary sm:flex sm:w-24">
                <span className="text-secondary">
                  {s.turnCount} {s.turnCount === 1 ? "turn" : "turns"}
                </span>
                <span className="mt-1">
                  {relativeTime(s.lastTurnAt || s.openedAt)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-body leading-relaxed text-primary">
                  {s.opener || "(no opener)"}
                </p>
                {s.sessionSummary && (
                  <p className="mt-2 line-clamp-2 text-caption italic text-tertiary">
                    {s.sessionSummary}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 label-mono text-meta text-tertiary sm:hidden">
                  <span>{s.turnCount} turns</span>
                  <span>·</span>
                  <span>{relativeTime(s.lastTurnAt || s.openedAt)}</span>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 label-mono text-meta ${
                  s.status === "open"
                    ? "border border-emerald-300/30 bg-emerald-400/8 text-emerald-200"
                    : "border border-white/10 text-tertiary"
                }`}
              >
                {s.status}
              </span>
            </div>
          </RowLink>
        ))}
      </div>
    </div>
  );
}

function EntitiesTab({ personId }: { personId: string }) {
  const [kindFilter, setKindFilter] = useState("");
  const q = useEntities(personId, kindFilter);
  const kinds = ["", "person", "place", "object", "event"];

  return (
    <div>
      <TabHeader
        title="Entities"
        subtitle="People, places, objects, and events that recur in their story."
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <Chip
            key={k || "all"}
            active={kindFilter === k}
            onClick={() => setKindFilter(k)}
            className="font-mono uppercase tracking-[0.25em]"
          >
            {k || "all"}
          </Chip>
        ))}
      </div>

      {q.isError ? (
        <ErrText q={q} />
      ) : q.isLoading ? (
        <LoaderRow />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="No entities yet." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(q.data ?? []).map((e) => (
            <RowLink
              key={e.id}
              href={`/legacies/${encodeURIComponent(
                personId
              )}/entities/${encodeURIComponent(e.id)}`}
              className="p-4 sm:p-5"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <EntityMedia entity={e} size={64} rounded="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="display-sans text-title truncate text-white">
                      {e.name}
                    </p>
                    <span className="shrink-0 label-mono text-meta text-tertiary">
                      {e.kind}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-caption leading-relaxed text-secondary">
                    {e.description}
                  </p>
                </div>
              </div>
            </RowLink>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadsTab({ personId }: { personId: string }) {
  const q = useThreads(personId);
  if (q.isError) return <ErrText q={q} />;
  if (q.isLoading) return <LoaderRow />;
  const items = q.data ?? [];
  if (items.length === 0)
    return (
      <EmptyState
        title="No threads yet."
        hint="Threads stitch related moments into longer arcs."
      />
    );

  return (
    <div>
      <TabHeader title="Threads" subtitle={`${items.length} arcs unfolding`} />
      <div className="space-y-2.5">
        {items.map((t) => (
          <RowLink
            key={t.id}
            href={`/legacies/${encodeURIComponent(
              personId
            )}/threads/${encodeURIComponent(t.id)}`}
            className="p-4 sm:p-5"
          >
            <p className="display-sans text-title text-white">{t.title}</p>
            {t.summary && (
              <p className="mt-1.5 text-caption leading-relaxed text-secondary">
                {t.summary}
              </p>
            )}
          </RowLink>
        ))}
      </div>
    </div>
  );
}

function FactsTab({
  personId,
  headerFacts,
}: {
  personId: string;
  headerFacts: ProfileFact[];
}) {
  const q = useProfileFacts(personId);
  const facts = q.data ?? headerFacts;

  const [showForm, setShowForm] = useState(false);
  const [factKey, setFactKey] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const upsert = useUpsertProfileFact(personId);

  const save = async () => {
    setLocalError(null);
    if (!factKey.trim() || !answerText.trim() || !questionText.trim()) {
      setLocalError("All three fields are required.");
      return;
    }
    try {
      await upsert.mutateAsync({
        factKey: factKey.trim(),
        answerText: answerText.trim(),
        questionText: questionText.trim(),
      });
      setFactKey("");
      setQuestionText("");
      setAnswerText("");
      setShowForm(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to save fact.");
    }
  };

  return (
    <div>
      <TabHeader
        title="Facts"
        subtitle="The things that don't change."
        action={
          <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Add a fact"}
          </Button>
        }
      />

      {showForm && (
        <Card variant="glass" className="mb-6 space-y-4 p-6">
          {localError && <ErrorBanner>{localError}</ErrorBanner>}
          <div>
            <Eyebrow>Fact key</Eyebrow>
            <Input
              className="mt-2"
              placeholder="e.g. profession"
              value={factKey}
              onChange={(e) => setFactKey(e.target.value)}
            />
          </div>
          <div>
            <Eyebrow>Question</Eyebrow>
            <Input
              className="mt-2"
              placeholder="What did she do?"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>
          <div>
            <Eyebrow>Answer</Eyebrow>
            <Input
              className="mt-2"
              placeholder="Teacher"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={upsert.isPending}>
              {upsert.isPending && <Spinner />}
              {upsert.isPending ? "Saving…" : "Save fact"}
            </Button>
          </div>
        </Card>
      )}

      {facts.length === 0 ? (
        <EmptyState
          title="No facts on file."
          hint="Facts surface through conversation, or write one yourself."
        />
      ) : (
        <Card className="overflow-hidden">
          <dl className="divide-y divide-white/8">
            {facts.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-1 gap-2 p-5 md:grid-cols-[160px_1fr] md:gap-6"
              >
                <dt className="label-mono text-meta text-tertiary">
                  {f.factKey.replace(/_/g, " ")}
                </dt>
                <dd>
                  <p className="text-body leading-relaxed text-primary">
                    {f.answerText}
                  </p>
                  <p className="mt-1 text-caption italic text-tertiary">
                    {f.questionText}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}

function QuestionsTab({ personId }: { personId: string }) {
  const q = useLegacyQuestions(personId);
  const opener = useOpenConversationFor();
  if (q.isError) return <ErrText q={q} />;
  if (q.isLoading) return <LoaderRow />;
  const items = q.data ?? [];
  if (items.length === 0)
    return (
      <EmptyState
        title="No open questions."
        hint="When the system spots a thread worth pulling, it surfaces here."
      />
    );

  const busy = opener.pendingPersonId === personId;

  return (
    <div>
      <TabHeader
        title="Questions"
        subtitle="Threads worth pulling next. Tap one to answer in conversation."
      />
      {opener.error && (
        <div className="mb-3">
          <ErrorBanner>{opener.error}</ErrorBanner>
        </div>
      )}
      <div className="space-y-3">
        {items.map((qq) => (
          <button
            key={qq.id}
            type="button"
            onClick={() => void opener.open(personId, qq.text)}
            disabled={busy}
            aria-label={`Answer in conversation: ${qq.text}`}
            className="group block w-full rounded-2xl border border-white/10 bg-[rgba(10,8,22,0.6)] p-5 text-left transition-[border-color,background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-soft))]/55 hover:bg-[rgba(18,14,38,0.85)] hover:shadow-[0_30px_70px_-25px_rgba(123,115,253,0.55)] active:scale-[0.995] disabled:cursor-progress disabled:opacity-70"
          >
            <p className="display-sans text-title leading-snug text-white">
              {qq.text}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="label-mono text-meta text-tertiary">
                Source · {qq.source.replace(/_/g, " ")}
              </p>
              <span className="inline-flex items-center gap-1.5 label-mono text-meta text-[rgb(var(--accent-soft))] opacity-80 transition group-hover:opacity-100">
                {busy ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <>
                    Answer in chat
                    <span aria-hidden>→</span>
                  </>
                )}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TraitsTab({ personId }: { personId: string }) {
  const q = useTraits(personId);
  if (q.isError) return <ErrText q={q} />;
  if (q.isLoading) return <LoaderRow />;
  const items = q.data ?? [];
  if (items.length === 0)
    return (
      <EmptyState
        title="No traits yet."
        hint="Patterns surface here as more stories are told."
      />
    );

  return (
    <div>
      <TabHeader title="Traits" subtitle="What kept showing up." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((t) => (
          <Card key={t.id} className="p-5">
            <p className="display-sans text-headline capitalize text-white">
              {t.trait}
            </p>
            <p className="mt-2 text-caption italic leading-relaxed text-secondary">
              {t.evidence}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MergesTab({ personId }: { personId: string }) {
  const q = useIdentityMerges(personId);
  const scan = useScanIdentityMerges(personId);
  const approve = useApproveMerge(personId);
  const reject = useRejectMerge(personId);

  const items = q.data ?? [];
  const pending = items.filter((m) => m.status === "pending");

  const busyId =
    approve.isPending
      ? (approve.variables as string | undefined)
      : reject.isPending
        ? (reject.variables as string | undefined)
        : null;

  return (
    <div>
      <TabHeader
        title="Merges"
        subtitle="Possible duplicates that may refer to the same thing."
        action={
          <Button
            variant="secondary"
            onClick={() => void scan.mutate()}
            disabled={scan.isPending}
          >
            {scan.isPending && <Spinner />}
            {scan.isPending ? "Scanning…" : "Run scan"}
          </Button>
        }
      />

      {q.isError && (
        <div className="mb-4">
          <ErrText q={q} />
        </div>
      )}

      {q.isLoading ? (
        <LoaderRow />
      ) : pending.length === 0 ? (
        <EmptyState
          title="No suggestions to review."
          hint="Run a scan if you suspect duplicate entities."
        />
      ) : (
        <div className="space-y-3">
          {pending.map((m) => (
            <Card key={m.id} className="p-5">
              <p className="display-sans text-title text-white">
                {m.source_entity_name}
                <span className="mx-3 text-tertiary">→</span>
                {m.target_entity_name}
              </p>
              <p className="mt-2 text-caption italic text-secondary">{m.reason}</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  disabled={busyId === m.id}
                  onClick={() => reject.mutate(m.id)}
                >
                  Reject
                </Button>
                <Button
                  disabled={busyId === m.id}
                  onClick={() => approve.mutate(m.id)}
                >
                  {busyId === m.id && <Spinner />}
                  Approve merge
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
