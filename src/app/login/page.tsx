"use client";

import { Sparkle } from "../components/ui";
import AuthCard from "./_landing/AuthCard";

function StatusDot() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-soft))]/40" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_12px_rgba(180,173,255,0.9)]" />
    </span>
  );
}

function Bracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const cls = {
    tl: "top-0 left-0 border-t border-l",
    tr: "top-0 right-0 border-t border-r",
    bl: "bottom-0 left-0 border-b border-l",
    br: "bottom-0 right-0 border-b border-r",
  }[pos];
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute ${cls} h-3 w-3 border-[rgb(var(--accent-soft))]/50`}
    />
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:py-14">
      <div className="relative w-full max-w-md">
        {/* Hero */}
        <header className="mb-9 flex flex-col items-center text-center">
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-[-22px] -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(123,115,253,0.5),transparent_75%)] blur-md"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Flashback AI"
              className="relative h-16 w-16 rounded-[16px] shadow-[0_24px_60px_-12px_rgba(123,115,253,0.7)]"
            />
          </div>

          {/* Tech-readout strip — metadata without any real meaning, pure aesthetic */}
          <div className="mt-5 flex items-center gap-3 label-mono text-meta text-tertiary">
            <StatusDot />
            <span>Archive · v1.0</span>
            <span className="text-white/20">/</span>
            <span>STN-04</span>
          </div>

          <h1 className="mt-6 display-sans text-[clamp(2.5rem,1.6rem+4vw,4rem)] leading-[0.9] text-white">
            FLASHBACK
            <br />
            <span className="inline-flex items-center gap-3">
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(var(--accent-soft),1) 0%, rgba(var(--accent),1) 100%)",
                }}
              >
                AI
              </span>
              <Sparkle
                size={28}
                className="text-[rgb(var(--accent-soft))] drop-shadow-[0_0_14px_rgba(180,173,255,0.7)]"
              />
            </span>
          </h1>

          <p className="mt-4 max-w-88 text-[13px] leading-relaxed text-secondary">
            A private archive for the people who shaped you.
          </p>
        </header>

        {/* Auth panel with corner brackets */}
        <div className="relative">
          <Bracket pos="tl" />
          <Bracket pos="tr" />
          <Bracket pos="bl" />
          <Bracket pos="br" />
          <AuthCard />
        </div>

        <p className="mt-8 text-center label-mono text-meta text-tertiary">
          // Encrypted handshake · zero credential storage
        </p>
      </div>
    </div>
  );
}
