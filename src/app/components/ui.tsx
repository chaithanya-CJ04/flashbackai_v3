"use client";

import {
  ReactNode,
  ButtonHTMLAttributes,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
    // Bumped past xl:7xl so dashboards (home grid + 25% rail, explore,
    // person hub) can actually breathe on 1080p+ monitors instead of
    // sitting in a centered phone-shaped column.
    widths = "max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-[1480px] 2xl:max-w-[1640px]";
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
    "group/card relative overflow-hidden rounded-2xl before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/35 before:to-transparent";
  const variants: Record<string, string> = {
    default:
      "border border-white/22 bg-[rgba(18,15,34,0.82)] backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.10)]",
    glass:
      "glass shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)]",
    subtle:
      "border border-white/20 bg-[rgba(14,11,28,0.72)] backdrop-blur-md",
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
      className={`group relative block overflow-hidden rounded-2xl border border-white/24 bg-[rgba(18,15,34,0.82)] backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.10)] transition-[border-color,box-shadow,background-color,transform] duration-300 hover:border-[rgb(var(--accent-soft))]/60 hover:bg-[rgba(28,22,52,0.88)] hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5),inset_0_1px_0_0_rgba(255,255,255,0.14)] active:scale-[0.985] active:duration-75 active:bg-[rgba(32,24,58,0.92)] active:shadow-[0_10px_30px_-12px_rgba(123,115,253,0.6),inset_0_1px_0_0_rgba(255,255,255,0.16)] ${className}`}
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

/* ────────────────────────────────────────────────────────────────────
   THEME ICONS
   ────────────────────────────────────────────────────────────────────
   24×24 stroke icons keyed by a theme's slug or displayName. The badge
   pill maps each Flashback life-area theme (Friendships, Career, Family,
   Beliefs & Values, Milestones, etc.) to its own pictogram so the locked
   row reads as a meaningful field of life, not a list of empty dots.

   The lookup is forgiving — checks slug first, then falls back to a
   substring scan of the display name. Add new entries here when the
   backend ships a new universal theme. */

type IconKey =
  | "friendships"
  | "career"
  | "family"
  | "beliefs"
  | "milestones"
  | "love"
  | "childhood"
  | "health"
  | "adventure"
  | "learning"
  | "creativity"
  | "loss"
  | "wisdom"
  | "default";

function pickIconKey(slug?: string | null, name?: string | null): IconKey {
  const s = `${slug ?? ""} ${name ?? ""}`.toLowerCase();
  if (/friend/.test(s)) return "friendships";
  if (/career|work|profession|job/.test(s)) return "career";
  if (/family|parent|sibling|kin/.test(s)) return "family";
  if (/belief|value|faith|spirit|relig/.test(s)) return "beliefs";
  if (/milestone|achievement|accomplish/.test(s)) return "milestones";
  if (/love|romance|partner|marriage/.test(s)) return "love";
  if (/child|origin|youth|early/.test(s)) return "childhood";
  if (/health|body|wellness|fitness/.test(s)) return "health";
  if (/adventure|travel|journey|explore/.test(s)) return "adventure";
  if (/learn|educat|school|study/.test(s)) return "learning";
  if (/creat|art|craft|music|writ/.test(s)) return "creativity";
  if (/loss|grief|mourn|memorial/.test(s)) return "loss";
  if (/wisdom|legacy|elder|reflect/.test(s)) return "wisdom";
  return "default";
}

const ICON_STROKE = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Themed icon for the life-area badges on the Person hub. */
export function ThemeIcon({
  slug,
  name,
  size = 18,
  className = "",
}: {
  slug?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const key = pickIconKey(slug, name);
  const common = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    "aria-hidden": true,
    className,
    ...ICON_STROKE,
  } as const;

  switch (key) {
    case "friendships":
      // Two intersecting heads — companionship without romance.
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="2.6" />
          <circle cx="15" cy="9" r="2.6" />
          <path d="M4.5 18c.7-2.4 2.6-3.8 4.5-3.8s3.8 1.4 4.5 3.8" />
          <path d="M10.5 18c.7-2.4 2.6-3.8 4.5-3.8s3.8 1.4 4.5 3.8" />
        </svg>
      );
    case "career":
      // Briefcase with a clean handle.
      return (
        <svg {...common}>
          <rect x="3.5" y="8" width="17" height="11" rx="2" />
          <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" />
          <path d="M3.5 13h17" />
        </svg>
      );
    case "family":
      // Three figures — parent + child silhouettes.
      return (
        <svg {...common}>
          <circle cx="7" cy="7.5" r="2.2" />
          <circle cx="17" cy="7.5" r="2.2" />
          <circle cx="12" cy="11.5" r="1.6" />
          <path d="M3 18.5c.6-2.4 2.4-3.8 4-3.8s3.4 1.4 4 3.8" />
          <path d="M13 18.5c.6-2.4 2.4-3.8 4-3.8s3.4 1.4 4 3.8" />
        </svg>
      );
    case "beliefs":
      // Flame — guiding inner principle.
      return (
        <svg {...common}>
          <path d="M12 3c1.6 3 4.5 4.6 4.5 8.2A4.5 4.5 0 0 1 12 16a4.5 4.5 0 0 1-4.5-4.8C7.5 8.4 9.4 7 10 4.8c.2.6.7 1.4 2 1.6" />
          <path d="M9.5 20.5h5" />
        </svg>
      );
    case "milestones":
      // Trophy on a stand — life landmarks.
      return (
        <svg {...common}>
          <path d="M8 4h8v4a4 4 0 0 1-8 0V4z" />
          <path d="M16 5.5h2.5a1.5 1.5 0 0 1 0 3H16" />
          <path d="M8 5.5H5.5a1.5 1.5 0 0 0 0 3H8" />
          <path d="M12 12v4" />
          <path d="M9 20h6" />
          <path d="M10 17h4l-.5 3h-3z" />
        </svg>
      );
    case "love":
      // Heart with a soft inner accent — distinguishes from friendships.
      return (
        <svg {...common}>
          <path d="M12 19.5s-7-4.3-7-9.2A4 4 0 0 1 12 7a4 4 0 0 1 7 3.3c0 4.9-7 9.2-7 9.2z" />
        </svg>
      );
    case "childhood":
      // Paper kite — early years, lightness.
      return (
        <svg {...common}>
          <path d="M12 3l6 6-6 6-6-6 6-6z" />
          <path d="M9 9l6 6" />
          <path d="M12 15l-2 6" />
        </svg>
      );
    case "health":
      // Leaf — wellness, vitality.
      return (
        <svg {...common}>
          <path d="M20 4c0 8-5 13-13 13C5 11 10 4 20 4z" />
          <path d="M7 17L4 20" />
        </svg>
      );
    case "adventure":
      // Compass — travel, journey.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M14.5 9.5L13 13.5 9 15l1.5-4 4-1.5z" />
        </svg>
      );
    case "learning":
      // Open book.
      return (
        <svg {...common}>
          <path d="M3.5 5.5c3 0 5.5 1 8.5 2.5 3-1.5 5.5-2.5 8.5-2.5v11c-3 0-5.5 1-8.5 2.5-3-1.5-5.5-2.5-8.5-2.5v-11z" />
          <path d="M12 8v11" />
        </svg>
      );
    case "creativity":
      // Spark / starburst.
      return (
        <svg {...common}>
          <path d="M12 3v5" />
          <path d="M12 16v5" />
          <path d="M3 12h5" />
          <path d="M16 12h5" />
          <path d="M5.6 5.6l3.5 3.5" />
          <path d="M14.9 14.9l3.5 3.5" />
          <path d="M18.4 5.6l-3.5 3.5" />
          <path d="M9.1 14.9l-3.5 3.5" />
        </svg>
      );
    case "loss":
      // Candle — memorial, mourning.
      return (
        <svg {...common}>
          <path d="M12 3c.8 1.5 2 2 2 3.3a2 2 0 0 1-4 0c0-1.3 1.2-1.8 2-3.3z" />
          <rect x="9" y="9" width="6" height="11" rx="1.2" />
          <path d="M12 9v11" />
        </svg>
      );
    case "wisdom":
      // Laurel half-wreath — legacy, reflection.
      return (
        <svg {...common}>
          <path d="M12 20V8" />
          <path d="M8 9c-.5-2 .5-4 3-5" />
          <path d="M8 13c-.5-2 .5-3.5 3-4" />
          <path d="M8 17c-.5-2 .5-3.5 3-4" />
          <path d="M16 9c.5-2-.5-4-3-5" />
          <path d="M16 13c.5-2-.5-3.5-3-4" />
          <path d="M16 17c.5-2-.5-3.5-3-4" />
        </svg>
      );
    default:
      // Subtle sparkle — emergent / unknown theme. Same shape as the brand
      // Sparkle but single-pointed so it doesn't compete with the AI sparkle.
      return (
        <svg {...common}>
          <path d="M12 4l1.5 5.5L19 11l-5.5 1.5L12 18l-1.5-5.5L5 11l5.5-1.5L12 4z" />
        </svg>
      );
  }
}

