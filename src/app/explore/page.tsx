"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { AppHeader } from "../components/AppHeader";
import {
  MomentViewer,
  type ViewerMoment,
} from "../components/MomentViewer";
import TiltedCard from "../components/TiltedCard";
import {
  EmptyState,
  ErrorBanner,
  PageLoader,
  PageShell,
  ScreenIntro,
  Spinner,
} from "../components/ui";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { legacyApi, type Legacy, type Moment } from "../lib/api";
import { qk, useLegacies } from "../lib/queries";

type TabId = "flashbacks" | "people";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "flashbacks", label: "Flashbacks" },
  { id: "people", label: "People" },
];

function momentImageSrc(m: ViewerMoment): string {
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

function personImageSrc(p: Legacy): string {
  if (p.referenceImageUrl && /^https?:\/\//i.test(p.referenceImageUrl)) {
    return p.referenceImageUrl;
  }
  const seed = (p.deceasedName || "?").replace(/[<>&"']/g, "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#7B73FD'/>
        <stop offset='60%' stop-color='#3B2F9E'/>
        <stop offset='100%' stop-color='#0F0A2A'/>
      </linearGradient>
    </defs>
    <rect width='600' height='800' fill='url(#g)'/>
    <text x='300' y='430' text-anchor='middle' font-family='system-ui,sans-serif' font-size='180' font-weight='700' fill='white' opacity='0.85'>${(seed[0] || "?").toUpperCase()}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const m = Math.round(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.round(mo / 12);
  return `${y}y ago`;
}

export default function ExplorePage() {
  const auth = useRequireAuth();
  const [tab, setTab] = useState<TabId>("flashbacks");

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <PageLoader label="Opening explore" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AppHeader title="Explore" />
      <ScreenIntro
        module="Explore"
        meta="your archive"
        title={{ top: "EVERYTHING YOU'VE", accent: "PRESERVED." }}
        subtitle="Moments and people from every legacy you keep, in one place."
      />

      <div className="mb-4 flex gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-xs transition ${
              tab === t.id
                ? "border-violet-400 text-white"
                : "border-transparent text-secondary hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "flashbacks" ? <FlashbacksTab /> : <PeopleTab />}
    </PageShell>
  );
}

type AggregatedMoment = Moment & { personId: string; personName: string };

function FlashbacksTab() {
  const legaciesQ = useLegacies();
  const legacies = legaciesQ.data?.legacies ?? [];

  const momentQueries = useQueries({
    queries: legacies.map((p) => ({
      queryKey: qk.moments(p.personId),
      queryFn: () =>
        legacyApi.listMoments(p.personId).then((r) => r.items),
      staleTime: 1000 * 60 * 2,
      enabled: !!p.personId,
    })),
  });

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (legaciesQ.isError) {
    return (
      <ErrorBanner>
        {legaciesQ.error instanceof Error
          ? legaciesQ.error.message
          : "Failed to load legacies."}
      </ErrorBanner>
    );
  }
  if (legaciesQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-tertiary">
        <Spinner /> Loading…
      </div>
    );
  }
  if (legacies.length === 0) {
    return (
      <EmptyState
        title="No legacies yet"
        hint="Start an onboarding to begin preserving moments."
      />
    );
  }

  const anyLoading = momentQueries.some((q) => q.isLoading);
  const moments: AggregatedMoment[] = momentQueries.flatMap((q, i) => {
    const p = legacies[i];
    return (q.data ?? []).map((m) => ({
      ...m,
      personId: p.personId,
      personName: p.deceasedName,
    }));
  });

  moments.sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    return tb - ta;
  });

  if (anyLoading && moments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-tertiary">
        <Spinner /> Loading moments…
      </div>
    );
  }
  if (moments.length === 0) {
    return (
      <EmptyState
        title="No moments captured yet."
        hint="Stories shared in conversations crystallise into moments here."
      />
    );
  }

  return (
    <div>
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
        {moments.map((m, i) => {
          const hasVideo =
            !!m.videoUrl &&
            (/^https?:\/\//i.test(m.videoUrl) || m.videoUrl.startsWith("/"));
          return (
            <div key={`${m.personId}:${m.id}`} className="shrink-0 snap-center">
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
                      <p className="label-mono text-meta text-secondary">
                        {m.personName}
                      </p>
                      {m.title && (
                        <p className="display-sans mt-1 text-title text-white">
                          {m.title}
                        </p>
                      )}
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-secondary">
                        {m.narrative}
                      </p>
                      <p className="mt-2 label-mono text-meta text-tertiary">
                        {relativeTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                }
              />
            </div>
          );
        })}
      </div>

      {viewerIndex !== null && (
        <MomentViewer
          moments={moments}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNavigate={(i) => setViewerIndex(i)}
        />
      )}
    </div>
  );
}

function PeopleTab() {
  const legaciesQ = useLegacies();

  if (legaciesQ.isError) {
    return (
      <ErrorBanner>
        {legaciesQ.error instanceof Error
          ? legaciesQ.error.message
          : "Failed to load legacies."}
      </ErrorBanner>
    );
  }
  if (legaciesQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-tertiary">
        <Spinner /> Loading…
      </div>
    );
  }
  const people = legaciesQ.data?.legacies ?? [];
  if (people.length === 0) {
    return (
      <EmptyState
        title="No people yet"
        hint="Start an onboarding to add someone to your archive."
      />
    );
  }

  return (
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
      {people.map((p, i) => (
        <div key={p.personId} className="shrink-0 snap-center">
          <Link
            href={`/legacies/${encodeURIComponent(p.personId)}`}
            aria-label={`Open ${p.deceasedName}`}
          >
            <TiltedCard
              imageSrc={personImageSrc(p)}
              altText={p.deceasedName}
              captionText={p.deceasedName}
              containerHeight="clamp(340px, 65vw, 460px)"
              containerWidth="clamp(260px, 72vw, 360px)"
              imageHeight="clamp(340px, 65vw, 460px)"
              imageWidth="clamp(260px, 72vw, 360px)"
              rotateAmplitude={12}
              scaleOnHover={1.05}
              displayOverlayContent
              overlayContent={
                <div className="relative flex h-full w-full flex-col justify-between rounded-[18px] p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <span className="rounded-full bg-black/55 px-2 py-0.5 label-mono text-meta text-primary backdrop-blur">
                      {String(i + 1).padStart(3, "0")}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-black/55 p-3 text-left backdrop-blur sm:p-4">
                    <p className="label-mono text-meta text-secondary">
                      {p.relationship || "Person"}
                    </p>
                    <p className="display-sans mt-1 text-title text-white">
                      {p.deceasedName}
                    </p>
                    <p className="mt-2 label-mono text-meta text-tertiary">
                      {relativeTime(p.createdAt)}
                    </p>
                  </div>
                </div>
              }
            />
          </Link>
        </div>
      ))}
    </div>
  );
}
