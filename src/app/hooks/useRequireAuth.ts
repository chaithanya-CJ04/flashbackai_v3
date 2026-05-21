"use client";

import { useEffect, useState } from "react";
import {
  extractUserIdFromToken,
  getToken,
  isTokenExpired,
  refreshAccessToken,
} from "./useAuth";

type State =
  | { status: "checking" }
  | { status: "authenticated"; userId: string | null }
  | { status: "unauthenticated" };

export function useRequireAuth(): State {
  const [state, setState] = useState<State>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const stored = getToken();
      if (stored && !isTokenExpired(stored)) {
        if (!cancelled) {
          setState({ status: "authenticated", userId: extractUserIdFromToken(stored) });
        }
        return;
      }
      const refreshed = await refreshAccessToken();
      if (cancelled) return;
      if (refreshed && !isTokenExpired(refreshed)) {
        setState({ status: "authenticated", userId: extractUserIdFromToken(refreshed) });
        return;
      }
      setState({ status: "unauthenticated" });
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
