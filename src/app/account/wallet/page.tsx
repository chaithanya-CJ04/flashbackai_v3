"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageShell,
  ScreenIntro,
  Spinner,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { walletApi, type WalletDetails } from "../../lib/api";

export default function WalletPage() {
  const auth = useRequireAuth();
  const userId = auth.status === "authenticated" ? auth.userId : null;

  const [wallet, setWallet] = useState<WalletDetails | null>(null);
  const [shelbyAvailable, setShelbyAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<"evm" | "solana" | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    walletApi
      .getWallet(userId)
      .then((res) => {
        setWallet(res.walletDetails);
        setShelbyAvailable(res.shelby?.shelby_available ?? null);
      })
      .catch((e) => {
        // 404 is a valid "no wallet yet" state — show empty UI rather than error
        if (e && typeof e === "object" && "status" in e && (e as { status?: number }).status === 404) {
          setWallet(null);
        } else {
          setError(e instanceof Error ? e.message : "Failed to load wallet.");
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createWallet = async (kind: "evm" | "solana") => {
    if (!userId) return;
    setCreating(kind);
    setError(null);
    try {
      if (kind === "evm") await walletApi.createEvmWallet(userId);
      else await walletApi.createSolanaWallet(userId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create wallet.");
    } finally {
      setCreating(null);
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

  const address =
    typeof wallet?.wallet_address === "string" ? wallet.wallet_address : null;

  return (
    <PageShell>
      <AppHeader back="/account" title="Wallet" />
      <div>
        <ScreenIntro
          module="Wallet"
          meta={address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "no wallet"}
          title={{ top: "CUSTODIAL", accent: "WALLET." }}
          subtitle="Sign messages, claim rewards, and unlock on-chain features."
        />

        {error && (
          <div className="mb-4">
            <ErrorBanner>{error}</ErrorBanner>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-tertiary">
            <Spinner /> Loading wallet…
          </div>
        ) : address ? (
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-tertiary">
              Wallet address
            </p>
            <p className="mt-2 break-all font-mono text-sm text-primary">
              {address}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-caption text-tertiary">
              {shelbyAvailable !== null && (
                <span>
                  Shelby:{" "}
                  <span className={shelbyAvailable ? "text-emerald-300" : "text-secondary"}>
                    {shelbyAvailable ? "available" : "unavailable"}
                  </span>
                </span>
              )}
            </div>
            <button
              type="button"
              className="mt-4 text-xs text-secondary underline-offset-2 hover:text-white hover:underline"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(address);
                }
              }}
            >
              Copy address
            </button>
          </Card>
        ) : (
          <EmptyState
            title="No wallet yet"
            hint="Create one to enable rewards and on-chain features."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => void createWallet("evm")}
                  disabled={!!creating}
                >
                  {creating === "evm" && <Spinner />}
                  {creating === "evm" ? "Creating…" : "Create EVM wallet"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void createWallet("solana")}
                  disabled={!!creating}
                >
                  {creating === "solana" && <Spinner />}
                  {creating === "solana" ? "Creating…" : "Create Solana wallet"}
                </Button>
              </div>
            }
          />
        )}
      </div>
    </PageShell>
  );
}
