"use client";

import { useEffect, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  ErrorBanner,
  Input,
  PageShell,
  ScreenIntro,
  PageLoader,
  Spinner,
  useToast,
} from "../components/ui";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { clearToken } from "../hooks/useAuth";
import { userApi, type UserDetails } from "../lib/api";
import { useWallet } from "../lib/queries";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const ETHNICITIES = [
  "Indian",
  "Asian",
  "Caucasian",
  "Latino",
  "Black",
  "Middle Eastern",
  "Native American",
  "Pacific Islander",
  "Mixed",
  "Other",
  "Prefer not to say",
];

export default function AccountPage() {
  const auth = useRequireAuth();
  const userId = auth.status === "authenticated" ? auth.userId : null;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const toast = useToast();

  const walletQ = useWallet(userId);
  const wd = walletQ.data?.walletDetails as
    | { wallet_address?: string; storage_url?: string }
    | undefined;
  const walletAddress = wd?.wallet_address ?? "";
  const walletChainUrl = walletAddress
    ? `https://greenfieldscan.com/account/${walletAddress}`
    : "";
  const walletStorageUrl = wd?.storage_url ?? "";

  const confirmLogout = () => {
    clearToken();
    window.location.replace("/login");
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    userApi
      .getUser(userId)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setUser(d);
        setName(d.name ?? d.userName ?? "");
        setEmail(d.email ?? "");
        setDob(d.date_of_birth ?? "");
        setGender(d.gender ?? "");
        setEthnicity(d.ethnicity ?? "");
      })
      .catch((e) => {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "Failed to load user.");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await userApi.updateUser(userId, {
        name: name.trim(),
        email: email.trim(),
        date_of_birth: dob.trim(),
        gender,
        ethnicity,
        profile_setup_completed: true,
      });
      setUser(res.data);
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const onPickImage = async (file: File) => {
    if (!userId) return;
    // Reject obviously-wrong files early so the user doesn't wait for the
    // server round-trip just to be told the format is bad.
    if (!file.type.startsWith("image/")) {
      setUploadError("Please pick an image file.");
      return;
    }
    // 10 MB cap — matches what onboarding uses.
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image is too large. Pick one under 10 MB.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const res = await userApi.uploadPortrait(userId, file);
      setUser((prev) =>
        prev ? { ...prev, imageUrl: res.data.imageUrl } : prev
      );
      toast.show("Portrait updated", "success");
    } catch (e) {
      // Surface backend status + detail so the next-step fix is debuggable
      // instead of forever showing "Failed to upload user portrait".
      const apiErr = e as { status?: number; detail?: unknown; message?: string };
      const detail =
        typeof apiErr?.detail === "string"
          ? apiErr.detail
          : apiErr?.detail
            ? JSON.stringify(apiErr.detail).slice(0, 200)
            : "";
      const status = apiErr?.status ? ` (${apiErr.status})` : "";
      const msg =
        (apiErr?.message || "Upload failed.") +
        status +
        (detail ? `: ${detail}` : "");
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[portrait upload] failed", { error: e, file });
      }
      setUploadError(msg);
      toast.show(msg, "error");
    } finally {
      setUploading(false);
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
      <AppHeader title="Account" />
      <div>
        <ScreenIntro
          compact
          module="Identity"
          meta={user ? `usr-${user.user_id.slice(0, 6)}` : undefined}
          title={{ top: "YOUR", accent: "PROFILE." }}
          subtitle="Your name, contact details, and signed-in identity."
        />

        {loadError && (
          <div className="mb-4">
            <ErrorBanner>{loadError}</ErrorBanner>
          </div>
        )}

        {!user ? (
          <div className="flex items-center gap-2 label-mono text-meta text-tertiary">
            <Spinner /> Loading…
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="space-y-4 lg:col-span-7">
              <Card halo="violet" className="p-5">
                <PortraitEditor
                  user={user}
                  uploading={uploading}
                  onPick={(f) => void onPickImage(f)}
                  onView={() => setViewerOpen(true)}
                  fileRef={fileRef}
                />
                {uploadError && (
                  <div className="mt-3">
                    <ErrorBanner>{uploadError}</ErrorBanner>
                  </div>
                )}
              </Card>

              <Card className="space-y-4 p-5">
              <h2 className="display-sans text-title text-white">Personal details</h2>

              <div>
                <label className="text-caption text-secondary">Name</label>
                <Input
                  className="mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-caption text-secondary">Email</label>
                <Input
                  className="mt-1"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-caption text-secondary">Date of birth</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div>
                <label className="text-caption text-secondary">Gender</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {GENDERS.map((g) => (
                    <Chip
                      key={g}
                      active={gender === g}
                      onClick={() => setGender(g)}
                    >
                      {g}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-caption text-secondary">Ethnicity</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ETHNICITIES.map((e) => (
                    <Chip
                      key={e}
                      active={ethnicity === e}
                      onClick={() => setEthnicity(e)}
                    >
                      {e}
                    </Chip>
                  ))}
                </div>
              </div>

              {saveError && <ErrorBanner>{saveError}</ErrorBanner>}
              {saved && (
                <p className="label-mono text-meta text-[rgb(var(--mint))]">
                  Profile saved.
                </p>
              )}

              <div className="flex justify-end">
                <Button onClick={() => void save()} disabled={saving}>
                  {saving && <Spinner />}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </Card>
            </div>

            <div className="space-y-2.5 lg:col-span-5">
              <AccountRow
                title="Wallet"
                hint={
                  walletAddress
                    ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
                    : walletQ.isLoading
                      ? "Loading…"
                      : "Custodial wallet"
                }
                disabled={!walletChainUrl}
                onClick={() => {
                  if (walletChainUrl)
                    window.open(walletChainUrl, "_blank", "noopener,noreferrer");
                }}
              />
              <AccountRow
                title="BNB Greenfield"
                hint="Your data"
                disabled={!walletStorageUrl}
                onClick={() => {
                  if (walletStorageUrl)
                    window.open(walletStorageUrl, "_blank", "noopener,noreferrer");
                }}
              />
              <AccountRow
                title="Shelby"
                hint="Your hot storage"
                badge="Coming soon"
                disabled
              />
              <AccountRow
                title="Logout"
                hint="End your session"
                tone="danger"
                onClick={() => setLogoutOpen(true)}
              />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
        title="Logout"
        description="You'll need to sign in again to access your legacies."
        confirmLabel="Yes, logout"
        cancelLabel="Cancel"
        icon={<LogoutIcon />}
      />

      {user?.imageUrl && viewerOpen && (
        <PortraitLightbox
          src={user.imageUrl}
          alt={user.name || user.userName || "Portrait"}
          onClose={() => setViewerOpen(false)}
          onChange={() => {
            setViewerOpen(false);
            fileRef.current?.click();
          }}
        />
      )}
    </PageShell>
  );
}

/* ───────────────────────────────────────────────────────────────────
   PortraitEditor — the avatar block on the account page.
   ───────────────────────────────────────────────────────────────────
   Two distinct affordances so the user always understands:
     • Tap the photo itself  → opens a full-screen viewer
     • Tap the camera badge   → opens the file picker
   Plus drag-and-drop on desktop, and `capture="user"` on the file
   input so iOS / Android offer the front camera directly. */
function PortraitEditor({
  user,
  uploading,
  onPick,
  onView,
  fileRef,
}: {
  user: UserDetails;
  uploading: boolean;
  onPick: (file: File) => void;
  onView: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = !!user.imageUrl && !imgFailed;
  const initials =
    (user.name || user.userName || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
      }}
      className={`flex flex-col items-start gap-5 sm:flex-row sm:items-center ${
        dragOver ? "ring-2 ring-[rgb(var(--accent-soft))]/55 rounded-2xl" : ""
      }`}
    >
      <div className="relative">
        {/* The portrait itself — tap to view */}
        <button
          type="button"
          onClick={() => (hasImage ? onView() : fileRef.current?.click())}
          aria-label={hasImage ? "View portrait" : "Add portrait"}
          disabled={uploading}
          className={`relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border-2 transition active:scale-[0.97] active:duration-75 ${
            hasImage
              ? "border-[rgb(var(--accent-soft))]/45 bg-[rgba(18,15,34,0.7)] hover:border-[rgb(var(--accent-soft))]/75 shadow-[0_18px_50px_-18px_rgba(123,115,253,0.55)]"
              : "border-dashed border-white/35 bg-white/4 hover:border-[rgb(var(--accent-soft))]/55 hover:bg-white/8"
          } sm:h-32 sm:w-32`}
        >
          {hasImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.imageUrl!}
                alt={user.name || user.userName || "Portrait"}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setImgFailed(true)}
              />
              {/* Subtle violet sheen + hover scrim so the tap target reads */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_120%,rgba(123,115,253,0.0)_0%,transparent_60%)] transition-[background] duration-300 group-hover:bg-[radial-gradient(120%_60%_at_50%_120%,rgba(123,115,253,0.28)_0%,transparent_60%)]"
              />
            </>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-secondary">
              <CameraIcon className="h-7 w-7" />
              <span className="label-mono text-meta">{initials}</span>
            </span>
          )}

          {uploading && (
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm"
            >
              <Spinner className="h-6 w-6" />
            </span>
          )}
        </button>

        {/* Camera badge — the change-photo affordance, sits at the
            bottom-right of the avatar. iOS-style "edit" indicator. */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={hasImage ? "Change portrait" : "Upload portrait"}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border border-[rgb(var(--accent-soft))]/55 bg-[rgb(var(--accent))] text-white shadow-[0_10px_24px_-8px_rgba(123,115,253,0.7)] transition active:scale-[0.92] active:duration-75 hover:brightness-110 disabled:opacity-60"
        >
          <CameraIcon className="h-5 w-5" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />

      <div className="min-w-0 flex-1">
        <p className="text-title font-semibold text-primary truncate">
          {user.name || user.userName || "Unnamed"}
        </p>
        <p className="mt-1 label-mono text-meta text-tertiary truncate">
          ID · <span className="text-secondary">{user.user_id.slice(0, 12)}</span>
        </p>
        <p className="mt-2 text-caption text-secondary">
          {hasImage
            ? "Tap the photo to view full-size, or the camera to replace it."
            : "Tap to add a portrait. JPG or PNG, under 10 MB."}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
   PortraitLightbox — full-screen image viewer.
   ───────────────────────────────────────────────────────────────────
   Backdrop click + ESC close, plus a "Change photo" CTA so the viewer
   doubles as a launch point for replacing the portrait. */
function PortraitLightbox({
  src,
  alt,
  onClose,
  onChange,
}: {
  src: string;
  alt: string;
  onClose: () => void;
  onChange: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Portrait viewer"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-md step-in"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/8 text-white transition active:scale-[0.94] active:duration-75 hover:bg-white/14 pt-safe"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M6 6l12 12M6 18L18 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]"
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange();
        }}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--accent-soft))]/55 bg-[rgb(var(--accent))]/40 px-5 py-2.5 text-caption font-medium text-white backdrop-blur transition active:scale-[0.97] active:duration-75 hover:bg-[rgb(var(--accent))]/60"
      >
        <CameraIcon className="h-4 w-4" />
        Change portrait
      </button>
    </div>
  );
}

function CameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.4l1.2-1.6a1.5 1.5 0 0 1 1.2-.6h3.4a1.5 1.5 0 0 1 1.2.6L16.1 6h1.4A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function LogoutIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14 6.5V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 12h11m0 0l-3-3m3 3l-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   AccountRow — full-width nav-style row used by the account menu.
   ───────────────────────────────────────────────────────────────────
   Same big display-sans-title look as the legacy Wallet/Rewards rows,
   but driven by an `onClick` so it can fire arbitrary actions (open a
   wallet explorer in a new tab, open a confirm modal) rather than just
   routing. Three tones: default, danger (logout), disabled (Shelby). */
function AccountRow({
  title,
  hint,
  badge,
  tone = "default",
  disabled = false,
  onClick,
}: {
  title: string;
  hint?: string;
  badge?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const surface =
    tone === "danger"
      ? "border-red-400/25 bg-[rgba(70,18,28,0.32)] hover:border-red-400/70 hover:bg-[rgba(82,20,32,0.6)] hover:shadow-[0_30px_60px_-20px_rgba(255,90,100,0.5),inset_0_1px_0_0_rgba(255,255,255,0.10)]"
      : disabled
        ? "border-white/10 bg-[rgba(18,15,34,0.55)] opacity-55 cursor-not-allowed"
        : "border-white/24 bg-[rgba(18,15,34,0.82)] hover:border-[rgb(var(--accent-soft))]/60 hover:bg-[rgba(28,22,52,0.88)] hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5),inset_0_1px_0_0_rgba(255,255,255,0.14)] active:scale-[0.985] active:duration-75 active:bg-[rgba(32,24,58,0.92)]";

  const titleColor =
    tone === "danger" ? "text-red-200" : "text-white";
  const haloColor =
    tone === "danger"
      ? "bg-[radial-gradient(120%_80%_at_0%_50%,rgba(255,90,100,0.22)_0%,transparent_60%)]"
      : "bg-[radial-gradient(120%_80%_at_0%_50%,rgba(123,115,253,0.22)_0%,transparent_60%)]";
  const accentBar =
    tone === "danger"
      ? "from-transparent via-red-300 to-transparent"
      : "from-transparent via-[rgb(var(--accent-soft))] to-transparent";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group relative block w-full overflow-hidden rounded-2xl border text-left backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.10)] transition-[border-color,box-shadow,background-color,transform] duration-300 ${surface}`}
    >
      {!disabled && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          >
            <span className={`absolute inset-0 ${haloColor}`} />
          </span>
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b ${accentBar} opacity-0 transition group-hover:opacity-100`}
          />
        </>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent"
      />
      <div className="relative flex items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className={`display-sans text-title ${titleColor}`}>{title}</p>
            {badge && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 label-mono text-[10px] text-tertiary">
                {badge}
              </span>
            )}
          </div>
          {hint && (
            <p className="mt-0.5 truncate text-caption text-secondary">
              {hint}
            </p>
          )}
        </div>
        {!disabled && (
          <span
            className={`shrink-0 transition group-hover:translate-x-0.5 ${
              tone === "danger"
                ? "text-red-300 group-hover:text-red-200"
                : "text-tertiary group-hover:text-[rgb(var(--accent-soft))]"
            }`}
          >
            →
          </span>
        )}
      </div>
    </button>
  );
}
