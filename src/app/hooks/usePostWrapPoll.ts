"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

/* ────────────────────────────────────────────────────────────────────
   Post-wrap polling

   When a conversation is wrapped, the backend churns through it
   asynchronously — extracting entities, crystallising moments,
   updating themes — and the UI's cached snapshots go stale. This hook
   keeps the legacy detail page live for 2 minutes after a wrap, ticking
   every 5 seconds, so new items appear without the user having to
   refresh. Silent — no toasts; the user just sees the gallery and
   entities populate as the backend finishes its work.

   Activation is decoupled from the polling hook: the session page
   calls `schedulePostWrapPoll(personId)` after wrap succeeds (writes
   sessionStorage), then `usePostWrapPoll(personId)` on the legacy
   detail page picks up the schedule on mount and starts ticking.
   ──────────────────────────────────────────────────────────────────── */

const POLL_DURATION_MS = 60_000;  // 1 minute
const POLL_INTERVAL_MS = 10_000;  // 10 seconds

function storageKey(personId: string) {
  return `legacy:${personId}:postWrapPollUntil`;
}

/** Call from anywhere (typically right after a successful wrap) to
 *  arm the polling window. Safe to call repeatedly — extends the
 *  window each time. No-op outside the browser. */
export function schedulePostWrapPoll(
  personId: string,
  durationMs: number = POLL_DURATION_MS
) {
  if (typeof window === "undefined") return;
  const until = Date.now() + durationMs;
  try {
    window.sessionStorage.setItem(storageKey(personId), String(until));
  } catch {
    // Storage unavailable (private mode etc.) — silently degrade. The
    // user simply won't get live updates; everything else still works.
  }
}

export function usePostWrapPoll(personId: string) {
  const qc = useQueryClient();
  const [active, setActive] = useState(false);

  // Pick up the schedule on mount and whenever personId changes.
  useEffect(() => {
    if (typeof window === "undefined" || !personId) return;
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(storageKey(personId));
    } catch {
      raw = null;
    }
    if (!raw) {
      setActive(false);
      return;
    }
    const until = parseInt(raw, 10);
    if (Number.isFinite(until) && Date.now() < until) {
      setActive(true);
    } else {
      try {
        window.sessionStorage.removeItem(storageKey(personId));
      } catch {}
      setActive(false);
    }
  }, [personId]);

  useEffect(() => {
    if (!active || !personId) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;

      // Check expiry up-front so we never fire a refetch past the
      // poll window even if the timer drifts.
      let until = 0;
      try {
        until = parseInt(
          window.sessionStorage.getItem(storageKey(personId)) ?? "0",
          10
        );
      } catch {}
      if (!Number.isFinite(until) || Date.now() >= until) {
        try {
          window.sessionStorage.removeItem(storageKey(personId));
        } catch {}
        setActive(false);
        return;
      }

      // Invalidate everything per-legacy except the live conversation
      // state — turns/sessions are managed by the session page and we
      // don't want to disturb an in-progress chat the user may have
      // opened in another tab.
      await qc.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          if (!Array.isArray(key) || key.length < 2) return false;
          if (key[0] !== "legacy" || key[1] !== personId) return false;
          if (key[2] === "sessions") return false;
          return true;
        },
      });
    };

    const interval = window.setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [active, personId, qc]);

  return { active };
}
