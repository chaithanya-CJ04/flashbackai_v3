"use client";

import { type ReactNode, useEffect, useRef } from "react";

/** Horizontal carousel where each child is bent along an arc.
 *
 *  Physics:
 *    - Single position-velocity model (no target/lerp soup).
 *    - During drag: position is set directly from cursor delta — finger is
 *      stuck to the deck, zero lag.
 *    - On release: velocity = pointer's instantaneous velocity × boost,
 *      then each frame position += velocity and velocity *= inertia.
 *      A flick coasts naturally to a stop.
 *    - Wheel/trackpad ticks add to velocity (also decays) so scrolling feels
 *      kinetic too, not laggy.
 *
 *  Layout reads are cached (ResizeObserver) — the rAF loop only writes
 *  `transform` / `opacity` on each card. GPU-composited throughout. */
export function CurvedDeck({
  children,
  bend = 70,
  rotation = 7,
  wheelSpeed = 0.7,
  dragMultiplier = 1.1,
  inertia = 0.95,
  inertiaBoost = 16,
  maxVelocity = 90,
  className = "",
}: {
  children: ReactNode[];
  /** Pixel Y-offset at the viewport edges (positive = sink down at edges). */
  bend?: number;
  /** Degrees of rotation at the viewport edges. */
  rotation?: number;
  /** Multiplier on each wheel/trackpad delta when added to velocity. */
  wheelSpeed?: number;
  /** Multiplier applied to cursor delta during drag (1.0 = 1:1). */
  dragMultiplier?: number;
  /** Per-frame velocity decay (0–1). Higher = longer coast. */
  inertia?: number;
  /** How much pointer velocity (px/ms) is converted to scroll velocity. */
  inertiaBoost?: number;
  /** Velocity clamp so a vigorous flick can't fly off into oblivion. */
  maxVelocity?: number;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    let position = 0;
    let velocity = 0;
    let rafId = 0;

    let isDown = false;
    let startX = 0;
    let startPosition = 0;
    let dragDist = 0;
    let suppressClickUntil = 0;
    let lastPointerX = 0;
    let lastPointerT = 0;
    let pointerVelocity = 0; // px/ms, EMA-smoothed

    // Cached layout — refreshed only on resize / mutation.
    let cardOffsets: number[] = [];
    let cardWidths: number[] = [];
    let viewportWidth = 0;
    let viewportLeft = 0;
    let maxPosition = 0;

    const measure = () => {
      const cards = cardRefs.current;
      cardOffsets = cards.map((c) => (c ? c.offsetLeft : 0));
      cardWidths = cards.map((c) => (c ? c.offsetWidth : 0));
      const r = viewport.getBoundingClientRect();
      viewportWidth = r.width;
      viewportLeft = r.left;
      maxPosition = Math.max(0, track.scrollWidth - viewportWidth);
    };
    // Run after layout settles.
    requestAnimationFrame(measure);

    const ro = new ResizeObserver(() => measure());
    ro.observe(viewport);
    ro.observe(track);
    window.addEventListener("resize", measure);

    const clampPosition = () => {
      if (position < 0) {
        position = 0;
        if (velocity < 0) velocity = 0;
      } else if (position > maxPosition) {
        position = maxPosition;
        if (velocity > 0) velocity = 0;
      }
    };

    const clampVelocity = () => {
      if (velocity > maxVelocity) velocity = maxVelocity;
      else if (velocity < -maxVelocity) velocity = -maxVelocity;
    };

    const applyTransforms = () => {
      const center = viewportLeft + viewportWidth / 2;
      const half = viewportWidth / 2 || 1;
      const cards = cardRefs.current;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (!card) continue;
        // Analytic card-centre on screen — no layout read.
        const cardCenter =
          viewportLeft + cardOffsets[i] - position + cardWidths[i] / 2;
        const distance = cardCenter - center;
        const n = Math.max(-1, Math.min(1, distance / half));
        const arc = bend * (1 - Math.sqrt(Math.max(0, 1 - n * n)));
        const rot = n * rotation;
        const fade = 1 - Math.abs(n) * 0.32;
        card.style.transform = `translate3d(0, ${arc.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
        card.style.opacity = fade.toFixed(2);
      }
    };

    const tick = () => {
      // While dragging, position is set directly by the pointer — skip physics.
      if (!isDown) {
        if (Math.abs(velocity) > 0.04) {
          position += velocity;
          velocity *= inertia;
          clampPosition();
        } else {
          velocity = 0;
        }
      }
      track.style.transform = `translate3d(${(-position).toFixed(2)}px, 0, 0)`;
      applyTransforms();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onWheel = (e: WheelEvent) => {
      // Pick the larger axis so trackpad horizontal-swipe also works.
      const dy = e.deltaY ?? 0;
      const dx = e.deltaX ?? 0;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      // Feed wheel into velocity (not position) so it shares the same decay
      // curve as a flick — continuous physics, no lurches.
      velocity += delta * wheelSpeed;
      clampVelocity();
    };

    let onWindowMove: ((e: PointerEvent) => void) | null = null;
    let onWindowUp: ((e: PointerEvent) => void) | null = null;

    const detachDragListeners = () => {
      if (onWindowMove) window.removeEventListener("pointermove", onWindowMove);
      if (onWindowUp) {
        window.removeEventListener("pointerup", onWindowUp);
        window.removeEventListener("pointercancel", onWindowUp);
      }
      onWindowMove = null;
      onWindowUp = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return;
      isDown = true;
      startX = e.clientX;
      startPosition = position;
      dragDist = 0;
      velocity = 0; // halt any inertia immediately on touch
      lastPointerX = e.clientX;
      lastPointerT = performance.now();
      pointerVelocity = 0;
      viewport.style.cursor = "grabbing";

      onWindowMove = (ev: PointerEvent) => {
        if (!isDown) return;
        const delta = (startX - ev.clientX) * dragMultiplier;
        const abs = Math.abs(delta);
        if (abs > dragDist) dragDist = abs;
        position = startPosition + delta;
        clampPosition();

        // Velocity EMA — stable estimate without sudden spikes.
        const now = performance.now();
        const dt = Math.max(1, now - lastPointerT);
        const rawV = ((lastPointerX - ev.clientX) * dragMultiplier) / dt;
        pointerVelocity = pointerVelocity * 0.55 + rawV * 0.45;
        lastPointerX = ev.clientX;
        lastPointerT = now;
      };

      onWindowUp = () => {
        if (!isDown) return;
        isDown = false;
        viewport.style.cursor = "grab";
        if (dragDist > 6) {
          suppressClickUntil = performance.now() + 200;
          velocity = pointerVelocity * inertiaBoost;
          clampVelocity();
        } else {
          velocity = 0;
        }
        detachDragListeners();
      };

      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", onWindowUp);
      window.addEventListener("pointercancel", onWindowUp);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    viewport.addEventListener("wheel", onWheel, { passive: true });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("click", onClickCapture, { capture: true });

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("click", onClickCapture, { capture: true });
      detachDragListeners();
    };
  }, [bend, rotation, wheelSpeed, dragMultiplier, inertia, inertiaBoost, maxVelocity]);

  return (
    <div
      ref={viewportRef}
      className={`relative cursor-grab overflow-hidden ${className}`}
      style={{ touchAction: "pan-y" }}
    >
      <div
        ref={trackRef}
        className="flex items-center gap-4 will-change-transform sm:gap-6"
        style={{ width: "max-content" }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) cardRefs.current[i] = el;
            }}
            className="shrink-0 will-change-transform"
            style={{
              transformOrigin: "center center",
              transition: "opacity 200ms ease",
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
