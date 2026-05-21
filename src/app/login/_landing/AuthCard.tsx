"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import {
  API_BASE,
  clearToken,
  extractUserIdFromToken,
  fetchWithAuth,
  getToken,
  isTokenExpired,
  refreshAccessToken,
  setTokens,
} from "../../hooks/useAuth";

import { AnimatePresence, motion } from "framer-motion";

import { useAccount, useConfig, useConnect, useDisconnect } from "wagmi";
import { signMessage } from "wagmi/actions";

type AuthResponse = {
  ok?: boolean;
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
  userId?: string;
  userID?: string;
  message?: string;
};

type UserDetails = {
  created_at?: string;
  date_of_birth?: string;
  email?: string;
  ethnicity?: string;
  gender?: string;
  name?: string;
  profile_setup_completed?: boolean;
  time_zone?: string;
  updated_at?: string;
  user_id?: string;
};

type UserDetailsResponse = {
  message?: string;
  data?: UserDetails;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type DropdownOption = {
  value: string;
  label: string;
};

function Dropdown({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => {
    return options.find((o) => o.value === value) ?? null;
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <label className="text-caption text-secondary">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`mt-1 w-full rounded-xl border px-3 py-2 text-left text-sm outline-none transition relative overflow-hidden ${
          disabled
            ? "cursor-not-allowed bg-white/5 border-white/10 text-tertiary"
            : "bg-white/5 border-white/15 text-primary hover:border-white/30 focus-visible:border-white/35"
        }`}
      >
        <span className="flex items-center justify-between gap-3">
          <span className={selected ? "truncate" : "truncate text-tertiary"}>
            {selected ? selected.label : placeholder}
          </span>
          <span
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={disabled ? "opacity-40" : "opacity-90"}
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
          >
            <div className="max-h-56 overflow-auto">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between gap-3 transition ${
                      isSelected
                        ? "bg-white/10 text-white"
                        : "text-secondary hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="opacity-90"
                      >
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuthButton({
  children,
  onClick,
  disabled,
  type = "button",
  primary = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  /** Use sparingly — recommended sign-in pulls the brand shimmer pill. */
  primary?: boolean;
}) {
  if (primary) {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="cta-pill w-full justify-center! rounded-xl! px-4! py-2.5! text-sm"
        style={{ borderRadius: "0.75rem" }}
      >
        <span className="inline-flex items-center gap-2.5">{children}</span>
      </button>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-sm font-medium text-primary transition hover:border-[rgb(var(--accent-soft))]/35 hover:bg-white/8 hover:shadow-[0_0_30px_-8px_rgba(123,115,253,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {/* Subtle sweep highlight on hover — feels "scanned" */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/8 to-transparent opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100"
      />
      <span className="relative z-10 inline-flex items-center gap-2.5">
        {children}
      </span>
    </button>
  );
}

// Tiny vendor icons — flat, monochrome white. Professional, not branded color.
const ProviderIcon = {
  Google: () => (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
      <path d="M21.35 11.1H12v2.9h5.35c-.23 1.5-1.66 4.4-5.35 4.4-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.46l2.56-2.48C16.79 3.95 14.6 3 12 3 6.99 3 3 6.95 3 12s3.99 9 9 9c5.19 0 8.62-3.65 8.62-8.78 0-.59-.06-1.03-.13-1.12z" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="currentColor">
      <path d="M18.244 2H21.5l-7.5 8.575L23 22h-6.86l-4.79-6.27L5.7 22H2.44l8.02-9.166L1.5 2h7.025l4.337 5.74L18.244 2zm-1.205 18h1.86L7.06 4H5.07L17.04 20z" />
    </svg>
  ),
  Wallet: () => (
    <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="17" cy="12" r="1.25" fill="currentColor" />
    </svg>
  ),
};

export default function AuthCard() {
  const router = useRouter();
  const wagmiConfig = useConfig();

  const isDev = process.env.NODE_ENV !== "production";

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mobi|Android/i.test(navigator.userAgent);
  }, []);

  const isInSolanaWalletInAppBrowser = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Phantom|Solflare/i.test(navigator.userAgent);
  }, []);

  const {
    publicKey,
    connect,
    connected,
    signMessage: solanaSignMessage,
    wallets,
    select,
    wallet,
  } = useWallet();

  const { address, chainId, isConnected } = useAccount();
  const {
    connectAsync: evmConnectAsync,
    connectors,
    isPending: evmConnecting,
  } = useConnect();
  const { disconnect: evmDisconnect } = useDisconnect();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [solanaLoginRequested, setSolanaLoginRequested] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);
  const [phantomBrowseFallbackUrl, setPhantomBrowseFallbackUrl] = useState<string | null>(null);

  const [stage, setStage] = useState<"login" | "profile" | "boot">("login");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [postAuthUserId, setPostAuthUserId] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    date_of_birth: "",
    gender: "",
    ethnicity: "",
  });

  const isProfileFormValid = useMemo(() => {
    return (
      profileForm.name.trim().length > 0 &&
      profileForm.email.trim().length > 0 &&
      profileForm.date_of_birth.trim().length > 0 &&
      profileForm.gender.trim().length > 0 &&
      profileForm.ethnicity.trim().length > 0
    );
  }, [profileForm]);

  const completeLogin = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("flashback:startup_gate_replay"));
    }
    router.replace("/legacies");
  }, [router]);

  const startProfileFlow = useCallback(
    async (userId: string) => {
      setPostAuthUserId(userId);
      setProfileError(null);
      setProfileLoading(true);

      try {
        completeLogin();
        return;
      } catch (err: unknown) {
        if (err instanceof HttpError) {
          if (err.status === 401 || err.status === 403) {
            clearToken();
            setError("Session expired. Please login again.");
            setStage("login");
            return;
          }
        }

        completeLogin();
        return;
      } finally {
        setProfileLoading(false);
      }
    },
    [completeLogin]
  );

  const beginBootFlow = useCallback((userId: string) => {
    setPostAuthUserId(userId);
    setStage("boot");
  }, []);

  const handleBootComplete = useCallback(() => {
    const userId = postAuthUserId;
    if (!userId) {
      setStage("login");
      return;
    }
    void startProfileFlow(userId);
  }, [postAuthUserId, startProfileFlow]);

  useEffect(() => {
    if (stage !== "boot") return;
    const id = window.setTimeout(() => {
      handleBootComplete();
    }, 1200);
    return () => window.clearTimeout(id);
  }, [stage, handleBootComplete]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const parseTokenFromLocation = () => {
      const keys = ["access_token", "token", "jwt", "id_token"];
      const extract = (src: string) => {
        const params = new URLSearchParams(src);
        for (const k of keys) {
          if (params.has(k)) return params.get(k);
        }
        return null;
      };

      const { hash, search } = window.location;
      let token: string | null = null;

      if (hash) {
        token = extract(hash.startsWith("#") ? hash.slice(1) : hash);
      }
      if (!token && search) {
        token = extract(search.startsWith("?") ? search.slice(1) : search);
      }
      return token;
    };

    const clearUrlParams = () => {
      window.history.replaceState({}, "", window.location.pathname);
    };

    const run = async () => {
      console.log('[AuthCard] run()', {
        href: window.location.href,
        hash: window.location.hash,
        search: window.location.search,
      });

      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("error") === "state") {
        setOauthError("state");
        clearToken();
        setStage("login");
        clearUrlParams();
        return;
      }

      const tokenFromUrl = parseTokenFromLocation();
      console.log('[AuthCard] tokenFromUrl:', tokenFromUrl ? tokenFromUrl.substring(0, 40) + '...' : 'NONE');
      if (tokenFromUrl) {
        const sp = new URLSearchParams(window.location.search);
        const targetOrigin = sp.get("origin") || sp.get("state");
        if (
          targetOrigin &&
          typeof window !== "undefined" &&
          targetOrigin !== window.location.origin &&
          (targetOrigin.includes("localhost") || targetOrigin.includes("127.0.0.1"))
        ) {
          console.log("[Auth] Hopping back to original environment:", targetOrigin);
          const hopUrl = new URL(`${targetOrigin}/login`);
          hopUrl.searchParams.set("access_token", tokenFromUrl);
          window.location.href = hopUrl.toString();
          return;
        }

        if (isTokenExpired(tokenFromUrl)) {
          clearToken();
          setStage("login");
          clearUrlParams();
          return;
        }

        const uid = extractUserIdFromToken(tokenFromUrl);
        setTokens({ accessToken: tokenFromUrl, userId: uid ?? undefined });
        clearUrlParams();

        if (uid) {
          beginBootFlow(uid);
        } else {
          clearToken();
          setError("Missing user id in token. Please login again.");
          setStage("login");
        }
        return;
      }

      const stored = getToken();
      console.log('[AuthCard] stored token:', stored ? stored.substring(0, 40) + '...' : 'NONE', 'expired:', stored ? isTokenExpired(stored) : 'N/A');
      if (stored && !isTokenExpired(stored)) {
        const uid =
          window.localStorage.getItem("userId") ||
          window.localStorage.getItem("userID") ||
          extractUserIdFromToken(stored);

        if (uid) {
          beginBootFlow(uid);
        } else {
          clearToken();
          setError("Missing user id in token. Please login again.");
          setStage("login");
        }
        return;
      }

      const refreshed = await refreshAccessToken();
      if (refreshed && !isTokenExpired(refreshed)) {
        const uid = extractUserIdFromToken(refreshed);
        if (uid) {
          setTokens({ accessToken: refreshed, userId: uid });
          beginBootFlow(uid);
        } else {
          setTokens({ accessToken: refreshed });
          clearToken();
          setError("Missing user id in token. Please login again.");
          setStage("login");
        }
        return;
      }

      clearToken();
      setStage("login");
    };

    void run();
  }, [beginBootFlow]);

  const handleAuthSuccess = useCallback(
    (raw: unknown) => {
      const container =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
      const payload =
        container && "data" in container ? container.data : raw;

      const data =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : ({} as Record<string, unknown>);

      const accessToken =
        typeof data.accessToken === "string"
          ? data.accessToken
          : typeof data.access_token === "string"
            ? data.access_token
            : undefined;

      const refreshToken =
        typeof data.refreshToken === "string"
          ? data.refreshToken
          : typeof data.refresh_token === "string"
            ? data.refresh_token
            : undefined;

      const userId =
        typeof data.user_id === "string"
          ? data.user_id
          : typeof data.userId === "string"
            ? data.userId
            : typeof data.userID === "string"
              ? data.userID
              : undefined;

      const resolvedUserId =
        userId || (accessToken ? extractUserIdFromToken(accessToken) ?? undefined : undefined);

      setTokens({
        accessToken,
        refreshToken,
        userId: resolvedUserId,
      });

      console.log("[Auth Success]", {
        userId,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        raw,
      });

      if (resolvedUserId) {
        beginBootFlow(resolvedUserId);
      } else {
        clearToken();
        setError("Missing user id in token. Please login again.");
        setStage("login");
      }
    },
    [beginBootFlow]
  );

  const handleGoogleLogin = useCallback(() => {
    if (typeof window === "undefined") return;
    setError(null);
    setOauthError(null);
    setLoading(true);

    const origin = window.location.origin;
    const authUrl = `${API_BASE}/api/v1/auth/google/start?state=${encodeURIComponent(origin)}`;

    console.log("[Auth] Starting Google login redirect...", {
      apiBase: API_BASE,
      origin,
      url: authUrl,
    });

    window.location.href = authUrl;
  }, []);

  const handleXLogin = useCallback(() => {
    if (typeof window === "undefined") return;
    setError(null);
    setOauthError(null);
    setLoading(true);

    const origin = window.location.origin;
    const authUrl = `${API_BASE}/api/v1/auth/x/start?state=${encodeURIComponent(origin)}`;

    console.log("[Auth] Starting X login redirect...", {
      apiBase: API_BASE,
      origin,
      url: authUrl,
    });

    window.location.href = authUrl;
  }, []);

  const handleProfileSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setProfileError(null);

      const userId = postAuthUserId;
      if (!userId) {
        setProfileError("Missing user id. Please login again.");
        return;
      }
      if (!isProfileFormValid) {
        setProfileError("Please fill in all fields to continue.");
        return;
      }

      setProfileSaving(true);
      try {
        const payload = {
          userId,
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
          date_of_birth: profileForm.date_of_birth.trim(),
          gender: profileForm.gender.trim(),
          ethnicity: profileForm.ethnicity.trim(),
          profile_setup_completed: true,
        };

        const url = `${API_BASE}/api/v1/users/${encodeURIComponent(userId)}`;
        const res = await fetchWithAuth(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Failed to save profile details");
        }

        completeLogin();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to save profile details. Please try again.";
        setProfileError(message);
      } finally {
        setProfileSaving(false);
      }
    },
    [completeLogin, isProfileFormValid, postAuthUserId, profileForm]
  );

  const handleLoginWithSolana = useCallback(async () => {
    try {
      setError(null);
      setPhantomBrowseFallbackUrl(null);
      setLoading(true);

      if (
        isMobile &&
        typeof window !== "undefined" &&
        !isInSolanaWalletInAppBrowser
      ) {
        const currentUrl = window.location.href;
        const refUrl = window.location.origin;
        const encodedUrl = encodeURIComponent(currentUrl);
        const encodedRef = encodeURIComponent(refUrl);

        const protocolLink = `phantom://browse/${encodedUrl}?ref=${encodedRef}`;
        const universalLink = `https://phantom.app/ul/browse/${encodedUrl}?ref=${encodedRef}`;

        let didBackground = false;
        const onVisibilityChange = () => {
          if (document.hidden) didBackground = true;
        };

        document.addEventListener("visibilitychange", onVisibilityChange);

        const a = document.createElement("a");
        a.href = protocolLink;
        a.rel = "noreferrer";
        a.click();

        window.setTimeout(() => {
          document.removeEventListener("visibilitychange", onVisibilityChange);

          if (!didBackground && !document.hidden) {
            setPhantomBrowseFallbackUrl(universalLink);
            setLoading(false);
          }
        }, 900);
        window.setTimeout(() => {
          setLoading(false);
        }, 1200);
        return;
      }

      if (!wallet) {
        if (!wallets || wallets.length === 0) {
          throw new Error(
            "No Solana wallet found. Please install Phantom or Solflare and refresh the page."
          );
        }

        const preferred =
          wallets.find(
            (w) => w.adapter.name === "Phantom" || w.adapter.name === "Solflare"
          ) ?? wallets[0];

        select(preferred.adapter.name);
        setSolanaLoginRequested(true);
        setPendingConnect(true);
        return;
      }
      setSolanaLoginRequested(true);

      if (!connected) {
        await connect();
      }
    } catch (err: unknown) {
      console.error("[Web Solana Login Error]", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to login with Solana wallet. Please try again.";
      setError(message);
      setLoading(false);
      setSolanaLoginRequested(false);
    }
  }, [
    connected,
    connect,
    isInSolanaWalletInAppBrowser,
    isMobile,
    wallet,
    wallets,
    select,
  ]);

  useEffect(() => {
    if (!pendingConnect || !wallet || connected) return;
    setPendingConnect(false);
    connect().catch((err: unknown) => {
      console.error("[Solana deferred connect error]", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet. Please try again.");
      setLoading(false);
      setSolanaLoginRequested(false);
    });
  }, [pendingConnect, wallet, connected, connect]);

  useEffect(() => {
    if (!solanaLoginRequested) return;
    if (!connected || !publicKey || !solanaSignMessage) return;

    let cancelled = false;

    /** One full Solana sign-in cycle: fetch challenge → sign → verify.
     *  Throws an Error tagged with `code` for the caller to inspect. */
    const attempt = async (): Promise<AuthResponse> => {
      const solAddress = publicKey.toBase58();

      const startRes = await fetch(`${API_BASE}/api/v1/auth/solana/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ address: solAddress, platform: "web" }),
      });
      if (!startRes.ok) {
        throw new Error("Failed to get Solana login message");
      }
      const startJson = (await startRes.json()) as { message?: string };
      if (!startJson.message) {
        throw new Error("No message returned from Solana backend");
      }
      if (!solanaSignMessage) {
        throw new Error("signMessage not supported by this Solana wallet");
      }

      const msgBytes = new TextEncoder().encode(startJson.message);
      const signatureBytes = await solanaSignMessage(msgBytes);
      const signatureBase58 = bs58.encode(signatureBytes);

      const verifyRes = await fetch(`${API_BASE}/api/v1/auth/solana/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          address: solAddress,
          message: startJson.message,
          signature: signatureBase58,
        }),
      });

      const raw = await verifyRes.clone().text().catch(() => "");
      const data = (await verifyRes.json().catch(() => null)) as
        | (AuthResponse & { error?: string })
        | null;

      if (!verifyRes.ok) {
        const code =
          (data as { error?: string } | null)?.error || "";
        const err = new Error(
          (data as { message?: string } | null)?.message ||
            raw ||
            "Failed to verify Solana wallet login"
        ) as Error & { code?: string };
        err.code = code;
        throw err;
      }

      if (!data) {
        throw new Error("Solana wallet login failed (empty response)");
      }
      if (data.ok === false) {
        throw new Error(data.message || "Solana wallet login failed");
      }
      return data;
    };

    const run = async () => {
      try {
        let data: AuthResponse;
        try {
          data = await attempt();
        } catch (err: unknown) {
          const code = (err as { code?: string } | null)?.code;
          // Server's signing challenge has a short TTL. If the user took
          // too long to approve in the wallet, transparently request a
          // fresh challenge and sign once more.
          if (code === "challenge_expired" && !cancelled) {
            setError("Sign-in window expired — please approve once more.");
            data = await attempt();
            setError(null);
          } else {
            throw err;
          }
        }
        handleAuthSuccess(data);
      } catch (err: unknown) {
        console.error("[Web Solana Login Error]", err);
        const code = (err as { code?: string } | null)?.code;
        const friendly =
          code === "challenge_expired"
            ? "Sign-in took too long. Please try again."
            : err instanceof Error
              ? err.message
              : "Failed to login with Solana wallet. Please try again.";
        if (!cancelled) {
          setError(friendly);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSolanaLoginRequested(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    solanaLoginRequested,
    connected,
    publicKey,
    solanaSignMessage,
    handleAuthSuccess,
  ]);

  const handleLoginWithEvm = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      let evmAddress = (address ?? "").toLowerCase();
      let cid = chainId ?? 1;

      if (!isConnected) {
        const isReady = (connector: unknown) => {
          if (!connector || typeof connector !== "object") return false;
          return "ready" in connector ? !!(connector as any).ready : true;
        };

        const metaMaskConnector = connectors.find((c) =>
          c.name.toLowerCase().includes("metamask")
        );
        const walletConnectConnector = connectors.find((c) =>
          c.name.toLowerCase().includes("walletconnect")
        );

        const preferredConnector =
          (metaMaskConnector && isReady(metaMaskConnector)
            ? metaMaskConnector
            : null) ??
          (walletConnectConnector && isReady(walletConnectConnector)
            ? walletConnectConnector
            : null) ??
          connectors.find((c) => isReady(c)) ??
          connectors[0];

        if (!preferredConnector) {
          throw new Error("No EVM connector available");
        }

        let unsubscribe: (() => void) | undefined;

        if (
          isDev &&
          typeof window !== "undefined" &&
          typeof navigator !== "undefined" &&
          /Mobi|Android/i.test(navigator.userAgent) &&
          preferredConnector.id === "walletConnect"
        ) {
          const handleMessage = (event: { type: string; data?: string }) => {
            if (event.type === "display_uri" && typeof event.data === "string") {
              const hostname = window.location.hostname || "";
              const isLocalHostLike =
                hostname === "localhost" ||
                hostname === "127.0.0.1" ||
                hostname.startsWith("10.") ||
                hostname.startsWith("192.168.") ||
                hostname.startsWith("172.");

              if (isLocalHostLike) {
                const wcUri = event.data;
                window.location.href = `https://metamask.app.link/wc?uri=${encodeURIComponent(
                  wcUri
                )}`;
              }
            }
          };

          (preferredConnector as any).on?.("message", handleMessage);
          unsubscribe = () => {
            (preferredConnector as any).off?.("message", handleMessage);
          };
        }

        try {
          const result = await evmConnectAsync({ connector: preferredConnector });
          const accountFromResult = (result.accounts?.[0] ?? "").toLowerCase();
          if (!accountFromResult) {
            throw new Error("No EVM account returned from connector");
          }

          evmAddress = accountFromResult;
          cid = result.chainId ?? cid;
        } finally {
          if (unsubscribe) {
            unsubscribe();
          }
        }
      }

      if (!evmAddress) {
        throw new Error("No EVM address after connect");
      }

      // One full EVM sign-in cycle — challenge → sign → verify.
      const attemptEvm = async (): Promise<AuthResponse> => {
        const startRes = await fetch(`${API_BASE}/api/v1/auth/evm/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            address: evmAddress,
            platform: "web",
            chainId: cid,
          }),
        });
        if (!startRes.ok) {
          throw new Error("Failed to get EVM login message");
        }
        const startJson = (await startRes.json()) as { message?: string };
        if (!startJson.message) {
          throw new Error("No message returned from EVM backend");
        }
        const signature = await signMessage(wagmiConfig, {
          account: evmAddress as `0x${string}`,
          message: startJson.message,
        });
        const verifyRes = await fetch(`${API_BASE}/api/v1/auth/evm/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            address: evmAddress,
            message: startJson.message,
            signature,
            chainId: cid,
          }),
        });
        const raw = await verifyRes.clone().text().catch(() => "");
        const verifyData = (await verifyRes.json().catch(() => null)) as
          | (AuthResponse & { error?: string })
          | null;
        if (!verifyRes.ok) {
          const code = (verifyData as { error?: string } | null)?.error || "";
          const err = new Error(
            (verifyData as { message?: string } | null)?.message ||
              raw ||
              "Failed to verify EVM wallet login"
          ) as Error & { code?: string };
          err.code = code;
          throw err;
        }
        if (!verifyData) {
          throw new Error("EVM wallet login failed (empty response)");
        }
        return verifyData;
      };

      let data: AuthResponse;
      try {
        data = await attemptEvm();
      } catch (err: unknown) {
        const code = (err as { code?: string } | null)?.code;
        if (code === "challenge_expired") {
          setError("Sign-in window expired — please approve once more.");
          data = await attemptEvm();
          setError(null);
        } else {
          throw err;
        }
      }

      if (data && data.ok === false) {
        throw new Error(data.message || "EVM wallet login failed");
      }

      handleAuthSuccess(data);
    } catch (err: unknown) {
      console.error("[Web EVM Login Error - raw]", err);

      const code = (err as { code?: string } | null)?.code;
      let message: string;
      if (code === "challenge_expired") {
        message = "Sign-in took too long. Please try again.";
      } else if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      } else {
        try {
          const serialized = JSON.stringify(err);
          message =
            serialized && serialized !== "{}"
              ? serialized
              : "Failed to login with EVM wallet. Please try again.";
        } catch {
          message = "Failed to login with EVM wallet. Please try again.";
        }
      }

      setError(message);
      evmDisconnect();
      setLoading(false);
    }
  }, [
    address,
    chainId,
    isConnected,
    connectors,
    evmConnectAsync,
    evmDisconnect,
    handleAuthSuccess,
    isDev,
    wagmiConfig,
  ]);

  useEffect(() => {
    const shouldLock =
      stage === "boot" || loading || profileLoading || profileSaving;
    if (!shouldLock) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [stage, loading, profileLoading, profileSaving]);

  if (stage === "boot") {
    return (
      <div className="fixed inset-0 z-2147483647 bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono tracking-[0.35em] text-2xl md:text-3xl">
          <span className="h-5 w-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-3xl p-6 md:p-7 flex flex-col gap-4 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
        style={{
          background: "rgba(8, 6, 16, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {stage === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1">
                <p className="text-base font-semibold text-white">Sign in</p>
                <p className="text-xs leading-relaxed text-secondary">
                  Choose how you&apos;d like to continue.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {oauthError && (
                  <p className="text-xs text-red-300/90">
                    We couldn&apos;t complete sign-in. Please try again.
                  </p>
                )}

                <AuthButton
                  primary
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <ProviderIcon.Google />
                  )}
                  <span>Continue with Google</span>
                </AuthButton>

                <AuthButton onClick={handleXLogin} disabled={loading}>
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <ProviderIcon.X />
                  )}
                  <span>Continue with X</span>
                </AuthButton>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/6" />
                  <span className="label-mono text-meta text-tertiary">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-white/6" />
                </div>

                <AuthButton
                  onClick={() => void handleLoginWithEvm()}
                  disabled={loading || evmConnecting}
                >
                  {loading || evmConnecting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <ProviderIcon.Wallet />
                  )}
                  <span>
                    {loading || evmConnecting
                      ? "Connecting…"
                      : "Continue with EVM wallet"}
                  </span>
                </AuthButton>

                <AuthButton
                  onClick={() => void handleLoginWithSolana()}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <ProviderIcon.Wallet />
                  )}
                  <span>
                    {loading ? "Connecting…" : "Continue with Solana wallet"}
                  </span>
                </AuthButton>

                {phantomBrowseFallbackUrl && (
                  <a
                    href={phantomBrowseFallbackUrl}
                    rel="noreferrer"
                    className="block w-full rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-center text-xs text-secondary transition hover:bg-white/8 hover:text-white"
                  >
                    Open in Phantom
                  </a>
                )}

                {error && (
                  <p className="mt-2 text-xs text-red-300/90">{error}</p>
                )}
                <p className="pt-2 text-[11px] leading-relaxed text-tertiary">
                  Wallet sign-ins use a signed message to prove ownership. No
                  funds move.
                </p>
              </div>
            </motion.div>
          ) : stage === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1.5">
                <p className="text-sm md:text-base font-semibold text-primary">
                  Finish setting up your profile
                </p>
                <p className="text-[11px] md:text-xs text-secondary leading-relaxed">
                  We&apos;ll use this to personalize MeeMaw. Confirm the details
                  below before entering the app.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-caption text-secondary">Name</label>
                  <input
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption text-secondary">Email</label>
                  <input
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-caption text-secondary">Date of birth</label>
                    <input
                      type="date"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                      value={profileForm.date_of_birth}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          date_of_birth: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <Dropdown
                    label="Gender"
                    value={profileForm.gender}
                    placeholder="Select…"
                    disabled={profileLoading || profileSaving}
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                      { value: "Prefer not to say", label: "Prefer not to say" },
                    ]}
                    onChange={(v) =>
                      setProfileForm((prev) => ({ ...prev, gender: v }))
                    }
                  />
                </div>

                <Dropdown
                  label="Ethnicity"
                  value={profileForm.ethnicity}
                  placeholder="Select…"
                  disabled={profileLoading || profileSaving}
                  options={[
                    { value: "Indian", label: "Indian" },
                    { value: "Asian", label: "Asian" },
                    { value: "Caucasian", label: "Caucasian" },
                    { value: "Latino", label: "Latino" },
                    { value: "Black", label: "Black" },
                    { value: "Middle Eastern", label: "Middle Eastern" },
                    { value: "Native American", label: "Native American" },
                    { value: "Pacific Islander", label: "Pacific Islander" },
                    { value: "Mixed", label: "Mixed" },
                    { value: "Other", label: "Other" },
                    { value: "Prefer not to say", label: "Prefer not to say" },
                  ]}
                  onChange={(v) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      ethnicity: v,
                    }))
                  }
                />

                {profileError && (
                  <p className="text-xs text-red-400">{profileError}</p>
                )}

                <AuthButton
                  type="submit"
                  primary
                  disabled={profileLoading || profileSaving}
                >
                  {(profileLoading || profileSaving) && (
                    <span className="mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block align-middle" />
                  )}
                  <span className="align-middle">
                    {profileSaving
                      ? "Saving…"
                      : profileLoading
                        ? "Loading…"
                        : "Continue"}
                  </span>
                </AuthButton>
              </form>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {(loading || profileLoading || profileSaving) && (
        <div
          className="fixed inset-0 z-2147483646 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)",
          }}
        >
          <div className="flex min-h-20 items-center gap-3 rounded-full border border-white/10 bg-white/3 px-5 py-2.5 text-xl text-secondary shadow-[0_0_80px_rgba(142,84,255,0.25)] backdrop-blur-md">
            <span className="h-5 w-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
            <span className="tracking-[0.25em] uppercase text-tertiary">Flashback AI</span>
            <span className="h-px w-8 bg-linear-to-r from-emerald-400 via-sky-400 to-violet-400" />
            <span className="bg-linear-to-r from-emerald-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
              {profileSaving
                ? "Saving your profile..."
                : profileLoading
                  ? "Loading your profile..."
                  : "Redirecting..."}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
