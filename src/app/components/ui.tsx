"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import Link from "next/link";

/** Centered column with responsive max-widths.
 *
 *  Three variants for different content shapes:
 *    - `narrow`: forms / chat / reading-room content — stays ~tight for line
 *      length even on big screens (max-w-2xl)
 *    - default: everything else — uses substantial horizontal space on desktop
 *      so the page doesn't read as "phone-in-the-middle"
 *    - `wide`: grids, galleries, dashboards — full screen-feel on ultrawide
 *
 *  Mobile is unaffected — every variant collapses to the same comfortable
 *  ~viewport-width column on phones. */
export function PageShell({
  children,
  wide = false,
  narrow = false,
}: {
  children: ReactNode;
  /** Use for grid-heavy screens (legacies gallery, explore). */
  wide?: boolean;
  /** Use for forms, chat, or single-column reading. */
  narrow?: boolean;
}) {
  let widths = "";
  if (narrow) {
    widths = "max-w-xl md:max-w-2xl";
  } else if (wide) {
    widths = "max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl";
  } else {
    widths = "max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl";
  }
  return (
    <div className="min-h-screen text-primary">
      <div
        className={`mx-auto w-full px-4 pb-32 pt-4 sm:px-6 sm:pt-6 md:px-8 md:pt-10 lg:px-12 ${widths}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Card = glassmorphic chamber, frosted with a hairline border.
 *
 *  Surface stack on every variant:
 *    - dark translucent backing (holds shape against the animated hex grid)
 *    - hairline top highlight via inset shadow (catches "light from above")
 *    - soft drop shadow for depth
 *    - `before:` pseudo adds a thin violet sheen along the top edge that
 *      brightens on hover for an "alive" feel. */
export function Card({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "subtle";
}) {
  const base =
    "group/card relative overflow-hidden rounded-2xl before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/25 before:to-transparent";
  const variants: Record<string, string> = {
    default:
      "border border-white/12 bg-[rgba(18,15,34,0.62)] backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
    glass:
      "glass shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)]",
    subtle:
      "border border-white/10 bg-[rgba(14,11,28,0.5)] backdrop-blur-md",
  };
  return (
    <div className={`${base} ${variants[variant]} ${className}`}>{children}</div>
  );
}

/** RowLink — a tappable list-row that shares the dark-glass surface with
 *  `Card`, plus the violet hover signature used on the legacy Portrait cards
 *  (border lights, drop-shadow blooms violet, radial halo fades in, left
 *  accent bar slides in, top sheen warms). Drop-in for any `<Link>` row. */
export function RowLink({
  href,
  children,
  className = "",
  prefetch,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`group relative block overflow-hidden rounded-2xl border border-white/12 bg-[rgba(18,15,34,0.62)] backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color,transform] duration-300 hover:border-[rgb(var(--accent-soft))]/45 hover:bg-[rgba(28,22,52,0.7)] hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)] ${className}`}
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
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b from-transparent via-[rgb(var(--accent-soft))] to-transparent opacity-0 transition group-hover:opacity-100"
      />
      <div className="relative">{children}</div>
    </Link>
  );
}

/** Spinner — kept as a ring for tight inline use (buttons, labels).
 *  For larger waiting moments, prefer <BreathDots /> below. */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border border-white/15 border-t-[rgb(var(--accent-soft))] align-middle ${className}`}
    />
  );
}

/** Three rising dots in the brand color — used for "thinking / loading"
 *  moments. Pure CSS animation, GPU-cheap (opacity + transform). */
