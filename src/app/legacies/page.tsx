"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppHeader } from "../components/AppHeader";
import { CurvedDeck } from "../components/CurvedDeck";
import {
  Button,
  EmptyState,
  ErrorBanner,
  PageShell,
  Spinner,
} from "../components/ui";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useLegacies, type Legacy } from "../lib/queries";

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return `${Math.floor(day / 30)}mo ago`;
}

function Portrait({ legacy }: { legacy: Legacy }) {
  const usable =
    legacy.referenceImageUrl &&
    /^https?:\/\//i.test(legacy.referenceImageUrl)
      ? legacy.referenceImageUrl
      : null;

  const initials =
    legacy.deceasedName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "—";

  return (
    <Link
      href={`/legacies/${encodeURIComponent(legacy.personId)}`}
      className="group relative block"
      // Drag-to-prevent-image-drag — pictures don't get grabbed.
      draggable={false}
    >
      <div className="relative aspect-3/4 w-[64vw] max-w-[280px] overflow-hidden rounded-2xl border border-white/10 transition-[border-color,box-shadow] duration-300 group-hover:border-[rgb(var(--accent-soft))]/40 group-hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5)] sm:w-[280px] sm:rounded-3xl md:w-[300px]">
        {/* Base violet sheen */}
        <div className="absolute inset-0 bg-linear-to-br from-[rgb(var(--accent))]/30 via-[rgb(var(--accent-deep))]/25 to-black/50" />

        {usable ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={usable}
            alt={legacy.deceasedName}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="display-sans select-none text-5xl text-secondary sm:text-6xl">
              {initials}
            </span>
          </div>
        )}

        {/* Warm hover halo */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_120%,rgba(240,200,154,0.18)_0%,transparent_60%)]" />
        </div>

        {!legacy.onboardingComplete && (
          <span className="absolute right-3 top-3 rounded-full border border-[rgb(var(--warm))]/40 bg-[rgb(var(--warm))]/12 px-2 py-0.5 label-mono text-meta text-[rgb(var(--warm))]">
            Setup
          </span>
        )}

        {/* Caption gradient + content */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/95 via-black/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 sm:p-5">
          <p className="display-sans text-title text-white">
            {legacy.deceasedName}
          </p>
          <p className="mt-1.5 truncate label-mono text-meta text-secondary">
            <span className="capitalize">{legacy.relationship}</span>
            <span className="mx-1.5 text-tertiary">·</span>
            <span className="text-[rgb(var(--warm))]/85">
              {relativeTime(legacy.createdAt)}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function LegaciesPage() {
  const auth = useRequireAuth();
  const enabled = auth.status === "authenticated";

  const legaciesQuery = useLegacies({
    enabled,
    queryKey: ["legacies"],
  });

  const sorted = useMemo(() => {
    const items = legaciesQuery.data?.legacies ?? [];
    return [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [legaciesQuery.data]);

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-5 w-5" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <AppHeader />

      <section className="mb-8 mt-2 sm:mb-10">
        <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-soft))]/40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.9)]" />
          </span>
          <span>Archive</span>
          <span className="text-white/20">/</span>
          <span>
            {(legaciesQuery.data?.legacies?.length ?? 0)
              .toString()
              .padStart(2, "0")}{" "}
            preserved
          </span>
        </div>
        <h1 className="display-sans mt-5 text-[clamp(2.25rem,1.5rem+3.5vw,3.75rem)] leading-[0.92] text-white">
          THE PEOPLE
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(var(--accent-soft),1) 0%, rgba(var(--accent),1) 100%)",
            }}
          >
            YOU LOVE.
          </span>
        </h1>
        <p className="mt-5 max-w-md text-body text-secondary">
          A private archive for the people who shaped you. Drag to browse — tap
          a portrait to step into their story.
        </p>
      </section>

      {legaciesQuery.isError && (
        <div className="mb-6">
          <ErrorBanner>
            {legaciesQuery.error instanceof Error
              ? legaciesQuery.error.message
              : "Failed to load legacies."}
          </ErrorBanner>
        </div>
      )}

      {legaciesQuery.isLoading ? (
        <div className="flex items-center gap-3 label-mono text-meta text-tertiary">
          <Spinner /> Loading
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="The room is empty."
          hint="Begin by adding someone. You'll need a photo, their relationship to you, and a few minutes."
          action={
            <Link href="/onboarding/new">
              <Button variant="primary">Begin a new legacy</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Curved deck — real cards, arc layout, drag/wheel to browse */}
          <div className="-mx-4 sm:-mx-6 md:-mx-8">
            <CurvedDeck
              bend={70}
              rotation={7}
              className="py-8 sm:py-10"
            >
              {/* Left/right gutter so first/last cards can centre */}
              {[
                <div key="lead" className="w-[10vw] min-w-[32px]" />,
                ...sorted.map((l) => <Portrait key={l.personId} legacy={l} />),
                <div key="tail" className="w-[10vw] min-w-[32px]" />,
              ]}
            </CurvedDeck>
          </div>

          <p className="mt-2 text-center label-mono text-meta text-tertiary">
            Drag · scroll · tap to enter
          </p>
        </>
      )}
    </PageShell>
  );
}
