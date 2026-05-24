"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

/** DeckRail — horizontal snap-scroll container with a nav pill above it.
 *
 *  The pill is a single frosted-glass container (same family as BottomNav)
 *  holding [← prev] [hex-scrubber] [next →]. The scrubber position updates
 *  live as the user scrolls or clicks; arrows fade to a disabled state
 *  when there's no more to scroll in that direction. Each chevron scrolls
 *  by exactly one card width (measured from real DOM positions). The pill
 *  is hidden when there's nothing to scroll (≤1 child).
 *
 *  Used by the Explore page rails and the Gallery on legacy detail pages
 *  so both share one set of behaviours (drag-to-scrub, keyboard nav,
 *  bounds-aware arrows). */
export function DeckRail({ children }: { children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);
  const total = Children.count(children);
  const [current, setCurrent] = useState(1);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  /** 0–1 progress along the scrollable distance — used for the scrubber. */
  const [progress, setProgress] = useState(0);
  /** Drag state on the hex scrubber — disables the smooth left-transition
   *  so the hex tracks the finger / cursor 1:1 instead of lagging behind. */
  const [scrubbing, setScrubbing] = useState(false);

  /** Jump the rail to an arbitrary 0–1 ratio along the scrollable distance.
   *  Used by the hex scrubber so tap-on-track + drag-the-hex map directly
   *  to scrollLeft instead of going through scrollBy. `behavior: auto` is
   *  intentional — `smooth` queues animations that conflict on rapid
   *  pointer moves, and a JS rAF lerp races with scroll-snap and jitters. */
  const seekToRatio = (ratio: number) => {
    const el = railRef.current;
    if (!el) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: clamped * maxScroll, behavior: "auto" });
  };

  const recompute = () => {
    const el = railRef.current;
    if (!el) return;
    const epsilon = 8;
    const atS = el.scrollLeft <= epsilon;
    const atE = el.scrollLeft + el.clientWidth >= el.scrollWidth - epsilon;
    setAtStart(atS);
    setAtEnd(atE);

    const maxScroll = el.scrollWidth - el.clientWidth;
    setProgress(maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollLeft / maxScroll)) : 0);

    // Counter = index of the leading (leftmost-visible) card. Centre-based
    // tracking confuses users when several cards are visible — they expect
    // a click of the arrow to bump the counter by exactly one.
    const railChildren = Array.from(el.children) as HTMLElement[];
    let leadingIndex = 0;
    let bestDelta = Infinity;
    railChildren.forEach((child, i) => {
      const delta = Math.abs(child.offsetLeft - el.scrollLeft);
      if (delta < bestDelta) {
        bestDelta = delta;
        leadingIndex = i;
      }
    });
    setCurrent(leadingIndex + 1);
  };

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    recompute();
    const onScroll = () => recompute();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const scroll = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // Step = distance between two consecutive cards (card width + gap),
    // measured from real DOM positions so we land exactly one card over
    // regardless of card width or gap.
    const railChildren = Array.from(el.children) as HTMLElement[];
    let step: number;
    if (railChildren.length >= 2) {
      step = railChildren[1].offsetLeft - railChildren[0].offsetLeft;
    } else if (railChildren.length === 1) {
      step = railChildren[0].offsetWidth;
    } else {
      step = el.clientWidth;
    }
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div>
      {total > 1 && (
        <div className="mb-1 flex justify-end">
          <DeckNavPill
            current={current}
            total={total}
            atStart={atStart}
            atEnd={atEnd}
            progress={progress}
            scrubbing={scrubbing}
            onPrev={() => scroll(-1)}
            onNext={() => scroll(1)}
            onSeek={seekToRatio}
            onScrubChange={setScrubbing}
          />
        </div>
      )}
      <div
        ref={railRef}
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
        {children}
      </div>
    </div>
  );
}

