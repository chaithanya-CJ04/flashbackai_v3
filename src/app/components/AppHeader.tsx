"use client";

import { useRouter } from "next/navigation";
import { type ReactNode } from "react";

/** Slim per-screen top bar.
 *
 * Replaces the website-style horizontal nav. The BottomNav handles primary
 * navigation; this just shows where you are and gives you a way back. */
export function AppHeader({
  title,
  back,
  right,
}: {
  /** Optional small title shown in the centre. */
  title?: string;
  /** Either a string href, "history" to go back, or false to hide the button. */
  back?: string | "history" | false;
  /** Optional contextual control on the right (icon button etc.). */
  right?: ReactNode;
}) {
  const router = useRouter();
  const showBack = back !== false && back !== undefined;

  return (
    <header className="mb-6 flex h-12 items-center justify-between gap-3 sm:mb-8">
      <div className="flex w-12 items-center justify-start">
        {showBack && (
          <button
            type="button"
            onClick={() => {
              if (back === "history" || back === undefined) router.back();
              else if (typeof back === "string") router.push(back);
            }}
            aria-label="Back"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/28 bg-white/8 text-primary transition active:scale-[0.94] active:duration-75 active:bg-white/22 hover:border-white/45 hover:bg-white/14 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        {title ? (
          <p className="truncate label-mono text-caption text-secondary">
            {title}
          </p>
        ) : (
          <span className="relative inline-flex items-center gap-2.5">
            <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-2 rounded-full bg-[radial-gradient(closest-side,rgba(123,115,253,0.5),transparent_70%)] blur-[3px]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt=""
                className="relative h-8 w-8 rounded-[9px] shadow-[0_8px_22px_-6px_rgba(123,115,253,0.6)] ring-1 ring-white/5"
              />
            </span>
            <span className="inline-flex items-baseline gap-2">
              <span className="display-sans text-[15px] leading-none tracking-[-0.01em] text-primary">
                FLASHBACK
              </span>
              <span
                className="display-sans text-[15px] leading-none tracking-[-0.01em]"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(var(--accent-soft),1) 0%, rgba(var(--accent),1) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow: "0 0 18px rgba(180,173,255,0.35)",
                }}
              >
                AI
              </span>
            </span>
            <span className="sr-only">Flashback AI</span>
          </span>
        )}
      </div>

      <div className="flex w-12 items-center justify-end">{right}</div>
    </header>
  );
}