/* ────────────────────────────────────────────────────────────────────
   ENTITY ICONS
   ────────────────────────────────────────────────────────────────────
   24×24 stroke icons keyed by `entity.kind` — used as the fallback when
   an entity has no imageUrl / thumbnailUrl. Same visual language as
   ThemeIcon above. */

type EntityIconKey =
  | "person"
  | "place"
  | "organization"
  | "object"
  | "event"
  | "pet"
  | "vehicle"
  | "media"
  | "food"
  | "default";

function pickEntityKey(kind?: string | null, name?: string | null): EntityIconKey {
  const s = `${kind ?? ""} ${name ?? ""}`.toLowerCase();
  if (/person|people|human|friend|relative|family/.test(s)) return "person";
  if (/place|location|city|town|country|address|venue/.test(s)) return "place";
  if (/org|company|school|university|team|group|institution/.test(s)) return "organization";
  if (/event|wedding|birthday|funeral|holiday|trip|ceremony/.test(s)) return "event";
  if (/pet|dog|cat|animal/.test(s)) return "pet";
  if (/car|vehicle|bike|truck|motorcycle|boat/.test(s)) return "vehicle";
  if (/song|movie|book|album|film|show|media/.test(s)) return "media";
  if (/food|meal|recipe|dish|dinner|drink/.test(s)) return "food";
  if (/object|item|thing|possession/.test(s)) return "object";
  return "default";
}

