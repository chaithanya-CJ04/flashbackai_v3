export const API_BASE = "/api/backend";

export const TOKEN_KEY = "flashback_token";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_ID_KEY = "userId";

type JwtPayload = {
  exp?: number;
  sub?: string;
  user_id?: string;
  userId?: string;
  uid?: string;
};

function normalizeToken(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^bearer\s+/i, "").trim();
}

type RefreshResponse = {
  ok?: boolean;
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
  userId?: string;
  message?: string;
  error?: string;
};

let refreshInFlight: Promise<string | null> | null = null;
let silentRefreshTimer: number | null = null;

const REFRESH_EARLY_SECONDS = 60;

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("flashback:auth-changed"));
  } catch {}
}

function getTokenExpSeconds(token: string): number | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === "number" ? payload.exp : null;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function willExpireWithinSeconds(token: string, withinSeconds: number): boolean {
  const exp = getTokenExpSeconds(token);
  if (typeof exp !== "number") return false;
  return exp - nowSeconds() <= withinSeconds;
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  return atob(padded);
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const normalized = normalizeToken(token);
  if (!normalized) return null;

  const parts = normalized.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadJson = base64UrlDecode(parts[1]);
    return safeJsonParse<JwtPayload>(payloadJson);
  } catch {
    return null;
  }
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeToken(
      window.localStorage.getItem(TOKEN_KEY) ||
        window.localStorage.getItem(ACCESS_TOKEN_KEY) ||
        window.localStorage.getItem("access_token")
    );
  } catch {
    return null;
  }
}

function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeToken(token);
  if (!normalized) return;
  try {
    window.localStorage.setItem(TOKEN_KEY, normalized);
    window.localStorage.setItem(ACCESS_TOKEN_KEY, normalized);
    window.localStorage.setItem("access_token", normalized);
  } catch {}
  emitAuthChanged();
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.localStorage.getItem(REFRESH_TOKEN_KEY) ||
      window.localStorage.getItem("refresh_token")
    );
  } catch {
    return null;
  }
}

function setRefreshToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    window.localStorage.setItem("refresh_token", token);
  } catch {}
  emitAuthChanged();
}

function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.localStorage.getItem(USER_ID_KEY) ||
      window.localStorage.getItem("userID") ||
      window.localStorage.getItem("userId")
    );
  } catch {
    return null;
  }
}

function setStoredUserId(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_ID_KEY, userId);
  } catch {}
  emitAuthChanged();
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    const accessToken = getAccessToken();
    const userId = getStoredUserId() || extractUserIdFromToken(getAccessToken() || "") || undefined;

    if (process.env.NODE_ENV !== "production") {
      console.log("[auth] refreshAccessToken", {
        hasRefreshToken: !!refreshToken,
        refreshTokenExpired: refreshToken ? isTokenExpired(refreshToken) : null,
        apiBaseConfigured: !!API_BASE,
      });
    }

    if (!refreshToken && !accessToken) return null;

    const refreshTokenIsJwt = !!(refreshToken && decodeJwtPayload(refreshToken));
    const refreshTokenExpired = !!(refreshToken && refreshTokenIsJwt && isTokenExpired(refreshToken));
    if (refreshTokenExpired && !accessToken) {
      clearToken();
      return null;
    }

    const refreshPaths = [
      "/api/v1/token/refresh",
      "/api/v1/refresh",
      "/refresh",
      "/refrsh",
    ];

    const baseCandidates = [
      process.env.NEXT_PUBLIC_API_BASE_URL || null,
      API_BASE || null,
      process.env.NEXT_PUBLIC_API_BASE || null,
    ].filter(Boolean) as string[];

    const urls = Array.from(
      new Set(baseCandidates.flatMap((base) => refreshPaths.map((p) => `${base}${p}`)))
    );

    const authHeaderCandidates = [
      accessToken ? `Bearer ${accessToken}` : null,
      refreshToken && !refreshTokenExpired ? `Bearer ${refreshToken}` : null,
    ].filter(Boolean) as string[];

    for (const url of urls) {
      for (const authorization of authHeaderCandidates) {
        let res: Response;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authorization,
            },
            credentials: "include",
            body: JSON.stringify({ userId }),
          });
        } catch {
          continue;
        }

        if (res.status === 404) continue;

        const json = (await res.json().catch(() => null)) as RefreshResponse | null;

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            continue;
          }
          return null;
        }

        const newAccess = json?.accessToken ?? json?.access_token;
        const newRefresh = json?.refreshToken ?? json?.refresh_token;
        const newUserId = json?.user_id || json?.userId;

        if (typeof newAccess === "string" && newAccess) {
          setAccessToken(newAccess);
        }
        if (typeof newRefresh === "string" && newRefresh) {
          setRefreshToken(newRefresh);
        }
        if (typeof newUserId === "string" && newUserId) {
          setStoredUserId(newUserId);
        }

        const updatedAccess = typeof newAccess === "string" && newAccess ? newAccess : getAccessToken();
        if (updatedAccess) {
          scheduleSilentRefresh(updatedAccess);
        }

        return typeof newAccess === "string" ? newAccess : getAccessToken();
      }
    }

    clearToken();

    return null;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export function getToken(): string | null {
  return getAccessToken();
}

