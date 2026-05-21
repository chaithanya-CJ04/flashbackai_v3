"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import {
  Button,
  Card,
  ErrorBanner,
  Input,
  PageShell,
  ScreenIntro,
  Spinner,
} from "../components/ui";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { clearToken } from "../hooks/useAuth";
import { userApi, type UserDetails } from "../lib/api";

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
    setUploadError(null);
    setUploading(true);
    try {
      const res = await userApi.uploadPortrait(userId, file);
      setUser((prev) =>
        prev ? { ...prev, imageUrl: res.data.imageUrl } : prev
      );
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
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
      <AppHeader title="Account" />
      <div>
        <ScreenIntro
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
          <div className="flex items-center gap-2 text-xs text-tertiary">
            <Spinner /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/4 text-xs text-tertiary transition hover:border-white/30"
                  disabled={uploading}
                >
                  {user.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.imageUrl}
                      alt="You"
                      className="h-full w-full object-cover"
                    />
                  ) : uploading ? (
                    <Spinner />
                  ) : (
                    "Upload"
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickImage(f);
                    e.target.value = "";
                  }}
                />
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {user.name || user.userName || "Unnamed"}
                  </p>
                  <p className="text-xs text-tertiary">
                    User ID:{" "}
                    <span className="font-mono">{user.user_id}</span>
                  </p>
                  <p className="mt-1 text-caption text-tertiary">
                    Click the portrait to upload or replace.
                  </p>
                </div>
              </div>
              {uploadError && (
                <div className="mt-3">
                  <ErrorBanner>{uploadError}</ErrorBanner>
                </div>
              )}
            </Card>

            <Card className="space-y-3 p-5">
              <p className="text-sm font-semibold text-primary">Personal details</p>

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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                  <div className="mt-1 flex flex-wrap gap-1">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                          gender === g
                            ? "border-violet-400/60 bg-violet-500/15 text-white"
                            : "border-white/10 bg-white/5 text-secondary hover:border-white/25"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-caption text-secondary">Ethnicity</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ETHNICITIES.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEthnicity(e)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                        ethnicity === e
                          ? "border-violet-400/60 bg-violet-500/15 text-white"
                          : "border-white/10 bg-white/5 text-secondary hover:border-white/25"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {saveError && <ErrorBanner>{saveError}</ErrorBanner>}
              {saved && (
                <p className="text-xs text-emerald-300/80">Profile saved.</p>
              )}

              <div className="flex justify-end">
                <Button onClick={() => void save()} disabled={saving}>
                  {saving && <Spinner />}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </Card>

            <nav className="space-y-2.5">
              {[
                { href: "/account/wallet", title: "Wallet", hint: "Custodial wallets" },
                { href: "/account/rewards", title: "Rewards", hint: "XP, credits & streak" },
                { href: "/account/vault", title: "Vault", hint: "Encrypted storage" },
                { href: "/account/redeem", title: "Redeem code", hint: "Activate a campaign code" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/12 bg-[rgba(18,15,34,0.62)] px-5 py-4 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color,transform] duration-300 hover:border-[rgb(var(--accent-soft))]/45 hover:bg-[rgba(28,22,52,0.7)] hover:shadow-[0_30px_60px_-20px_rgba(123,115,253,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                >
                  {/* Violet halo wash that fades in on hover — same radial
                      gradient pattern as the legacy Portrait card. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  >
                    <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_50%,rgba(123,115,253,0.22)_0%,transparent_60%)]" />
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent transition group-hover:via-[rgba(200,170,255,0.6)]"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-r-full bg-linear-to-b from-transparent via-[rgb(var(--accent-soft))] to-transparent opacity-0 transition group-hover:opacity-100"
                  />
                  <div className="relative">
                    <p className="display-sans text-title text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-secondary">{item.hint}</p>
                  </div>
                  <span className="relative text-tertiary transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--accent-soft))]">→</span>
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => {
                clearToken();
                window.location.replace("/login");
              }}
              className="group relative mt-8 w-full overflow-hidden rounded-2xl border border-white/12 bg-[rgba(18,15,34,0.62)] py-3.5 label-mono text-meta text-secondary backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color,color] duration-300 hover:border-red-400/70 hover:bg-[rgba(70,18,28,0.78)] hover:text-red-100 hover:shadow-[0_30px_60px_-20px_rgba(255,80,90,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              >
                <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_50%,rgba(255,90,100,0.28)_0%,transparent_65%)]" />
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent transition group-hover:via-[rgba(255,160,170,0.7)]"
              />
              <span className="relative">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
