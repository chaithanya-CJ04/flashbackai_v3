"use client";

import { useEffect, useRef, useState } from "react";
import LightRays from "./LightRays";
import { MediaImg } from "./MediaImg";
import { AuthedVideo } from "./VideoLightbox";

export type ViewerMoment = {
  id: string;
  title?: string;
  narrative: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt?: string;
};

/** Immersive viewer for moments — archive-plate × filmstrip blend.
 *
 *  Layout
 *  ─ Ambient backdrop: blurred copy of the current image, deeply darkened.
 *    A faint SVG grain overlay sits on top for a film-still feel.
 *  ─ Top chrome: archival "PRESERVED · DATE" stamp on the left, ✕ on the
 *    right. No segmented progress bar — that read like Instagram Stories.
 *  ─ Left rail (sm+): vertical filmstrip — one tick per moment, current is
 *    accent-lit and labelled. Click any tick to jump. Tall lists window to
 *    a slice of ~15 around the current index.
 *  ─ Stage: a serif index ornament ("№ 003 / 042" stacked) flanks the media
 *    plate, which is framed by museum-style L-shaped corner brackets. Stills
 *    get a slow ken-burns pan keyed off the moment id.
 *  ─ Caption: serif title + narrative, with overflow fade.
 *  ─ Footer (sm+): "← Earlier · <title>" / "<title> · Later →" peek at the
 *    neighbouring moments instead of bare arrow chips.
 *  ─ Navigation: Esc, ← / →, on-canvas tap zones, horizontal swipe, rail
 *    click, footer peek click. */
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
  const narrativeRef = useRef<HTMLDivElement | null>(null);
  const [narrativeOverflow, setNarrativeOverflow] = useState(false);

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

  // Detect when the narrative overflows so we can show the fade + scroll hint.
  useEffect(() => {
    const el = narrativeRef.current;
    if (!el) return;
    const measure = () =>
      setNarrativeOverflow(el.scrollHeight - el.clientHeight > 4);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, current?.narrative]);

  if (!current) return null;

  const hasVideo =
    !!current.videoUrl &&
    (/^https?:\/\//i.test(current.videoUrl) ||
      current.videoUrl.startsWith("/"));
  const hasThumb =
    !!current.thumbnailUrl && /^https?:\/\//i.test(current.thumbnailUrl);

  const canPrev = index > 0;
  const canNext = index < moments.length - 1;
  const total = moments.length;
  const prevTitle = canPrev
    ? (moments[index - 1].title ?? moments[index - 1].narrative.slice(0, 36))
    : null;
  const nextTitle = canNext
    ? (moments[index + 1].title ?? moments[index + 1].narrative.slice(0, 36))
    : null;

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
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && canPrev) onNavigate(index - 1);
      else if (dx < 0 && canNext) onNavigate(index + 1);
    }
  };

  const formattedDate = current.createdAt
    ? new Date(current.createdAt)
        .toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase()
    : null;

  // Windowed rail when the collection is long: show 15 ticks centred on the
  // current index so the rail stays scannable instead of becoming a thicket.
  const RAIL_WINDOW = 15;
  const rail = (() => {
    if (total <= RAIL_WINDOW) {
      return { start: 0, end: total, hasMoreAbove: false, hasMoreBelow: false };
    }
    const half = Math.floor(RAIL_WINDOW / 2);
    let start = Math.max(0, index - half);
    const end = Math.min(total, start + RAIL_WINDOW);
    start = Math.max(0, end - RAIL_WINDOW);
    return {
      start,
      end,
      hasMoreAbove: start > 0,
      hasMoreBelow: end < total,
    };
  })();

  const indexLabel = String(index + 1).padStart(3, "0");
  const totalLabel = String(total).padStart(3, "0");

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black [animation:viewer-fade-in_0.3s_ease-out]"
    >
      {/* Ambient backdrop — layered, in DOM order under all chrome:
          1. Blurred copy of the current photo (when there is one)
          2. Slow violet aurora blobs drifting behind the stage
          3. Warm "dust motes" — sunlit memory specks floating up
          4. Film grain on top of it all */}
      {hasThumb && (
        <div
          aria-hidden
          key={`bg-${current.id}`}
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-30 [animation:viewer-bg-in_0.6s_ease-out]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.thumbnailUrl!}
            alt=""
            className="h-full w-full scale-125 object-cover blur-3xl saturate-150"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/65 to-black/85" />
        </div>
      )}
      {!hasThumb && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-radial-[at_50%_30%] from-[rgb(var(--accent))]/15 via-black/70 to-black"
        />
      )}

      {/* Edge vignette — darkens the corners so the stage reads as the lit
          centre of a deeper black void; intensifies the spotlight cast by
          the LightRays above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 45%, transparent 0%, transparent 45%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      <MemoryAmbient />

      {/* Film-grain overlay — SVG noise, low opacity, screen-blend.
          Inline data URI keeps this self-contained; pointer-events-none so
          it never steals clicks. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* Top chrome — archival stamp + close */}
      <div
        className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="inline-flex items-center gap-2 rounded-sm border border-white/22 bg-white/[0.04] px-2.5 py-1 backdrop-blur-sm"
          style={{ transform: "rotate(-1.5deg)" }}
        >
          <span
            aria-hidden
            className="block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))]"
          />
          <p className="label-mono text-[10px] tracking-[0.28em] text-secondary">
            PRESERVED{formattedDate ? ` · ${formattedDate}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-secondary backdrop-blur transition hover:scale-105 hover:border-white/40 hover:bg-white/10 hover:text-white active:scale-95"
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
        className="relative z-0 flex flex-1 items-center justify-center px-4 py-4 sm:px-12 sm:py-6"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* Tap zones — left/right thirds advance, mobile-friendly */}
        {canPrev && (
          <button
            type="button"
            aria-label="Previous moment"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(index - 1);
            }}
            className="absolute inset-y-0 left-0 z-0 w-1/4 cursor-w-resize sm:w-1/6"
          />
        )}
        {canNext && (
          <button
            type="button"
            aria-label="Next moment"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(index + 1);
            }}
            className="absolute inset-y-0 right-0 z-0 w-1/4 cursor-e-resize sm:w-1/6"
          />
        )}

        {/* Vertical filmstrip rail (sm+ only). Each tick = one moment;
            current is accent-lit, past is faded, future is hairline. */}
        {total > 1 && (
          <div
            aria-label="Moments"
            className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 sm:flex sm:flex-col sm:items-stretch"
            onClick={(e) => e.stopPropagation()}
          >
            {rail.hasMoreAbove && (
              <span className="mb-1 self-center label-mono text-[9px] tracking-[0.2em] text-tertiary">
                +{rail.start}
              </span>
            )}
            <ol className="flex flex-col items-stretch gap-[7px]">
              {Array.from({ length: rail.end - rail.start }).map((_, k) => {
                const i = rail.start + k;
                const isCurrent = i === index;
                const isPast = i < index;
                return (
                  <li key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate(i)}
                      aria-label={`Jump to moment ${i + 1}`}
                      aria-current={isCurrent ? "true" : undefined}
                      className={`block h-[2px] rounded-full transition-all duration-300 ease-out ${
                        isCurrent
                          ? "w-7 bg-[rgb(var(--accent-soft))] shadow-[0_0_12px_rgba(180,173,255,0.6)]"
                          : isPast
                            ? "w-4 bg-white/55 hover:w-6 hover:bg-white/80"
                            : "w-4 bg-white/18 hover:w-6 hover:bg-white/40"
                      }`}
                    />
                    {isCurrent && (
                      <span className="label-mono text-[9px] tracking-[0.22em] text-[rgb(var(--accent-soft))]">
                        {indexLabel}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            {rail.hasMoreBelow && (
              <span className="mt-1 self-center label-mono text-[9px] tracking-[0.2em] text-tertiary">
                +{total - rail.end}
              </span>
            )}
          </div>
        )}

        <div
          key={current.id}
          className="relative z-10 flex w-full max-w-3xl flex-col items-stretch gap-5 [animation:viewer-stage-in_0.45s_cubic-bezier(0.16,1,0.3,1)]"
        >
          {/* Editorial spread: index ornament + media plate side-by-side on
              desktop, stacked on mobile. */}
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Index ornament — "№ 003 / 042" stacked. Sits flush with the
                top of the media plate on desktop. */}
            <aside
              aria-hidden
              className="flex shrink-0 flex-row items-baseline gap-2 sm:flex-col sm:gap-0 sm:pt-1 sm:text-right"
            >
              <span className="label-mono text-[10px] tracking-[0.32em] text-tertiary">
                №
              </span>
              <span
                className="serif leading-none text-white"
                style={{ fontSize: "clamp(2.5rem, 7vw, 4.25rem)" }}
              >
                {indexLabel}
              </span>
              <span className="label-mono text-[10px] tracking-[0.32em] text-tertiary sm:mt-1">
                / {totalLabel}
              </span>
            </aside>

            {/* Media plate with museum corner brackets */}
            <div className="relative flex-1">
              <div className="relative overflow-hidden bg-black shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)]">
                {hasVideo ? (
                  <AuthedVideo
                    src={current.videoUrl!}
                    poster={current.thumbnailUrl}
                    className="block h-auto max-h-[58vh] w-full"
                    controls={false}
                    autoPlay
                    loop
                    muted
                  />
                ) : hasThumb ? (
                  <div className="relative aspect-4/3 w-full">
                    <MediaImg
                      src={current.thumbnailUrl!}
                      alt={current.title ?? "Moment"}
                      className="viewer-kenburns absolute inset-0 block h-full max-h-[58vh] w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-linear-to-br from-[rgb(var(--accent))]/30 via-[rgb(var(--accent-deep))]/25 to-black/60 p-8 text-center">
                    <p className="serif text-headline text-primary">
                      {current.title || "—"}
                    </p>
                  </div>
                )}
                {/* Subtle inner vignette */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 shadow-[inset_0_-80px_120px_-40px_rgba(0,0,0,0.55)]"
                />
              </div>

              {/* Corner brackets — sit outside the plate so the image reads
                  as a framed artifact, not a card. */}
              <Bracket position="tl" />
              <Bracket position="tr" />
              <Bracket position="bl" />
              <Bracket position="br" />
            </div>
          </div>

          {/* Caption — serif headline + narrative */}
          <div className="relative px-1 text-left">
            {current.title && (
              <h2 className="serif leading-tight text-white" style={{ fontSize: "clamp(1.35rem, 2.6vw, 1.85rem)" }}>
                {current.title}
              </h2>
            )}

            <div className="relative mt-3">
              <div
                ref={narrativeRef}
                className="viewer-narrative max-h-32 overflow-y-auto whitespace-pre-wrap pr-1 text-sm leading-relaxed text-secondary sm:max-h-40"
              >
                {current.narrative}
              </div>
              {narrativeOverflow && (
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-black via-black/70 to-transparent"
                  />
                  <p className="label-mono mt-1.5 text-[10px] tracking-[0.18em] text-tertiary">
                    Scroll for more
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer chrome — neighbour peeks. Desktop shows title hints; mobile
          collapses to plain arrow chips so the caption doesn't fight for room. */}
      <div
        className="relative z-10 flex items-center justify-between gap-3 px-4 pb-5 sm:px-8 sm:pb-7"
        onClick={(e) => e.stopPropagation()}
      >
        <NeighbourPeek
          direction="prev"
          enabled={canPrev}
          label="Earlier"
          title={prevTitle}
          onClick={() => canPrev && onNavigate(index - 1)}
        />
        <NeighbourPeek
          direction="next"
          enabled={canNext}
          label="Later"
          title={nextTitle}
          onClick={() => canNext && onNavigate(index + 1)}
        />
      </div>

      <style jsx>{`
        @keyframes viewer-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes viewer-bg-in {
          from {
            opacity: 0;
            transform: scale(1.05);
          }
          to {
            opacity: 0.55;
            transform: scale(1);
          }
        }
        @keyframes viewer-stage-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes viewer-kenburns {
          from {
            transform: scale(1) translate3d(0, 0, 0);
          }
          to {
            transform: scale(1.06) translate3d(-1.2%, -1.2%, 0);
          }
        }
        @keyframes viewer-star-twinkle {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.4);
          }
        }
        :global(.viewer-kenburns) {
          animation: viewer-kenburns 16s ease-out forwards;
          will-change: transform;
        }
        :global(.viewer-horizon) {
          position: absolute;
          inset: auto 0 -8% 0;
          height: 42vh;
          background:
            radial-gradient(
              70% 100% at 50% 110%,
              rgba(240, 200, 154, 0.16) 0%,
              transparent 75%
            ),
            radial-gradient(
              35% 30% at 86% 58%,
              rgba(240, 200, 154, 0.08) 0%,
              transparent 75%
            );
          mix-blend-mode: screen;
          pointer-events: none;
        }
        :global(.viewer-star) {
          position: absolute;
          border-radius: 9999px;
          animation: viewer-star-twinkle ease-in-out infinite;
          will-change: opacity, transform;
        }
        :global(.viewer-narrative)::-webkit-scrollbar {
          width: 0;
          background: transparent;
        }
        :global(.viewer-narrative) {
          scrollbar-width: none;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.viewer-kenburns),
          :global(.viewer-star) {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

/** Ambient memory layer — same "memory cosmos" pattern the global body uses
 *  (violet light beams from above, champagne horizon at the bottom, iris +
 *  champagne + white star-glints), recreated inside the modal because the
 *  modal backdrop occludes the document layer.
 *
 *  Pure CSS, no canvas. Star positions/colors/timings are deterministic
 *  so SSR and CSR render identically. Honours prefers-reduced-motion via
 *  the parent <style jsx>. */
type StarColor = "iris" | "iris-soft" | "champagne" | "white";
const STAR_COLOR: Record<StarColor, string> = {
  iris: "rgba(123, 115, 253, 0.95)",
  "iris-soft": "rgba(180, 173, 255, 0.85)",
  champagne: "rgba(240, 200, 154, 0.85)",
  white: "rgba(255, 255, 255, 0.85)",
};

const STARS: Array<{
  l: number;
  t: number;
  s: number;
  c: StarColor;
  breathe: number;
  delay: number;
  glow: number;
}> = [
  // Bigger iris glints — anchors of the constellation
  { l: 12, t: 18, s: 2.6, c: "iris-soft", breathe: 6, delay: 0, glow: 10 },
  { l: 78, t: 26, s: 2.4, c: "iris-soft", breathe: 7, delay: 2, glow: 9 },
  { l: 33, t: 71, s: 2.8, c: "iris-soft", breathe: 8, delay: 4, glow: 11 },
  { l: 86, t: 78, s: 2.4, c: "iris-soft", breathe: 6.5, delay: 1, glow: 9 },
  { l: 22, t: 44, s: 2.2, c: "iris", breathe: 7, delay: 3, glow: 10 },
  { l: 68, t: 12, s: 2.2, c: "iris", breathe: 9, delay: 5, glow: 10 },
  // Champagne sparks — warm complement, used sparingly
  { l: 64, t: 46, s: 1.8, c: "champagne", breathe: 8, delay: 1.5, glow: 8 },
  { l: 22, t: 88, s: 1.6, c: "champagne", breathe: 6, delay: 3.5, glow: 6 },
  { l: 90, t: 56, s: 1.8, c: "champagne", breathe: 7.5, delay: 0.5, glow: 7 },
  // Tiny white pinpricks — distant stars, the bulk of the field
  { l: 8, t: 56, s: 1.2, c: "white", breathe: 5, delay: 0, glow: 4 },
  { l: 28, t: 36, s: 1.2, c: "white", breathe: 6, delay: 2.5, glow: 4 },
  { l: 44, t: 14, s: 1.2, c: "white", breathe: 7, delay: 1, glow: 4 },
  { l: 56, t: 84, s: 1.2, c: "white", breathe: 5.5, delay: 4, glow: 4 },
  { l: 72, t: 60, s: 1.2, c: "white", breathe: 8, delay: 3, glow: 4 },
  { l: 92, t: 12, s: 1.2, c: "white", breathe: 6, delay: 2, glow: 4 },
  { l: 4, t: 8, s: 1.0, c: "white", breathe: 7, delay: 5, glow: 3 },
  { l: 50, t: 50, s: 1.0, c: "white", breathe: 5, delay: 1.5, glow: 3 },
  { l: 18, t: 64, s: 1.2, c: "white", breathe: 6.5, delay: 3.5, glow: 4 },
  { l: 80, t: 44, s: 1.2, c: "white", breathe: 7.5, delay: 0, glow: 4 },
  { l: 38, t: 92, s: 1.0, c: "white", breathe: 6, delay: 4.5, glow: 3 },
  { l: 66, t: 8, s: 1.2, c: "white", breathe: 5.5, delay: 2, glow: 4 },
  { l: 14, t: 34, s: 1.0, c: "white", breathe: 8, delay: 1, glow: 3 },
  { l: 48, t: 28, s: 1.0, c: "white", breathe: 6, delay: 5.5, glow: 3 },
  { l: 84, t: 90, s: 1.0, c: "white", breathe: 7, delay: 3, glow: 3 },
];

function MemoryAmbient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Volumetric light rays from above — WebGL via OGL. Two stacked
          layers screen-blended: a wide saturated iris bloom for color, and
          a tighter white core inside it for the bright spotlight cone.
          Both are visibility-gated and disabled under prefers-reduced-motion
          inside the component itself. */}
      <div
        className="absolute inset-0"
        style={{ opacity: 0.9, mixBlendMode: "screen" }}
      >
        <LightRays
          raysOrigin="top-center"
          raysColor="#7B73FD"
          raysSpeed={0.55}
          lightSpread={1.15}
          rayLength={2.4}
          pulsating
          fadeDistance={1.4}
          saturation={1.0}
          followMouse={false}
          mouseInfluence={0}
          noiseAmount={0.06}
          distortion={0.05}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{ opacity: 0.65, mixBlendMode: "screen" }}
      >
        <LightRays
          raysOrigin="top-center"
          raysColor="#FFFFFF"
          raysSpeed={0.55}
          lightSpread={0.55}
          rayLength={1.7}
          pulsating
          fadeDistance={1.0}
          saturation={1.0}
          followMouse={false}
          mouseInfluence={0}
          noiseAmount={0.07}
          distortion={0.03}
        />
      </div>

      {/* Warm champagne horizon at the bottom — memory glow. */}
      <div className="viewer-horizon" />

      {/* Constellation — twinkling iris/champagne/white star-glints. */}
      {STARS.map((star, i) => (
        <span
          key={i}
          className="viewer-star"
          style={{
            left: `${star.l}%`,
            top: `${star.t}%`,
            width: `${star.s}px`,
            height: `${star.s}px`,
            background: STAR_COLOR[star.c],
            boxShadow: `0 0 ${star.glow}px ${Math.round(star.glow / 3)}px ${STAR_COLOR[star.c]}`,
            animationDuration: `${star.breathe}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/** L-shaped corner bracket sitting just outside the media plate. */
function Bracket({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const base =
    "pointer-events-none absolute h-4 w-4 sm:h-5 sm:w-5 border-white/45";
  const map: Record<typeof position, string> = {
    tl: "-top-1 -left-1 border-t border-l",
    tr: "-top-1 -right-1 border-t border-r",
    bl: "-bottom-1 -left-1 border-b border-l",
    br: "-bottom-1 -right-1 border-b border-r",
  };
  return <span aria-hidden className={`${base} ${map[position]}`} />;
}

/** Footer neighbour preview — clickable on desktop, arrow-only on mobile. */
function NeighbourPeek({
  direction,
  enabled,
  label,
  title,
  onClick,
}: {
  direction: "prev" | "next";
  enabled: boolean;
  label: string;
  title: string | null;
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  if (!enabled) {
    return <span aria-hidden className="h-9 min-w-9 flex-1" />;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? "Previous moment" : "Next moment"}
      className={`group flex max-w-[42%] items-center gap-2 rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-secondary backdrop-blur transition hover:border-white/35 hover:bg-black/55 hover:text-white sm:max-w-[36%] sm:gap-3 sm:px-4 sm:py-2 ${
        isPrev ? "" : "ml-auto flex-row-reverse text-right"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none">
        <path
          d={isPrev ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className={`hidden min-w-0 sm:block ${isPrev ? "text-left" : "text-right"}`}>
        <p className="label-mono text-[10px] tracking-[0.22em] text-tertiary group-hover:text-secondary">
          {label}
        </p>
        {title && (
          <p className="truncate serif text-xs leading-tight text-secondary group-hover:text-white">
            {title}
          </p>
        )}
      </div>
    </button>
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
        <MediaImg
          src={moment.thumbnailUrl!}
          alt={moment.title ?? "Moment"}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          onError={(e) => {
            // Hide broken image; reveal the gradient fallback that's already in the DOM.
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
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
