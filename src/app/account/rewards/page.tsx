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
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-5 w-5" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AppHeader back="/account" title="Rewards" />
      <ScreenIntro
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

      {/* Hero stat: streak */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-white/8 bg-linear-to-br from-[rgb(var(--accent))]/14 to-transparent p-6">
        <Eyebrow>Login streak</Eyebrow>
        <div className="mt-2 flex items-end gap-2">
          <p className="display-sans text-[clamp(3rem,2rem+6vw,4.5rem)] leading-none text-white">
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

      {/* Secondary stats: side-by-side, less dashboardy because they're inline */}
      <div className="mb-8 grid grid-cols-2 gap-3">
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

      <div className="mt-8">
        <p className="mb-2 text-xs uppercase tracking-wider text-tertiary">
          Unclaimed rewards
        </p>
        {!txs ? (
          <div className="flex items-center gap-2 text-xs text-tertiary">
            <Spinner /> Loading…
          </div>
        ) : !Array.isArray(txs) || txs.length === 0 ? (
          <EmptyState
            title="Nothing to claim"
            hint="Keep showing up — actions like sessions, login streaks, and milestones generate claimable rewards."
          />
        ) : (
          <div className="space-y-2">
            {(Array.isArray(txs) ? txs : []).map((t) => (
              <Card key={t.txId} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {t.actionType.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
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
      </div>
    </PageShell>
  );
}