export function EntityIcon({
  kind,
  name,
  size = 18,
  className = "",
}: {
  kind?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const key = pickEntityKey(kind, name);
  const common = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    "aria-hidden": true,
    className,
    ...ICON_STROKE,
  } as const;

  switch (key) {
    case "person":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5 20c1-3.4 3.6-5.2 7-5.2s6 1.8 7 5.2" />
        </svg>
      );
    case "place":
      return (
        <svg {...common}>
          <path d="M12 21s-7-6.2-7-11.2A7 7 0 0 1 19 9.8C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.8" r="2.6" />
        </svg>
      );
    case "organization":
      return (
        <svg {...common}>
          <path d="M4 20V8.5l8-4 8 4V20" />
          <path d="M4 20h16" />
          <path d="M9 20v-5h6v5" />
          <path d="M9 11h.01M12 11h.01M15 11h.01" />
        </svg>
      );
    case "event":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <path d="M4 10h16" />
          <path d="M9 4v4M15 4v4" />
        </svg>
      );
    case "pet":
      return (
        <svg {...common}>
          <circle cx="6.5" cy="9" r="1.6" />
          <circle cx="10" cy="6.2" r="1.6" />
          <circle cx="14" cy="6.2" r="1.6" />
          <circle cx="17.5" cy="9" r="1.6" />
          <path d="M8 16c0-2.5 2-4.5 4-4.5s4 2 4 4.5c0 1.8-1.5 2.6-2.6 3.4-.8.6-2 .6-2.8 0C9.5 18.6 8 17.8 8 16z" />
        </svg>
      );
    case "vehicle":
      return (
        <svg {...common}>
          <path d="M4 14l1.6-5a2 2 0 0 1 1.9-1.4h9a2 2 0 0 1 1.9 1.4L20 14" />
          <rect x="3" y="14" width="18" height="4" rx="1.2" />
          <circle cx="7.5" cy="18" r="1.4" />
          <circle cx="16.5" cy="18" r="1.4" />
        </svg>
      );
    case "media":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M10 9.5v5l4-2.5-4-2.5z" />
        </svg>
      );
    case "food":
      return (
        <svg {...common}>
          <path d="M4 11h16" />
          <path d="M5 11a7 7 0 0 1 14 0" />
          <path d="M3 14h18l-2 5H5l-2-5z" />
        </svg>
      );
    case "object":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M5 9h14M9 5v14" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
  }
}

/** Square thumbnail tile for an Entity in lists. Renders the
 *  `thumbnailUrl` (or `imageUrl` as fallback) when present; otherwise a
 *  kind-themed icon on the brand-violet sheen.
 *
 *  Pass `size` to control the square dimension. The component handles
 *  load-error swap to icon so a broken URL never leaves a blank square. */
