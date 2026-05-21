"use client";

import { useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import {
  Button,
  Card,
  ErrorBanner,
  Input,
  PageShell,
  ScreenIntro,
  Spinner,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { activationApi, type ActivationCodeInfo } from "../../lib/api";

export default function RedeemPage() {
  const auth = useRequireAuth();
  const userId = auth.status === "authenticated" ? auth.userId : null;

  const [code, setCode] = useState("");
  const [info, setInfo] = useState<ActivationCodeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState<ActivationCodeInfo | null>(null);

  const verify = async () => {
    const c = code.trim();
    if (!c) {
      setError("Enter an activation code.");
      return;
    }
    setError(null);
    setInfo(null);
    setRedeemed(null);
    setVerifying(true);
    try {
      const res = await activationApi.verify(c);
      setInfo(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verify failed.");
    } finally {
      setVerifying(false);
    }
  };

  const redeem = async () => {
    if (!userId) return;
    const c = code.trim();
    if (!c) return;
    setError(null);
    setRedeeming(true);
    try {
      const res = await activationApi.redeem(c, userId);
      setRedeemed(res);
      setInfo(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redeem failed.");
    } finally {
      setRedeeming(false);
    }
  };

  if (auth.status !== "authenticated") {
    return (
      <PageShell narrow>
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-5 w-5" />
        </div>
      </PageShell>
    );
  }

  const canRedeem =
    !!info && info.is_active && info.status === "AVAILABLE" && !redeemed;

  return (
    <PageShell narrow>
      <AppHeader back="/account" title="Redeem" />
      <div>
        <ScreenIntro
          module="Activation"
          meta="campaign · partner"
          title={{ top: "REDEEM A", accent: "CODE." }}
          subtitle="Verify a partner or campaign code, then claim its reward."
          accent="warm"
        />

        <Card className="space-y-3 p-5">
          <div>
            <label className="text-caption text-secondary">Activation code</label>
            <Input
              className="mt-1 font-mono uppercase tracking-wider"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (canRedeem) void redeem();
                  else void verify();
                }
              }}
            />
          </div>

          {error && <ErrorBanner>{error}</ErrorBanner>}

          {info && (
            <div className="rounded-xl border border-white/10 bg-white/3 p-3 text-xs">
              <p className="text-secondary">
                Status:{" "}
                <span
                  className={
                    info.is_active && info.status === "AVAILABLE"
                      ? "text-emerald-300"
                      : "text-amber-300"
                  }
                >
                  {info.status}
                </span>
              </p>
              {info.source && (
                <p className="mt-1 text-secondary">Source: {info.source}</p>
              )}
              {info.code_type && (
                <p className="text-secondary">Type: {info.code_type}</p>
              )}
              {info.campaign_id && (
                <p className="text-secondary">Campaign: {info.campaign_id}</p>
              )}
            </div>
          )}

          {redeemed && (
            <p className="text-xs text-emerald-300/80">
              Code redeemed successfully.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => void verify()}
              disabled={verifying || !code.trim()}
            >
              {verifying && <Spinner />}
              {verifying ? "Verifying…" : "Verify"}
            </Button>
            <Button
              onClick={() => void redeem()}
              disabled={redeeming || !canRedeem}
            >
              {redeeming && <Spinner />}
              {redeeming ? "Redeeming…" : "Redeem"}
            </Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