export function BreathDots() {
  return (
    <span className="breath-dots" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

/** Sparkle icon — the universal "AI is doing something" signifier.
 *  4-point star with two accent sparkles, generously sized in the viewBox
 *  so it reads clearly at small render sizes. Inherits currentColor. */
export function Sparkle({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <path
        d="M12 2l1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2z"
        fill="currentColor"
      />
      <path
        d="M19 13l.8 2.7L22.5 16.5l-2.7.8L19 20l-.8-2.7L15.5 16.5l2.7-.8L19 13z"
        fill="currentColor"
      />
      <path
        d="M6 16l.8 2.7L9.5 19.5l-2.7.8L6 23l-.8-2.7L2.5 19.5l2.7-.8L6 16z"
        fill="currentColor"
      />
    </svg>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "minimal";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  if (variant === "primary") {
    return (
      <button
        className={`cta-pill text-sm sm:text-[15px] ${className}`}
        {...rest}
      >
        <span className="inline-flex items-center gap-2">{children}</span>
      </button>
    );
  }
  const base =
    "group relative inline-flex items-center justify-center gap-2 text-xs font-medium tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40";
  const map: Record<Exclude<ButtonVariant, "primary">, string> = {
    secondary:
      "rounded-full border border-white/12 bg-white/4 px-5 py-2.5 text-primary backdrop-blur hover:border-white/30 hover:bg-white/7 hover:text-white",
    ghost:
      "rounded-full px-3 py-1.5 uppercase tracking-[0.25em] text-meta text-tertiary hover:text-white",
    danger:
      "rounded-full border border-red-300/25 bg-red-500/6 px-4 py-2 text-red-200 hover:bg-red-500/12",
    minimal:
      "px-1 py-1 uppercase tracking-[0.25em] text-meta text-secondary hover:text-white border-b border-transparent hover:border-white/40",
  };
  return (
    <button className={`${base} ${map[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full border-0 border-b border-white/10 bg-transparent px-0 py-2 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/40 ${className}`}
      {...rest}
    />
  );
}

export function Textarea({
  className = "",
  ref,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      ref={ref}
      className={`w-full resize-none border-0 border-b border-white/10 bg-transparent px-0 py-2 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/40 ${className}`}
      {...rest}
    />
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-xl border border-red-300/20 bg-red-500/6 px-3 py-2 text-xs text-red-200/90">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/8 bg-linear-to-b from-white/2 to-transparent px-6 py-16 text-center">
      <div
        className="brand-stack opacity-60"
        aria-hidden
      >
        <span />
      </div>
      <p className="serif text-2xl text-secondary">{title}</p>
      {hint && (
        <p className="max-w-sm text-xs leading-relaxed text-tertiary">{hint}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Eyebrow label — small uppercase mono for sectioning. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

/** Tech-readout strip + headline. The signature hero pattern across screens.
 *  Use for every primary screen so they share visual DNA. */
export function ScreenIntro({
  module,
  meta,
  title,
  subtitle,
  accent = "default",
}: {
  /** Short module name in mono caps (e.g. "Vault", "Rewards"). */
  module: string;
  /** Optional secondary readout (e.g. "03 unclaimed"). */
  meta?: string;
  /** The big headline. Plain text or two-line: pass an object with top + accent. */
  title: string | { top: string; accent: string };
  subtitle?: string;
  /** Color of the gradient accent line on the title. */
  accent?: "default" | "warm" | "mint";
}) {
  const accentBg =
    accent === "warm"
      ? "linear-gradient(180deg, rgba(var(--warm),1) 0%, rgba(var(--warm-deep),1) 100%)"
      : accent === "mint"
        ? "linear-gradient(180deg, rgba(var(--mint),1) 0%, rgba(var(--accent-soft),0.85) 100%)"
        : "linear-gradient(180deg, rgba(var(--accent-soft),1) 0%, rgba(var(--accent),1) 100%)";

  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-soft))]/40" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.9)]" />
        </span>
        <span>{module}</span>
        {meta && (
          <>
            <span className="text-white/20">/</span>
            <span>{meta}</span>
          </>
        )}
      </div>

      {typeof title === "string" ? (
        <h1 className="display-sans mt-4 text-[clamp(2rem,1.4rem+3vw,3rem)] leading-[0.95] text-white">
          {title}
        </h1>
      ) : (
        <h1 className="display-sans mt-4 text-[clamp(2rem,1.4rem+3vw,3rem)] leading-[0.95] text-white">
          {title.top}
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: accentBg }}
          >
            {title.accent}
          </span>
        </h1>
      )}

      {subtitle && (
        <p className="mt-4 max-w-md text-body text-secondary">{subtitle}</p>
      )}
    </section>
  );
}

/** A hairline divider with optional centered label. */
export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px w-full bg-white/6" />;
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/6" />
      <span className="eyebrow">{label}</span>
      <div className="h-px flex-1 bg-white/6" />
    </div>
  );
}

/** Numbered step indicator (refs use this for multi-step flows). */
export function StepIndicator({
  steps,
  current,
}: {
  steps: Array<{ id: string; label: string }>;
  current: string;
}) {
  const activeIndex = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex w-full items-start">
      {steps.map((s, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        return (
          <div
            key={s.id}
            className={`flex items-start ${i < steps.length - 1 ? "flex-1" : ""}`}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                  isActive
                    ? "bg-[rgb(var(--accent))] text-white shadow-[0_0_24px_rgba(138,168,255,0.6)]"
                    : isPast
                      ? "bg-white/15 text-white"
                      : "bg-white/4 text-tertiary ring-1 ring-white/10"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`whitespace-nowrap label-mono text-meta ${
                  isActive ? "text-white" : "text-tertiary"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 mt-3.5 h-px flex-1 transition sm:mx-3 ${
                  isPast ? "bg-white/30" : "bg-white/8"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Pill tag/chip — for category selection. */
export function Chip({
  active,
  children,
  onClick,
  className = "",
  type = "button",
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-xs transition ${
        active
          ? "border-[rgb(var(--accent-soft))]/50 bg-[rgb(var(--accent))]/15 text-white"
          : "border-white/12 bg-white/3 text-secondary hover:border-white/25 hover:text-white"
      } ${className}`}
    >
      {children}
    </button>
  );
}