export function EntityMedia({
  entity,
  size = 56,
  rounded = "rounded-xl",
  className = "",
}: {
  entity: {
    kind?: string | null;
    name?: string | null;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const candidates = [entity.thumbnailUrl, entity.imageUrl].filter(
    (u): u is string => !!u && /^https?:\/\//i.test(u)
  );
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [entity.imageUrl, entity.thumbnailUrl]);

  const src = !failed ? candidates[idx] : undefined;

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-white/12 bg-linear-to-br from-[rgb(var(--accent))]/22 via-[rgb(var(--accent-deep))]/18 to-black/35 ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={entity.name ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            if (idx < candidates.length - 1) setIdx((i) => i + 1);
            else setFailed(true);
          }}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-[rgb(var(--accent-soft))]">
          <EntityIcon
            kind={entity.kind}
            name={entity.name}
            size={Math.round(size * 0.5)}
          />
        </span>
      )}
    </div>
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
      <button className={`cta-pill text-body ${className}`} {...rest}>
        <span className="inline-flex items-center gap-2">{children}</span>
      </button>
    );
  }
  const base =
    "group relative inline-flex items-center justify-center gap-2 text-caption font-medium tracking-wide transition active:scale-[0.97] active:duration-75 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  const map: Record<Exclude<ButtonVariant, "primary">, string> = {
    secondary:
      "rounded-full border border-white/30 bg-white/8 px-6 py-3 text-primary backdrop-blur hover:border-white/50 hover:bg-white/14 hover:text-white active:bg-white/18",
    ghost:
      "rounded-full border border-white/20 bg-white/4 px-4 py-2.5 uppercase tracking-[0.18em] text-meta text-secondary hover:border-white/40 hover:bg-white/8 hover:text-white active:bg-white/12",
    danger:
      "rounded-full border border-red-300/45 bg-red-500/15 px-5 py-2.5 text-red-100 hover:bg-red-500/25 active:bg-red-500/35",
    minimal:
      "px-2 py-1.5 uppercase tracking-[0.18em] text-meta text-secondary hover:text-white border-b-2 border-transparent hover:border-white/60 active:text-white",
  };
  return (
    <button className={`${base} ${map[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Input — bordered field with a subtle fill so older eyes can see exactly
 *  where to tap. Replaced the editorial underline-only style: invisible
 *  affordances are an anti-pattern for the target audience (memory care,
 *  elderly users). Still on-brand via the dark glass surface + violet
 *  focus ring. */
export function Input({
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-white/28 bg-white/5 px-4 py-3.5 text-body text-white outline-none transition placeholder:text-white/55 hover:border-white/40 focus:border-[rgb(var(--accent-soft))]/70 focus:bg-white/8 focus:shadow-[0_0_0_4px_rgba(180,173,255,0.18)] ${className}`}
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
      className={`w-full resize-none rounded-xl border border-white/28 bg-white/5 px-4 py-3.5 text-body text-white outline-none transition placeholder:text-white/55 hover:border-white/40 focus:border-[rgb(var(--accent-soft))]/70 focus:bg-white/8 focus:shadow-[0_0_0_4px_rgba(180,173,255,0.18)] ${className}`}
      {...rest}
    />
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="text-caption flex items-start gap-3 rounded-xl border border-red-300/50 bg-red-500/18 px-4 py-3 text-red-50 shadow-[0_8px_24px_-12px_rgba(248,113,113,0.4)]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="mt-0.5 h-5 w-5 shrink-0 text-red-200"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1" fill="currentColor" />
      </svg>
      <span>{children}</span>
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
    <div className="step-in flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-white/22 bg-linear-to-b from-white/5 to-transparent px-6 py-12 text-center sm:py-16">
      <div className="brand-stack opacity-85" aria-hidden>
        <span />
      </div>
      <p className="serif text-3xl text-primary">{title}</p>
      {hint && (
        <p className="text-body max-w-sm leading-relaxed text-secondary">
          {hint}
        </p>
      )}
      {action && <div className="step-in-delayed mt-2">{action}</div>}
    </div>
  );
}

/** Skeleton — shimmering placeholder block. Pair widths/heights to the
 *  real content's shape so the layout doesn't jump when data arrives. */
export function Skeleton({
  className = "",
  rounded = "rounded-xl",
}: {
  className?: string;
  rounded?: string;
}) {
  return <div aria-hidden className={`skeleton ${rounded} ${className}`} />;
}

