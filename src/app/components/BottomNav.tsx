"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
      <path
        d="M3.5 10.5L12 4l8.5 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-6v6H4.5a1 1 0 0 1-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M20 20l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sparkle icon — same shape as the global Sparkle, inlined and sized
 *  larger than the other nav icons since it's the primary CTA. */
function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      {/* Main 4-point star — already large, fills the upper-left quadrant */}
      <path
        d="M12 2l1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2z"
        fill="currentColor"
      />
      {/* Top-right secondary sparkle — enlarged from 5×5 to 7×7 viewBox units */}
      <path
        d="M19 13l.8 2.7L22.5 16.5l-2.7.8L19 20l-.8-2.7L15.5 16.5l2.7-.8L19 13z"
        fill="currentColor"
      />
      {/* Bottom-left secondary sparkle — enlarged from 5×5 to 7×7 viewBox units */}
      <path
        d="M6 16l.8 2.7L9.5 19.5l-2.7.8L6 23l-.8-2.7L2.5 19.5l2.7-.8L6 16z"
        fill="currentColor"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
      <path
        d="M6 9a6 6 0 0 1 12 0v3l1.5 3h-15L6 12V9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/legacies", label: "Home", icon: <HomeIcon /> },
  { href: "/explore", label: "Explore", icon: <ExploreIcon /> },
  { href: "/onboarding/new", label: "Create", icon: <PlusIcon />, primary: true },
  { href: "/account/rewards", label: "Rewards", icon: <BellIcon /> },
  { href: "/account", label: "You", icon: <UserIcon /> },
];

export function BottomNav() {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  // Hide nav on login/auth — those are pre-auth screens.
  if (pathname === "/login" || pathname === "/auth" || pathname === "/") {
    return null;
  }
  // Hide on conversation pages — focused chat flow with its own back/close
  // actions. Avoids fighting the fixed composer at the bottom of the screen.
  if (/^\/legacies\/[^/]+\/sessions\/[^/]+/.test(pathname)) {
    return null;
  }

  // Pick the single nav item with the longest href that matches the current
  // pathname. Prevents nested routes (e.g. /account/rewards) from lighting up
  // both their own pill and a less-specific parent pill (/account).
  const activeHref = NAV.filter((item) => !item.primary)
    .filter(
      (item) =>
        pathname === item.href ||
        pathname.startsWith(item.href + "/"),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    // Anchor to bottom-0 with padding-bottom that respects safe-area-inset
    // (plus a small minimum so the labels never sit on the home-indicator
    // line). Padding-bottom must be the *only* thing lifting the pill —
    // mixing bottom-3 with pb-safe-inside was unreliable on iOS where the
    // url bar reveals/hides change the visual viewport.
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3"
      style={{
        paddingBottom:
          "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))",
        paddingTop: "0.5rem",
      }}
    >
      <div
        className="flex w-full max-w-md items-center justify-around gap-1 rounded-full border border-white/28 px-2 py-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.10)] backdrop-blur-2xl backdrop-saturate-150"
        style={{
          background:
            "linear-gradient(180deg, rgba(14, 12, 28, 0.94) 0%, rgba(8, 7, 20, 0.96) 100%)",
        }}
      >
        {NAV.map((item) => {
          const active = item.href === activeHref;
          if (item.primary) {
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                aria-label={item.label}
                className="cta-pill text-caption px-4 py-2"
              >
                <span className="inline-flex items-center gap-1.5">
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              // min-w-0 lets the item shrink below its content min-width
              // when the pill is narrow, so all 5 children always fit
              // inside max-w-md and the pill never overflows the viewport.
              className={`group relative flex basis-0 min-w-0 grow flex-col items-center gap-1 px-1 py-1.5 transition active:scale-[0.94] active:duration-75 ${
                active ? "text-white" : "text-secondary hover:text-white"
              }`}
            >
              {/* Active / hover highlight as an absolute layer so it
                  contributes zero width to the item. inset-x-1 inset-y-0
                  gives the pill a 4px breathing margin on each side, so
                  edge items (Home / You) never let the highlight run
                  into the outer pill's rounded arc. */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-1 inset-y-0 rounded-full transition-colors duration-200 ${
                  active
                    ? "bg-white/10"
                    : "bg-transparent group-hover:bg-white/5 group-active:bg-white/8"
                }`}
              />
              {/* Active indicator — a small violet dot above the icon so
                  the user always knows where they are even without
                  contrast on the label. */}
              {active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_8px_rgba(180,173,255,0.9)]"
                />
              )}
              <span className="relative">{item.icon}</span>
              <span className="relative label-mono text-[11px] font-medium leading-tight truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
