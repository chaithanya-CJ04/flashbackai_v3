"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Eyebrow,
  PageShell,
  ScreenIntro,
  PageLoader,
  SectionHeading,
  Spinner,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import {
  metricsApi,
  rewardsApi,
  type LoginStreak,
  type RewardsTx,
  type UserMetrics,
} from "../../lib/api";

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function RewardsPage() {
  const auth = useRequireAuth();
  const userId = auth.status === "authenticated" ? auth.userId : null;

  const [streak, setStreak] = useState<LoginStreak | null>(null);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [txs, setTxs] = useState<RewardsTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bumping, setBumping] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const [s, m, t] = await Promise.allSettled([
        metricsApi.getLoginStreak(userId),
        metricsApi.getMetrics(userId),
        rewardsApi.listTx(userId, false),
      ]);
      if (s.status === "fulfilled") setStreak(s.value);
      else setStreak(null);
      if (m.status === "fulfilled") setMetrics(m.value);
      else setMetrics(null);
      if (t.status === "fulfilled") setTxs(t.value);
      else setTxs([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rewards.");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const bumpStreak = async () => {
    if (!userId) return;
    setBumping(true);
    setError(null);
    try {
      const res = await metricsApi.upsertLoginStreak(userId, detectTimezone());
      setStreak(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update streak.");
    } finally {
      setBumping(false);
    }
  };

  const claim = async (tx: RewardsTx) => {
    if (!userId) return;
    setClaimingId(tx.txId);
    setError(null);
    try {
      await rewardsApi.claim(userId, tx.txId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim.");
    } finally {
      setClaimingId(null);
    }
  };

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <PageLoader />
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <AppHeader title="Rewards" />
      <ScreenIntro
        compact
        module="Rewards"
        meta={txs && Array.isArray(txs) ? `${txs.length} unclaimed` : undefined}
        title={{ top: "WHAT YOU'VE", accent: "EARNED." }}
        subtitle="XP, credits, and login streaks earned from your activity."
        accent="warm"
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {/* Two-column dashboard layout on lg+ so streak/stats sit alongside the
          unclaimed list — kills the long single-column scroll on desktop.
          Each column starts with a SectionHeading so the two top edges
          land on the same baseline instead of card-padding vs h2-baseline. */}
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 lg:col-span-5">
          <SectionHeading
            title="Activity"
            hint="Your streak, XP, and credits."
          />
          {/* Streak hero — uses the shared Card `halo` prop, tinted warm
              to echo the page's accent="warm" hero. */}
          <Card halo="warm" className="p-5 sm:p-6">
            <div className="relative">
              <Eyebrow>Login streak</Eyebrow>
              <div className="mt-2 flex items-end gap-2">
                <p className="display-sans text-[clamp(2.5rem,1.6rem+4vw,4rem)] leading-none text-white">
                  {streak?.currentStreak ?? "—"}
                </p>
                <span className="mb-2 label-mono text-meta text-tertiary">
                  days
                </span>
              </div>
              {streak?.lastOpenDate && (
                <p className="mt-2 label-mono text-meta text-tertiary">
                  Last open · {streak.lastOpenDate}
                </p>
              )}
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => void bumpStreak()}
                disabled={bumping}
              >
                {bumping && <Spinner />}
                {bumping ? "Recording…" : "Mark today as open"}
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <Eyebrow>XP</Eyebrow>
              <p className="display-sans mt-1 text-headline text-white">
                {metrics?.xp ?? "—"}
              </p>
            </Card>
            <Card className="p-4">
              <Eyebrow>Credits</Eyebrow>
              <p className="display-sans mt-1 text-headline text-white">
                {metrics?.credits ?? "—"}
              </p>
            </Card>
          </div>
        </div>

        <section className="lg:col-span-7">
          <SectionHeading
            title="Unclaimed rewards"
            hint={
              txs && Array.isArray(txs) && txs.length > 0
                ? "Tap claim to bank the XP and credits."
                : undefined
            }
          />
          {!txs ? (
            <div className="flex items-center gap-2 label-mono text-meta text-tertiary">
              <Spinner /> Loading…
            </div>
          ) : !Array.isArray(txs) || txs.length === 0 ? (
            <EmptyState
              title="Nothing to claim"
              hint="Keep showing up. Actions like sessions, login streaks, and milestones generate claimable rewards."
            />
          ) : (
            <div className="space-y-2">
              {(Array.isArray(txs) ? txs : []).map((t) => (
                <Card
                  key={t.txId}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-caption text-primary capitalize">
                      {t.actionType.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 label-mono text-meta text-tertiary">
                      {t.reward?.xp ? `+${t.reward.xp} XP` : ""}
                      {t.reward?.xp && t.reward?.credits ? " · " : ""}
                      {t.reward?.credits ? `+${t.reward.credits} credits` : ""}
                      {!t.reward?.xp && !t.reward?.credits && "—"}
                    </p>
                  </div>
                  <Button
                    onClick={() => void claim(t)}
                    disabled={claimingId === t.txId}
                  >
                    {claimingId === t.txId && <Spinner />}
                    {claimingId === t.txId ? "Claiming…" : "Claim"}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