function DeckNavPill({
  current,
  total,
  atStart,
  atEnd,
  progress,
  scrubbing,
  onPrev,
  onNext,
  onSeek,
  onScrubChange,
}: {
  current: number;
  total: number;
  atStart: boolean;
  atEnd: boolean;
  progress: number;
  scrubbing: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (ratio: number) => void;
  onScrubChange: (scrubbing: boolean) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const ratioFromPointer = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return (clientX - rect.left) / Math.max(1, rect.width);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onScrubChange(true);
    onSeek(ratioFromPointer(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing) return;
    onSeek(ratioFromPointer(e.clientX));
  };
  const releaseScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    onScrubChange(false);
  };

  return (
    <div
      className="group/pill inline-flex items-center gap-1 rounded-full border border-white/22 bg-[rgba(18,15,34,0.82)] p-1 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.10)] transition-[transform,box-shadow,border-color] duration-300 focus-within:border-[rgb(var(--accent-soft))]/45 hover:-translate-y-0.5 hover:border-white/30 hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.45),inset_0_1px_0_0_rgba(255,255,255,0.14)]"
      role="group"
      aria-label="Deck navigation"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <DeckArrow direction="left" disabled={atStart} onClick={onPrev} />
      {/* Hex-shaped handle slides along a violet track — echoes the
          hex-grid background motif and tells you "how far in" you are
          without literal numbers. The whole track is a pointer-capture
          target so tap-to-jump and drag-to-scrub both work; touch-action
          none stops the browser from swallowing horizontal swipes as
          page-pan / refresh gestures. */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Scrub deck"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releaseScrub}
        onPointerCancel={releaseScrub}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onPrev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onNext();
          }
        }}
        className={`relative mx-2 h-6 w-24 select-none sm:w-32 ${
          scrubbing ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ touchAction: "none" }}
      >
        <span aria-hidden className="absolute inset-x-0 -inset-y-1" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rounded-full bg-white/12"
        />
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 top-1/2 h-px -translate-y-1/2 rounded-full bg-linear-to-r from-[rgb(var(--accent-soft))] to-[rgb(var(--accent))] shadow-[0_0_8px_rgba(180,173,255,0.6)]"
          style={{
            width: `${progress * 100}%`,
            transition: scrubbing ? "none" : "width 300ms ease-out",
          }}
        />
        <span
          className="absolute top-1/2 pointer-events-none"
          style={{
            left: `${progress * 100}%`,
            transform: "translate(-50%, -50%)",
            transition: scrubbing ? "none" : "left 300ms ease-out",
          }}
        >
          <span
            key={scrubbing ? "scrub" : current}
            className="block deck-hex-pop"
          >
            <svg viewBox="0 0 20 20" className="block h-4 w-4" aria-hidden>
              <polygon
                points="10,1 18.66,5.5 18.66,14.5 10,19 1.34,14.5 1.34,5.5"
                fill="rgb(var(--accent-soft))"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="1"
              />
            </svg>
          </span>
        </span>
      </div>
      <DeckArrow direction="right" disabled={atEnd} onClick={onNext} />
    </div>
  );
}

function DeckArrow({
  direction,
  disabled = false,
  onClick,
}: {
  direction: "left" | "right";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={`group relative grid h-9 w-9 place-items-center overflow-hidden rounded-full transition-[background-color,opacity,transform] duration-200 ${
        disabled
          ? "cursor-default text-tertiary opacity-35"
          : "text-secondary hover:text-white hover:bg-[rgba(123,115,253,0.16)] active:scale-[0.92] active:duration-75"
      }`}
    >
      {!disabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(180,173,255,0.35)_0%,transparent_70%)]" />
        </span>
      )}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`relative h-4 w-4 transition-transform duration-200 ease-out ${
          disabled
            ? ""
            : direction === "left"
              ? "group-hover:-translate-x-1 group-active:-translate-x-1.5"
              : "group-hover:translate-x-1 group-active:translate-x-1.5"
        }`}
        aria-hidden
      >
        {direction === "left" ? (
          <path d="M15 6l-6 6 6 6" />
        ) : (
          <path d="M9 6l6 6-6 6" />
        )}
      </svg>
    </button>
  );
}