export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_ID_KEY);
    window.localStorage.removeItem("access_token");
    window.localStorage.removeItem("refresh_token");
  } catch {}
  emitAuthChanged();
}

export function setToken(token: string) {
  setAccessToken(token);
}

export function setTokens(tokens: { accessToken?: string; refreshToken?: string; userId?: string }) {
  if (tokens.accessToken) setAccessToken(tokens.accessToken);
  if (tokens.refreshToken) setRefreshToken(tokens.refreshToken);
  if (tokens.userId) setStoredUserId(tokens.userId);
  scheduleSilentRefresh(tokens.accessToken || getAccessToken() || "");
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return false;
  return exp <= nowSeconds();
}

export function extractUserIdFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const direct = payload.user_id || payload.userId || payload.uid;
  if (typeof direct === "string" && direct) return direct;

  if (typeof payload.sub === "string" && payload.sub) {
    const prefix = "uid:";
    if (payload.sub.startsWith(prefix)) return payload.sub.slice(prefix.length);
    return payload.sub;
  }

  return null;
}

export function scheduleSilentRefresh(token: string) {
  if (typeof window === "undefined") return;
  if (silentRefreshTimer) {
    window.clearTimeout(silentRefreshTimer);
    silentRefreshTimer = null;
  }

  const accessExp = getTokenExpSeconds(token);
  const refreshToken = getRefreshToken();
  const refreshExpRaw = refreshToken ? getTokenExpSeconds(refreshToken) : null;
  const refreshExp = typeof refreshExpRaw === "number" && refreshExpRaw > nowSeconds() ? refreshExpRaw : null;

  const exp =
    typeof accessExp === "number" && typeof refreshExp === "number"
      ? Math.min(accessExp, refreshExp)
      : typeof accessExp === "number"
        ? accessExp
        : typeof refreshExp === "number"
          ? refreshExp
          : null;
  if (typeof exp !== "number") return;

  const nowMs = Date.now();
  const expMs = exp * 1000;
  const refreshAtMs = expMs - REFRESH_EARLY_SECONDS * 1000;
  const delayMs = Math.max(0, refreshAtMs - nowMs);

  silentRefreshTimer = window.setTimeout(() => {
    void refreshAccessToken();
  }, delayMs);
}

export async function ensureFreshTokens(): Promise<string | null> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (refreshToken && decodeJwtPayload(refreshToken) && isTokenExpired(refreshToken)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return refreshed;
    if (accessToken && !isTokenExpired(accessToken)) {
      scheduleSilentRefresh(accessToken);
      return accessToken;
    }
    clearToken();
    return null;
  }

  if (refreshToken && willExpireWithinSeconds(refreshToken, REFRESH_EARLY_SECONDS)) {
    return await refreshAccessToken();
  }

  if (accessToken && (isTokenExpired(accessToken) || willExpireWithinSeconds(accessToken, REFRESH_EARLY_SECONDS))) {
    return await refreshAccessToken();
  }

  if (accessToken) {
    scheduleSilentRefresh(accessToken);
  }

  return accessToken;
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: (RequestInit & { skipAuthRetry?: boolean }) = {}
) {
  const { skipAuthRetry, ...restInit } = init;
  let token = getAccessToken();
  const refreshToken = getRefreshToken();

  if (refreshToken && willExpireWithinSeconds(refreshToken, REFRESH_EARLY_SECONDS)) {
    token = await refreshAccessToken();
  } else if (token && (isTokenExpired(token) || willExpireWithinSeconds(token, REFRESH_EARLY_SECONDS))) {
    token = await refreshAccessToken();
  }

  if (!token) {
    if (typeof window !== "undefined") {
      try {
        window.location.href = "/login";
      } catch {}
    }
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(restInit.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...restInit, headers });

  if (!skipAuthRetry && (res.status === 401 || res.status === 403)) {
    const newToken = await refreshAccessToken();
    if (!newToken) return res;

    const retryHeaders = new Headers(restInit.headers || {});
    retryHeaders.set("Authorization", `Bearer ${newToken}`);
    return fetch(input, { ...restInit, headers: retryHeaders });
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const clone = res.clone();
      const json = (await clone.json()) as { error?: unknown; message?: unknown };
      const errText = typeof json?.error === "string" ? json.error : typeof json?.message === "string" ? json.message : "";
      if (errText.toLowerCase().includes("invalid") && errText.toLowerCase().includes("token")) {
        if (skipAuthRetry) return res;
        const newToken = await refreshAccessToken();
        if (!newToken) return res;

        const retryHeaders = new Headers(restInit.headers || {});
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        return fetch(input, { ...restInit, headers: retryHeaders });
      }
    } catch {
      // ignore json parse issues
    }
  }

  return res;
}