/** SkeletonCard — full glassmorphic card silhouette. Use one per item
 *  in a list while the real list is loading. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`skeleton-card relative p-5 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="skeleton h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-3/5 rounded-md" />
          <div className="skeleton h-3 w-2/5 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** PageLoader — branded full-page waiting state. Replaces lonely spinners.
 *  Centers the brand stack, a short label, and the breath dots so the
 *  user knows the app is awake even on a slow connection. */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
      <div className="brand-stack opacity-90" aria-hidden>
        <span />
      </div>
      <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
        <BreathDots />
        <span>{label}</span>
      </div>
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
        <h1 className="display-sans text-display mt-4 leading-[0.95] text-white">
          {title}
        </h1>
      ) : (
        <h1 className="display-sans text-display mt-4 leading-[0.95] text-white">
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
            <div className="flex flex-col items-center gap-2">
              <div
                className={`text-caption flex h-10 w-10 items-center justify-center rounded-full font-semibold transition ${
                  isActive
                    ? "bg-[rgb(var(--accent))] text-white shadow-[0_0_24px_rgba(138,168,255,0.65)] ring-2 ring-[rgb(var(--accent-soft))]/40"
                    : isPast
                      ? "bg-white/30 text-white"
                      : "bg-white/8 text-secondary ring-2 ring-white/22"
                }`}
              >
                {isPast ? (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M5 12l4 4 10-10"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`whitespace-nowrap label-mono text-caption ${
                  isActive ? "text-white" : isPast ? "text-secondary" : "text-tertiary"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 mt-5 h-0.5 flex-1 rounded-full transition sm:mx-3 ${
                  isPast ? "bg-white/45" : "bg-white/15"
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
      aria-pressed={active}
      className={`text-caption rounded-full border px-5 py-2.5 font-medium transition active:scale-[0.96] active:duration-75 ${
        active
          ? "border-[rgb(var(--accent-soft))]/70 bg-[rgb(var(--accent))]/65 text-white shadow-[0_8px_24px_-10px_rgba(123,115,253,0.7)]"
          : "border-white/28 bg-white/6 text-primary hover:border-white/50 hover:bg-white/12 hover:text-white active:bg-white/16"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Round 44×44 icon button — same dark-glass affordance as the back arrow.
 *  Use for any header / inline icon action (menu, share, edit).
 *  Meets iOS minimum touch target (44pt). */
export function IconButton({
  children,
  onClick,
  label,
  className = "",
  variant = "default",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  className?: string;
  variant?: "default" | "accent";
  type?: "button" | "submit";
}) {
  const styles =
    variant === "accent"
      ? "border-[rgb(var(--accent-soft))]/55 bg-[rgb(var(--accent))]/25 text-white hover:bg-[rgb(var(--accent))]/40 active:bg-[rgb(var(--accent))]/55"
      : "border-white/28 bg-white/8 text-primary hover:border-white/45 hover:bg-white/14 hover:text-white active:bg-white/22";
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      className={`grid h-11 w-11 place-items-center rounded-full border ${styles} transition active:scale-[0.94] active:duration-75 ${className}`}
    >
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────
   TOAST
   ────────────────────────────────────────────────────────────────────
   Lightweight non-blocking notification. Mount <ToastProvider> once
   inside the layout, then call useToast().show("…") from any component.
   Each toast self-dismisses after 4s; tap to dismiss early.
   ──────────────────────────────────────────────────────────────────── */

type ToastVariant = "default" | "success" | "error";
type Toast = { id: number; text: string; variant: ToastVariant };
type ToastContextValue = {
  show: (text: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const show = useCallback(
    (text: string, variant: ToastVariant = "default") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, text, variant }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { show: () => {} };
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4 pt-safe sm:top-5"
    >
      {toasts.map((t) => (
        <ToastBubble key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastBubble({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const tones: Record<ToastVariant, string> = {
    default:
      "border-white/24 bg-[rgba(18,15,34,0.92)] text-primary",
    success:
      "border-[rgb(var(--mint))]/45 bg-[rgba(18,32,28,0.92)] text-white",
    error:
      "border-red-300/45 bg-[rgba(40,16,22,0.92)] text-red-50",
  };
  return (
    <button
      type="button"
      onClick={onDismiss}
      className={`pointer-events-auto step-in flex max-w-md items-center gap-3 rounded-full border px-4 py-2.5 text-caption font-medium shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl active:scale-[0.97] active:duration-75 ${tones[toast.variant]}`}
    >
      {toast.variant === "success" && (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[rgb(var(--mint))]" aria-hidden>
          <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {toast.variant === "error" && (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-red-200" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 7v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
      )}
      <span className="text-left">{toast.text}</span>
    </button>
  );
}

/** Online/offline status banner — auto-detects connectivity and slides in
 *  when the user goes offline. Critical for demos on flaky venue Wi-Fi. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      className="step-in fixed inset-x-0 top-0 z-50 mx-auto flex max-w-md items-center justify-center gap-2 rounded-b-2xl border border-white/20 border-t-0 bg-[rgba(40,16,22,0.92)] px-4 py-2 text-caption font-medium text-red-50 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl pt-safe"
    >
      <span className="h-2 w-2 rounded-full bg-red-300 live-glow" aria-hidden />
      You&rsquo;re offline. Some things may not work.
    </div>
  );
}
