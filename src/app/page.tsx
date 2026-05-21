"use client";

import { useEffect } from "react";
import { getToken, isTokenExpired, refreshAccessToken } from "./hooks/useAuth";

export default function Home() {
  useEffect(() => {
    const run = async () => {
      const stored = getToken();
      if (stored && !isTokenExpired(stored)) {
        window.location.replace("/legacies");
        return;
      }
      const refreshed = await refreshAccessToken();
      if (refreshed && !isTokenExpired(refreshed)) {
        window.location.replace("/legacies");
        return;
      }
      window.location.replace("/login");
    };
    void run();
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center bg-black text-white">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
    </div>
  );
}
