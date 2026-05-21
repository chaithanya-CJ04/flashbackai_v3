"use client";

import { useEffect, useRef, useState } from "react";
import { AuthedVideo } from "./VideoLightbox";

export type ViewerMoment = {
  id: string;
  title?: string;
  narrative: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt?: string;
};

/** Instagram-style immersive viewer for moments.
 *
 *  - Full-screen black backdrop, body scroll locked
 *  - Plays the video if present; falls back to the thumbnail; falls back
 *    to a typographic placeholder for text-only moments
 *  - Caption (title + narrative + counter) below the media
 *  - Prev / Next: clickable arrows on desktop, swipe gestures on touch,
 *    ← / → keys anywhere
 *  - Close: backdrop click, top-right ✕, or Esc
 *
 *  Designed for the Moments grid — tap a tile to enter at that index. */
export function MomentViewer({
  moments,
  index,
  onClose,
  onNavigate,
}: {
  moments: ViewerMoment[];
  index: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}) {
  const current = moments[index];
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Lock body scroll while the viewer is mounted.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard: Esc closes, ← / → navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
      else if (e.key === "ArrowRight" && index < moments.length - 1)
        onNavigate(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, moments.length, onClose, onNavigate]);

  if (!current) return null;

  const hasVideo =
    !!current.videoUrl &&
    (/^https?:\/\//i.test(current.videoUrl) ||
      current.videoUrl.startsWith("/"));
  const hasThumb =
    !!current.thumbnailUrl && /^https?:\/\//i.test(current.thumbnailUrl);

  const canPrev = index > 0;
  const canNext = index < moments.length - 1;

  // Touch swipe handling — horizontal flick switches moments.
  const onPointerDown = (e: React.PointerEvent) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    // Only register horizontal swipes (dx must dominate, and exceed a threshold)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && canPrev) onNavigate(index - 1);
      else if (dx < 0 && canNext) onNavigate(index + 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-stretch justify-center bg-black/95 backdrop-blur-md"
    >
      {/* Top chrome — counter + close button */}
      <div
        className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="label-mono text-meta text-secondary">
          Moment <span className="text-primary">{index + 1}</span>
          <span className="mx-1 text-tertiary">/</span>
          {moments.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-secondary backdrop-blur transition hover:border-white/35 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Stage */}
      <div
        className="relative flex flex-1 items-center justify-center px-4 py-4 sm:px-12 sm:py-6"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* Prev arrow — desktop only */}
        {canPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(index - 1);
            }}
            aria-label="Previous moment"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/12 bg-black/40 p-2 text-secondary backdrop-blur transition hover:border-white/30 hover:text-white sm:block"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <div
          className="flex w-full max-w-3xl flex-col items-stretch gap-4"
          key={current.id}
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
            {hasVideo ? (
              <AuthedVideo
                src={current.videoUrl!}
                poster={current.thumbnailUrl}
                className="block h-auto max-h-[65vh] w-full"
                controls={false}
                autoPlay
                loop
                muted
              />
            ) : hasThumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.thumbnailUrl!}
                alt={current.title ?? "Moment"}
                className="block max-h-[65vh] w-full object-contain"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-linear-to-br from-[rgb(var(--accent))]/30 via-[rgb(var(--accent-deep))]/25 to-black/60 p-8 text-center">
                <p className="display-sans text-headline text-primary">
                  {current.title || "—"}
                </p>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="px-1 text-left">
            {current.title && (
              <p className="display-sans text-title text-white">
                {current.title}
              </p>
            )}
            <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-secondary sm:max-h-40">
              {current.narrative}
            </p>
          </div>
        </div>

        {/* Next arrow — desktop only */}
        {canNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(index + 1);
            }}
            aria-label="Next moment"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/12 bg-black/40 p-2 text-secondary backdrop-blur transition hover:border-white/30 hover:text-white sm:block"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Page dots */}
      {moments.length > 1 && moments.length <= 30 && (
        <div
          className="flex items-center justify-center gap-1.5 px-4 pb-4 sm:pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          {moments.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(i)}
              aria-label={`Jump to moment ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/30 hover:bg-white/55"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** A single thumbnail tile for the Instagram-style moments grid.
 *  Square aspect, cover-fit thumbnail, play badge in corner if there's a
 *  video, gradient + title fallback for text-only moments. */
export function MomentTile({
  moment,
  onClick,
  className = "",
}: {
  moment: ViewerMoment;
  onClick: () => void;
  className?: string;
}) {
  const hasVideo =
    !!moment.videoUrl &&
    (/^https?:\/\//i.test(moment.videoUrl) ||
      moment.videoUrl.startsWith("/"));
  const hasThumb =
    !!moment.thumbnailUrl && /^https?:\/\//i.test(moment.thumbnailUrl);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative aspect-square overflow-hidden bg-black/40 transition ${className}`}
    >
      {hasThumb ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={moment.thumbnailUrl!}
            alt={moment.title ?? "Moment"}
            draggable={false}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            onError={(e) => {
              // Hide broken image; reveal the gradient fallback that's already in the DOM.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-end bg-linear-to-br from-[rgb(var(--accent))]/30 via-[rgb(var(--accent-deep))]/25 to-black/60 p-3 text-left">
          <p className="display-sans line-clamp-3 text-sm leading-snug text-primary sm:text-base">
            {moment.title || moment.narrative.slice(0, 80)}
          </p>
        </div>
      )}

      {/* Hover veil for subtle interactivity */}
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15" />

      {/* Video indicator — Instagram-style corner glyph */}
      {hasVideo && (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:right-2 sm:top-2"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3 translate-x-[0.5px]" fill="currentColor">
            <path d="M8 5.5v13l11-6.5L8 5.5z" />
          </svg>
        </span>
      )}
    </button>
  );
}
