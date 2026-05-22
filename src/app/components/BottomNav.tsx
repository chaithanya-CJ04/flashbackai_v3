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

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 pb-safe sm:bottom-5"
    >
      <div
        className="flex w-full max-w-md items-center justify-around gap-1 rounded-full border border-white/28 px-2 py-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.10)] backdrop-blur-2xl backdrop-saturate-150"
        style={{
          background:
            "linear-gradient(180deg, rgba(14, 12, 28, 0.94) 0%, rgba(8, 7, 20, 0.96) 100%)",
        }}
      >
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/legacies" &&
              pathname.startsWith(item.href) &&
              !item.primary);
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
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-2 transition active:scale-[0.94] active:duration-75 ${
                active
                  ? "bg-white/10 text-white"
                  : "text-secondary hover:bg-white/5 hover:text-white active:bg-white/8"
              }`}
            >
              {/* Active indicator — a small violet dot below the label so the
                  user always knows where they are even without text contrast. */}
              {active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_8px_rgba(180,173,255,0.9)]"
                />
              )}
              {item.icon}
              <span className="label-mono text-meta font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
