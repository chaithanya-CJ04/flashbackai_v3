"use client";

import { use, useCallback, useEffect, useState } from "react";
import { AppHeader } from "../../../../components/AppHeader";
import {
  MomentViewer,
  type ViewerMoment,
} from "../../../../components/MomentViewer";
import TiltedCard from "../../../../components/TiltedCard";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageShell,
  Spinner,
} from "../../../../components/ui";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import {
  legacyApi,
  type ThemeArchetypeQuestion,
  type ThemeDetail,
  type ThemeMoment,
} from "../../../../lib/api";

type UnlockPrepared = {
  questions: Array<{
    question_id: string;
    text: string;
    options: Array<{ option_id: string; label: string }>;
    allow_skip: boolean;
    allow_free_text: boolean;
  }>;
  generated_this_call: boolean;
};

/** SVG gradient fallback so TiltedCard always has a renderable image,
 *  even when the moment lacks a thumbnail URL. */
function momentImageSrc(m: ViewerMoment): string {
  if (m.thumbnailUrl && /^https?:\/\//i.test(m.thumbnailUrl)) {
    return m.thumbnailUrl;
  }
  const seed = (m.title || m.narrative.slice(0, 40)).replace(
    /[<>&"']/g,
    ""
  );
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#7B73FD'/>
        <stop offset='55%' stop-color='#5046D2'/>
        <stop offset='100%' stop-color='#1A1238'/>
      </linearGradient>
    </defs>
    <rect width='800' height='600' fill='url(#g)'/>
    <text x='400' y='320' text-anchor='middle' font-family='system-ui,sans-serif' font-size='42' font-weight='700' fill='white' opacity='0.85'>${seed.slice(
      0,
      28
    )}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function ThemeDetailPage({
  params,
}: {
  params: Promise<{ personId: string; themeId: string }>;
}) {
  const { personId, themeId } = use(params);
  const auth = useRequireAuth();

  const [theme, setTheme] = useState<ThemeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moments, setMoments] = useState<ThemeMoment[] | null>(null);
  const [momentsError, setMomentsError] = useState<string | null>(null);

  const [unlock, setUnlock] = useState<UnlockPrepared | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = useCallback(() => {
    legacyApi
      .getTheme(personId, themeId)
      .then((res) => setTheme(res.item))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load theme.")
      );
  }, [personId, themeId]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    load();
    legacyApi
      .listThemeMoments(personId, themeId)
      .then((res) => setMoments(res.items))
      .catch((e) =>
        setMomentsError(
          e instanceof Error ? e.message : "Failed to load theme moments."
        )
      );
  }, [auth.status, load, personId, themeId]);

  const runUnlockPrepare = async () => {
    setPreparing(true);
    setPrepareError(null);
    try {
      const res = await legacyApi.unlockPrepareTheme(personId, themeId);
      setUnlock({
        questions: res.archetype_questions,
        generated_this_call: res.generated_this_call,
      });
    } catch (e) {
      setPrepareError(e instanceof Error ? e.message : "Unlock prepare failed.");
    } finally {
      setPreparing(false);
    }
  };

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-5 w-5" />
        </div>
      </PageShell>
    );
  }

  const archetypeQuestions: ThemeArchetypeQuestion[] | null =
    (unlock?.questions as ThemeArchetypeQuestion[] | undefined) ??
    theme?.archetypeQuestions ??
    null;

  return (
    <PageShell>
      <AppHeader
        back={`/legacies/${encodeURIComponent(personId)}`}
        title="Theme"
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {!theme ? (
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <Spinner /> Loading theme…
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-lg font-semibold text-primary">
                {theme.displayName}
              </h1>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  theme.state === "unlocked"
                    ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                    : "border border-white/10 bg-white/5 text-secondary"
                }`}
              >
                {theme.state}
              </span>
            </div>
            {theme.description && (
              <p className="mt-2 text-sm text-secondary">{theme.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-caption text-tertiary">
              <span>Kind: {theme.kind}</span>
              <span>·</span>
              <span>Qualifying moments: {theme.qualifyingCount}</span>
              {theme.tier && (
                <>
                  <span>·</span>
                  <span>Tier: {theme.tier}</span>
                </>
              )}
            </div>
          </Card>

          {theme.state === "locked" && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-primary">
                Unlock this theme
              </p>
              <p className="mt-1 text-xs text-secondary">
                Answer a few archetype questions about them. We&apos;ll use these
                to guide the next conversation.
              </p>

              {!archetypeQuestions ? (
                <div className="mt-3">
                  <Button onClick={() => void runUnlockPrepare()} disabled={preparing}>
                    {preparing && <Spinner />}
                    {preparing ? "Preparing…" : "Prepare questions"}
                  </Button>
                  {prepareError && (
                    <div className="mt-2">
                      <ErrorBanner>{prepareError}</ErrorBanner>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-5">
                  {unlock?.generated_this_call === false && (
                    <p className="text-caption text-tertiary">
                      (Cached from a previous prepare.)
                    </p>
                  )}
                  {archetypeQuestions.map((q) => (
                    <div key={q.question_id}>
                      <p className="text-sm text-secondary">{q.text}</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {q.options.map((opt) => {
                          const active =
                            answers[q.question_id] === opt.option_id;
                          return (
                            <button
                              key={opt.option_id}
                              type="button"
                              onClick={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [q.question_id]: opt.option_id,
                                }))
                              }
                              className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                                active
                                  ? "border-violet-400/60 bg-violet-500/15 text-white"
                                  : "border-white/10 bg-white/5 text-secondary hover:border-white/25"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="text-caption text-tertiary">
                    Selecting answers happens locally for now — submitting these
                    to fully unlock the theme isn&apos;t wired yet. Use this to
                    preview the question set.
                  </p>
                </div>
              )}
            </Card>
          )}

          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-tertiary">
              Moments tagged to this theme
            </p>
            {momentsError && <ErrorBanner>{momentsError}</ErrorBanner>}
            {!moments ? (
              <div className="flex items-center gap-2 text-xs text-tertiary">
                <Spinner /> Loading…
              </div>
            ) : moments.length === 0 ? (
              <EmptyState title="No moments tagged yet" />
            ) : (
              <div
                className="no-scrollbar -mx-4 flex snap-x snap-proximity items-stretch gap-6 overflow-x-auto px-4 py-12 sm:-mx-6 sm:gap-8 sm:px-6 sm:py-14"
                style={{
                  scrollPaddingLeft: "1rem",
                  scrollPaddingRight: "1rem",
                  maskImage:
                    "linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%)",
                }}
              >
                {moments.map((m, i) => {
                  const hasVideo =
                    !!m.videoUrl &&
                    (/^https?:\/\//i.test(m.videoUrl) ||
                      m.videoUrl.startsWith("/"));
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
                          </div>
                        </div>
                      }
                    />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {viewerIndex !== null && moments && (
        <MomentViewer
          moments={moments}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNavigate={(i) => setViewerIndex(i)}
        />
      )}
    </PageShell>
  );
}
