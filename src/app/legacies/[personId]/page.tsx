"use client";

import Link from "next/link";
import {
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/AppHeader";
import { Avatar } from "../../components/Avatar";
import { MomentViewer, type ViewerMoment } from "../../components/MomentViewer";
import TiltedCard from "../../components/TiltedCard";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  Eyebrow,
  Input,
  PageShell,
  RowLink,
  Spinner,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import {
  useApproveMerge,
  useEntities,
  useIdentityMerges,
  useLegacies,
  useLegacyHeader,
  useLegacyQuestions,
  useLegacySessions,
  useMoments,
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
import { legacyApi, type ProfileFact, type Theme } from "../../lib/api";

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
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-5 w-5" />
        </div>
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
        <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
          <Spinner /> Loading
        </div>
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

          {/* Section 2/5 — Action Items (Biopic, Story Books, Comic Strips,
              Mentor Mode). DEFERRED: requires backend endpoints for
              generation + a numeric level for unlock gating. The PRD calls
              for lock icons + "unlocks at L*N*" hints; we'll re-add this row
              when those endpoints land. */}

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

      {/* Bottom — Persistent chat input (PRD §6 row 5, §7). */}
      {header && <ChatBar personId={personId} personName={header.name} />}
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
    <section className="mb-8 flex items-center gap-4 sm:gap-5">
      <div className="relative shrink-0">
        <span
          aria-hidden
          className="absolute inset-[-12px] -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(123,115,253,0.32),transparent_75%)] blur-md"
        />
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
        <p className="display-sans mt-1.5 truncate text-[clamp(1.65rem,1.1rem+2.4vw,2.6rem)] leading-[1.02] text-white">
          {name}
        </p>
        {profileSummary && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-secondary">
            {profileSummary}
          </p>
        )}
      </div>
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
    surface: "border-white/15 bg-[rgba(18,15,34,0.62)]",
    label: "text-tertiary",
  };
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
            ? "Showing moments tied to the selected badge — tap again to clear."
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
          const locked = t.state === "locked";
          const vis = tierVisual(t.tier);
          return (
            <button
              key={t.id}
              onClick={() => onSelect(active ? null : t.id)}
              disabled={locked && t.qualifyingCount === 0}
              className={`group relative shrink-0 snap-start overflow-hidden rounded-2xl border px-3 py-2.5 text-left backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color] duration-300 ${
                active
                  ? "border-[rgb(var(--accent-soft))]/65 bg-[rgba(60,46,110,0.7)] shadow-[0_30px_60px_-20px_rgba(123,115,253,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                  : `${vis.surface} hover:border-[rgb(var(--accent-soft))]/45 hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]`
              } ${locked && t.qualifyingCount === 0 ? "opacity-55" : ""}`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/22 to-transparent"
              />
              <div className="relative flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`grid h-9 w-9 place-items-center rounded-full border ${vis.ring}`}
                >
                  <span className={`label-mono text-meta ${vis.label}`}>
                    {(t.tier ?? "·").slice(0, 1).toUpperCase()}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="max-w-40 truncate text-xs text-primary">
                    {t.displayName}
                  </p>
                  <p className="mt-0.5 label-mono text-meta text-tertiary">
                    {locked
                      ? "locked"
                      : t.tier
                        ? `${t.tier} · ${t.qualifyingCount}`
                        : `${t.qualifyingCount} moment${t.qualifyingCount === 1 ? "" : "s"}`}
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
              ? "Try another badge — or share more stories below to deepen this one."
              : "Stories shared in conversations crystallise into moments here."
          }
        />
      ) : (
        <>
          {/* Horizontal stack of TiltedCards. Vertical padding gives the
              hover scale room to breathe; horizontal mask softly dissolves
              the left/right edges instead of a hard viewport-edge clip. */}
          <div
            className="no-scrollbar -mx-4 flex snap-x snap-proximity items-stretch gap-6 overflow-x-auto px-4 py-12 sm:-mx-6 sm:gap-8 sm:px-6 sm:py-14 md:-mx-8 md:px-8"
            style={{
              scrollPaddingLeft: "1rem",
              scrollPaddingRight: "1rem",
              maskImage:
                "linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%)",
            }}
          >
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
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-secondary">
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
          </div>

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

// ---------- Bottom: Persistent chat input ----------

type LocalTurn = { id: string; from: "user" | "assistant"; text: string };

function ChatBar({
  personId,
  personName,
}: {
  personId: string;
  personName: string;
}) {
  const router = useRouter();
  const sessionsQ = useLegacySessions(personId);
  const startSession = useStartSession(personId);

  // Pinned session for this visit. Prefer an existing open session; otherwise
  // start one on first send. Once set, route every turn through it.
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    if (sessionId) return;
    const open = sessionsQ.data?.find((s) => s.status === "open");
    if (open) setSessionId(open.sessionId);
  }, [sessionsQ.data, sessionId]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<LocalTurn[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (showTranscript && transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [turns, showTranscript]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);

    const userId = `u-${Date.now()}`;
    setTurns((prev) => [...prev, { id: userId, from: "user", text }]);
    setDraft("");
    setShowTranscript(true);

    try {
      let sid = sessionId;
      if (!sid) {
        const res = await startSession.mutateAsync();
        sid = res.sessionId;
        setSessionId(sid);
        if (res.opener) {
          setTurns((prev) => [
            { id: `a-opener-${sid}`, from: "assistant", text: res.opener },
            ...prev,
          ]);
        }
      }
      const reply = await legacyApi.sendTurn(personId, sid, text);
      setTurns((prev) => [
        ...prev,
        {
          id: `a-${reply.turn.turnIndex}`,
          from: "assistant",
          text: reply.reply,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const openFullConversation = () => {
    if (!sessionId) return;
    router.push(
      `/legacies/${encodeURIComponent(personId)}/sessions/${encodeURIComponent(
        sessionId
      )}`
    );
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="pointer-events-auto w-full max-w-3xl">
        {showTranscript && turns.length > 0 && (
          <div
            ref={transcriptRef}
            className="mb-2 max-h-[40vh] overflow-y-auto rounded-2xl border border-white/8 bg-black/70 p-3 backdrop-blur-md sm:p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="label-mono text-meta text-tertiary">
                Live · {turns.length} turn{turns.length === 1 ? "" : "s"}
              </span>
              <div className="flex gap-3">
                {sessionId && (
                  <button
                    className="label-mono text-meta text-tertiary hover:text-white"
                    onClick={openFullConversation}
                  >
                    Open full →
                  </button>
                )}
                <button
                  className="label-mono text-meta text-tertiary hover:text-white"
                  onClick={() => setShowTranscript(false)}
                >
                  Hide
                </button>
              </div>
            </div>
            <div className="space-y-2.5">
              {turns.map((t) => (
                <div
                  key={t.id}
                  className={`text-sm leading-relaxed ${
                    t.from === "user" ? "text-primary" : "text-secondary"
                  }`}
                >
                  <span className="mr-2 label-mono text-meta text-tertiary">
                    {t.from === "user" ? "you" : personName.split(" ")[0]}
                  </span>
                  {t.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-2">
            <ErrorBanner>{error}</ErrorBanner>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 rounded-full border border-white/12 bg-black/70 p-1.5 pl-4 backdrop-blur-md shadow-[0_18px_42px_rgba(0,0,0,0.45)]"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Tell us about ${personName.split(" ")[0]}…`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
            autoComplete="off"
          />
          {turns.length > 0 && !showTranscript && (
            <button
              type="button"
              onClick={() => setShowTranscript(true)}
              className="rounded-full px-2 label-mono text-meta text-secondary hover:text-white"
            >
              Show
            </button>
          )}
          <Button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-full px-4 py-2"
          >
            {sending ? <Spinner /> : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ---------- Workshop: preserved tab data, collapsed by default ----------

function WorkshopSection({
  personId,
  headerFacts,
}: {
  personId: string;
  headerFacts: ProfileFact[];
}) {
  const [open, setOpen] = useState(false);
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
        onClick={() => setOpen((v) => !v)}
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-white/12 bg-[rgba(18,15,34,0.62)] p-4 text-left backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color] duration-300 hover:border-[rgb(var(--accent-soft))]/45 hover:bg-[rgba(28,22,52,0.7)] hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        >
          <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_50%,rgba(123,115,253,0.22)_0%,transparent_60%)]" />
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent transition group-hover:via-[rgba(200,170,255,0.6)]"
        />
        <span className="relative">
          <span className="label-mono text-meta text-secondary">
            Workshop
          </span>
          <p className="mt-1 text-sm text-secondary">
            Conversations, entities, threads, facts, questions, traits, merges.
          </p>
        </span>
        <span
          aria-hidden
          className="relative label-mono text-meta text-tertiary"
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

function SectionHeading({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="display-sans text-headline text-white">{title}</h2>
        {hint && <p className="mt-1 text-xs text-tertiary">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

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
        {subtitle && <p className="mt-1 text-xs text-tertiary">{subtitle}</p>}
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
                <p className="line-clamp-2 text-base leading-relaxed text-primary">
                  {s.opener || "(no opener)"}
                </p>
                {s.sessionSummary && (
                  <p className="mt-2 line-clamp-2 text-xs italic text-tertiary">
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
              className="p-5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="display-sans text-title text-white">{e.name}</p>
                <span className="shrink-0 label-mono text-meta text-tertiary">
                  {e.kind}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-secondary">
                {e.description}
              </p>
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
              <p className="mt-1.5 text-sm leading-relaxed text-secondary">
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
          hint="Facts surface through conversation — or write one yourself."
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
                  <p className="text-base leading-relaxed text-primary">
                    {f.answerText}
                  </p>
                  <p className="mt-1 text-xs italic text-tertiary">
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

  return (
    <div>
      <TabHeader title="Questions" subtitle="Threads worth pulling next." />
      <div className="space-y-3">
        {items.map((qq) => (
          <Card key={qq.id} className="p-5">
            <p className="display-sans text-title leading-snug text-white">
              {qq.text}
            </p>
            <p className="mt-3 label-mono text-meta text-tertiary">
              Source · {qq.source.replace(/_/g, " ")}
            </p>
          </Card>
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
            <p className="mt-2 text-sm italic leading-relaxed text-secondary">
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
              <p className="mt-2 text-sm italic text-secondary">{m.reason}</p>
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
