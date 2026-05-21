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
    <header className="mb-6 flex h-10 items-center justify-between gap-3 sm:mb-8">
      <div className="flex w-12 items-center justify-start">
        {showBack && (
          <button
            type="button"
            onClick={() => {
              if (back === "history" || back === undefined) router.back();
              else if (typeof back === "string") router.push(back);
            }}
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/3 text-secondary transition hover:border-white/25 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
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
          <span className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Flashback AI"
              className="h-7 w-7 rounded-[8px] shadow-[0_4px_16px_-2px_rgba(123,115,253,0.5)]"
            />
            <span className="label-mono text-meta text-secondary">
              Flashback AI
            </span>
          </span>
        )}
      </div>

      <div className="flex w-12 items-center justify-end">{right}</div>
    </header>
  );
}
