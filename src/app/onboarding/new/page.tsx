"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/AppHeader";
import {
  Button,
  Chip,
  ErrorBanner,
  Eyebrow,
  Input,
  PageLoader,
  PageShell,
  Spinner,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import {
  useArchetypeQuestions,
  useCreateLegacy,
  useSubmitArchetypeAnswers,
  useUploadOnboardingPhoto,
} from "../../lib/queries";

type Step = "photo" | "details" | "archetype";

type StepMeta = {
  id: Step;
  index: number;
  label: string;
  module: string;
  headTop: string;
  headAccent: string;
  hint: string;
};

const STEPS: StepMeta[] = [
  {
    id: "photo",
    index: 1,
    label: "Face",
    module: "reference",
    headTop: "First,",
    headAccent: "their face.",
    hint: "One clear photo so we can recognise them inside the moments you'll later share. Optional: you can skip and add later.",
  },
  {
    id: "details",
    index: 2,
    label: "Identity",
    module: "the basics",
    headTop: "Now,",
    headAccent: "the basics.",
    hint: "Just enough to begin. The rest of who they were will surface through conversation.",
  },
  {
    id: "archetype",
    index: 3,
    label: "Essence",
    module: "who they were",
    headTop: "And",
    headAccent: "who they were.",
    hint: "Pick what feels closest. There's no wrong answer, and you can skip any you're unsure about.",
  },
];

const RELATIONSHIPS = [
  "mother",
  "father",
  "grandmother",
  "grandfather",
  "sister",
  "brother",
  "son",
  "daughter",
  "spouse",
  "partner",
  "friend",
  "other",
];

const GENDERS = [
  { value: "she", label: "She / her" },
  { value: "he", label: "He / him" },
  { value: "they", label: "They / them" },
];

// ─────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────

export default function NewLegacyOnboarding() {
  const auth = useRequireAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("photo");
  const [error, setError] = useState<string | null>(null);

  // Photo step state
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

  // Details step state
  const [deceasedName, setDeceasedName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [customRelationship, setCustomRelationship] = useState("");
  const [contributorDisplayName, setContributorDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);

  // Archetype step state
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Queries / mutations
  const uploadPhoto = useUploadOnboardingPhoto();
  const createLegacy = useCreateLegacy();
  const archetypeQ = useArchetypeQuestions(personId ?? "", !!personId);
  const submitAnswers = useSubmitArchetypeAnswers(personId ?? "");

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  // Scroll lock during the flashcard phase — questions are answered one at a
  // time and the entire flow is meant to fit the viewport. Background page
  // scroll is a distraction (and a source of vertigo for older users).
  useEffect(() => {
    if (step !== "archetype") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [step]);

  const handlePhotoUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      setStep("details");
      return;
    }
    setError(null);
    try {
      const res = await uploadPhoto.mutateAsync(photoFile);
      setUploadId(res.uploadId);
      setStep("details");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const rel = relationship === "other" ? customRelationship.trim() : relationship;
    if (!deceasedName.trim() || !rel || !contributorDisplayName.trim() || !gender) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const res = await createLegacy.mutateAsync({
        deceasedName: deceasedName.trim(),
        relationship: rel,
        contributorDisplayName: contributorDisplayName.trim(),
        gender,
        uploadId: uploadId ?? undefined,
      });
      setPersonId(res.personId);
      setStep("archetype");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create legacy.");
    }
  };

  const handleSubmitAnswers = async (e: FormEvent) => {
    e.preventDefault();
    if (!personId || !archetypeQ.data) return;
    setError(null);

    const unanswered = archetypeQ.data.filter(
      (q) => !answers[q.id] && !q.allow_skip
    );
    if (unanswered.length > 0) {
      setError(`Please answer: ${unanswered.map((q) => `"${q.text}"`).join(", ")}`);
      return;
    }

    try {
      const res = await submitAnswers.mutateAsync({
        contributorDisplayName: contributorDisplayName.trim(),
        answers: archetypeQ.data
          .filter((q) => answers[q.id])
          .map((q) => ({ question_id: q.id, option_id: answers[q.id] })),
      });
      router.replace(
        `/legacies/${encodeURIComponent(personId)}/sessions/${encodeURIComponent(
          res.sessionId
        )}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answers.");
    }
  };

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <PageLoader label="Starting" />
      </PageShell>
    );
  }

  const meta = STEPS.find((s) => s.id === step)!;
  const archetypeAnswered = Object.keys(answers).length;
  const archetypeTotal = archetypeQ.data?.length ?? 0;

  return (
    <PageShell>
      <AppHeader back="history" />

      {/* Editorial intro — readout, big bicolor headline, subtitle.
          On the archetype phase the intro collapses: the flashcards become
          the focal headlines themselves and the viewport stays locked. */}
      {step !== "archetype" && (
        <section key={`intro-${step}`} className="step-in mb-8 sm:mb-10">
          <div className="flex items-center gap-3 label-mono text-meta text-secondary">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-soft))]/40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_10px_rgba(180,173,255,0.9)]" />
            </span>
            <span>Archive</span>
            <span className="text-white/30">/</span>
            <span>new entry</span>
            <span className="text-white/30">/</span>
            <span>{meta.module}</span>
          </div>
          <h1 className="display-sans text-display mt-5 leading-[0.95] text-white">
            {meta.headTop}
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(var(--accent-soft),1) 0%, rgba(var(--accent),1) 100%)",
              }}
            >
              {meta.headAccent}
            </span>
          </h1>
          <p className="mt-4 max-w-md text-body text-secondary">{meta.hint}</p>
        </section>
      )}

      {/* Progress rail */}
      <div className={step === "archetype" ? "mb-6" : "mb-10 sm:mb-12"}>
        <ProgressRail current={step} />
      </div>

      {error && (
        <div className="mb-6">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {/* Asymmetric editorial split — live portrait on the left, form on the right */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        <aside
          className={`lg:col-span-5 xl:col-span-5 ${
            step === "archetype" ? "hidden lg:block" : ""
          }`}
        >
          <div className="lg:sticky lg:top-6">
            <LivePortrait
              step={step}
              photoPreview={photoPreview}
              name={deceasedName}
              relationship={
                relationship === "other" ? customRelationship : relationship
              }
              gender={gender}
              archetypeAnswered={archetypeAnswered}
              archetypeTotal={archetypeTotal}
            />
            <p className="mt-4 flex items-center gap-2 label-mono text-meta text-secondary">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-soft))]" />
              Drawing portrait · live preview
            </p>
          </div>
        </aside>

        <div className="lg:col-span-7 xl:col-span-7">
          <div key={`step-${step}`} className="step-in-delayed">
            {step === "photo" && (
              <PhotoStep
                fileRef={fileRef}
                photoFile={photoFile}
                photoPreview={photoPreview}
                setPhotoFile={setPhotoFile}
                clear={() => {
                  setPhotoFile(null);
                  setUploadId(null);
                }}
                onSubmit={handlePhotoUpload}
                onCancel={() => router.back()}
                pending={uploadPhoto.isPending}
              />
            )}

            {step === "details" && (
              <DetailsStep
                deceasedName={deceasedName}
                setDeceasedName={setDeceasedName}
                relationship={relationship}
                setRelationship={setRelationship}
                customRelationship={customRelationship}
                setCustomRelationship={setCustomRelationship}
                gender={gender}
                setGender={setGender}
                contributorDisplayName={contributorDisplayName}
                setContributorDisplayName={setContributorDisplayName}
                onSubmit={handleCreate}
                onBack={() => setStep("photo")}
                pending={createLegacy.isPending}
              />
            )}

            {step === "archetype" && (
              <ArchetypeStep
                isLoading={archetypeQ.isLoading}
                isError={archetypeQ.isError}
                error={archetypeQ.error}
                questions={archetypeQ.data ?? []}
                answers={answers}
                setAnswers={setAnswers}
                onSubmit={handleSubmitAnswers}
                onBack={() => setStep("details")}
                pending={submitAnswers.isPending}
              />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Progress rail — three nodes, hairline connectors, fills as you progress
// ─────────────────────────────────────────────────────────────────────────

function ProgressRail({ current }: { current: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.id === current);
  const pct = ((activeIndex + 1) / STEPS.length) * 100;

  return (
    <section>
      <div className="relative flex items-center">
        {/* Base rule — strong enough to read on the dark cosmos background */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-[19px] h-0.5 rounded-full bg-white/15"
        />
        {/* Filled portion */}
        <span
          aria-hidden
          className="absolute left-0 top-[19px] h-0.5 rounded-full bg-linear-to-r from-[rgb(var(--accent-soft))] via-[rgb(var(--accent))] to-[rgb(var(--accent-soft))]/70 shadow-[0_0_14px_rgba(180,173,255,0.7)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
        <div className="relative flex w-full items-start justify-between">
          {STEPS.map((s, i) => {
            const isActive = i === activeIndex;
            const isPast = i < activeIndex;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div
                  className={`relative grid h-10 w-10 place-items-center rounded-full text-caption font-semibold transition ${
                    isActive
                      ? "bg-[rgb(var(--accent))] text-white shadow-[0_0_24px_rgba(138,168,255,0.65)] ring-2 ring-[rgb(var(--accent-soft))]/40"
                      : isPast
                        ? "bg-white/30 text-white ring-2 ring-white/20"
                        : "bg-[rgba(18,15,34,0.95)] text-secondary ring-2 ring-white/25"
                  }`}
                >
                  {isPast ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M5 12l4 4 10-10"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    s.index.toString().padStart(2, "0")
                  )}
                </div>
                <span
                  className={`label-mono text-caption font-medium ${
                    isActive ? "text-white" : isPast ? "text-secondary" : "text-tertiary"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Live portrait — materializes as the user fills the form
// ─────────────────────────────────────────────────────────────────────────

function LivePortrait({
  step,
  photoPreview,
  name,
  relationship,
  gender,
  archetypeAnswered,
  archetypeTotal,
}: {
  step: Step;
  photoPreview: string | null;
  name: string;
  relationship: string;
  gender: string;
  archetypeAnswered: number;
  archetypeTotal: number;
}) {
  const initials = useMemo(() => {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? "")
        .join("") || "—"
    );
  }, [name]);

  const trimmedName = name.trim();
  const trimmedRel = relationship.trim();
  const archetypePct =
    archetypeTotal > 0
      ? Math.round((archetypeAnswered / archetypeTotal) * 100)
      : 0;

  return (
    <div className="relative">
      {/* Ambient drifting orb behind the card */}
      <span
        aria-hidden
        className="orb-drift pointer-events-none absolute -inset-8 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(123,115,253,0.28),transparent_75%)] blur-2xl"
      />

      <div className="relative mx-auto aspect-3/4 w-full max-w-[340px] overflow-hidden rounded-3xl border border-white/12 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.75)]">
        {/* Base violet sheen — matches Portrait cards on the gallery */}
        <div className="absolute inset-0 bg-linear-to-br from-[rgb(var(--accent))]/30 via-[rgb(var(--accent-deep))]/25 to-black/60" />

        {/* Photo or initials */}
        {photoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="Reference"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="display-sans select-none text-6xl text-secondary sm:text-7xl">
              {initials}
            </span>
          </div>
        )}

        {/* Hairline top sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent"
        />

        {/* Warm bottom halo */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_120%,rgba(240,200,154,0.16)_0%,transparent_60%)]"
        />

        {/* Status pill — top-right */}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 label-mono text-meta text-white/85 backdrop-blur">
          <span className="relative inline-flex h-1 w-1">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--warm))]/70" />
            <span className="relative inline-flex h-1 w-1 rounded-full bg-[rgb(var(--warm))]" />
          </span>
          {step === "photo"
            ? "Composing"
            : step === "details"
              ? "Taking shape"
              : "Almost"}
        </span>

        {/* Caption gradient */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/95 via-black/55 to-transparent" />

        {/* Caption content */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          {trimmedName ? (
            <p className="display-sans text-title leading-[1.1] text-white">
              {trimmedName}
            </p>
          ) : (
            <p className="display-sans text-title leading-[1.1] text-tertiary">
              Their name
            </p>
          )}

          <p className="mt-2 truncate label-mono text-meta text-secondary">
            {trimmedRel ? (
              <span className="capitalize">{trimmedRel}</span>
            ) : (
              <span className="text-tertiary">relationship</span>
            )}
            <span className="mx-1.5 text-tertiary">·</span>
            {gender ? (
              <span className="text-[rgb(var(--warm))]/85">{gender}</span>
            ) : (
              <span className="text-tertiary">pronouns</span>
            )}
          </p>

          {/* Archetype progress, only on step 3 */}
          {step === "archetype" && archetypeTotal > 0 && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between label-mono text-meta text-tertiary">
                <span>Essence</span>
                <span className="text-white/70">
                  {archetypeAnswered}/{archetypeTotal}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full bg-linear-to-r from-[rgb(var(--accent-soft))] to-[rgb(var(--accent))] transition-[width] duration-500"
                  style={{ width: `${archetypePct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step content — renders directly on the ambient background
// ─────────────────────────────────────────────────────────────────────────

function StepFooter({
  onBack,
  backLabel = "Back",
  children,
}: {
  onBack: () => void;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-2 border-t border-white/22 pt-6">
      <Button variant="ghost" type="button" onClick={onBack}>
        {backLabel}
      </Button>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function PhotoStep({
  fileRef,
  photoFile,
  photoPreview,
  setPhotoFile,
  clear,
  onSubmit,
  onCancel,
  pending,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  photoFile: File | null;
  photoPreview: string | null;
  setPhotoFile: (f: File | null) => void;
  clear: () => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <Eyebrow>Reference image · optional</Eyebrow>

      <div className="relative mt-5 overflow-hidden rounded-3xl border border-white/22 bg-linear-to-b from-white/6 to-white/2 px-6 py-12 sm:py-14">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-white/35 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(123,115,253,0.18)_0%,transparent_70%)]"
        />

        <div className="relative flex flex-col items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Upload a photo"
            className="group/upload relative grid h-48 w-48 place-items-center overflow-hidden rounded-full border-2 border-dashed border-white/35 bg-white/6 text-secondary transition hover:border-[rgb(var(--accent-soft))]/70 hover:bg-white/12 hover:text-white sm:h-56 sm:w-56"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(123,115,253,0.32),transparent_72%)] opacity-0 transition group-hover/upload:opacity-100"
            />
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="relative flex flex-col items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-body font-medium text-primary">
                  Tap to upload
                </span>
              </div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPhotoFile(f);
            }}
          />
          {photoFile && (
            <button
              type="button"
              className="rounded-full border border-white/22 bg-white/6 px-4 py-2 text-caption text-secondary transition hover:border-white/40 hover:bg-white/12 hover:text-white"
              onClick={clear}
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-body text-secondary">
        JPG or PNG · face roughly centered · we'll crop for you.
      </p>

      <StepFooter onBack={onCancel} backLabel="Cancel">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {photoFile ? (pending ? "Uploading…" : "Continue") : "Skip"}
        </Button>
      </StepFooter>
    </form>
  );
}

function DetailsStep({
  deceasedName,
  setDeceasedName,
  relationship,
  setRelationship,
  customRelationship,
  setCustomRelationship,
  gender,
  setGender,
  contributorDisplayName,
  setContributorDisplayName,
  onSubmit,
  onBack,
  pending,
}: {
  deceasedName: string;
  setDeceasedName: (v: string) => void;
  relationship: string;
  setRelationship: (v: string) => void;
  customRelationship: string;
  setCustomRelationship: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  contributorDisplayName: string;
  setContributorDisplayName: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  pending: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="divide-y divide-white/22">
        <section className="pb-7">
          <Eyebrow>Their name</Eyebrow>
          <Input
            className="mt-3"
            value={deceasedName}
            onChange={(e) => setDeceasedName(e.target.value)}
            placeholder="Jane Doe"
            autoFocus
          />
        </section>

        <section className="py-7">
          <Eyebrow>Relationship to you</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {RELATIONSHIPS.map((r) => (
              <Chip
                key={r}
                active={relationship === r}
                onClick={() => setRelationship(r)}
              >
                <span className="capitalize">{r}</span>
              </Chip>
            ))}
          </div>
          {relationship === "other" && (
            <Input
              className="mt-4"
              value={customRelationship}
              onChange={(e) => setCustomRelationship(e.target.value)}
              placeholder="e.g. mentor"
            />
          )}
        </section>

        <section className="py-7">
          <Eyebrow>Pronouns</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {GENDERS.map((g) => (
              <Chip
                key={g.value}
                active={gender === g.value}
                onClick={() => setGender(g.value)}
              >
                {g.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="pt-7">
          <Eyebrow>What they called you</Eyebrow>
          <Input
            className="mt-3"
            value={contributorDisplayName}
            onChange={(e) => setContributorDisplayName(e.target.value)}
            placeholder="The name they'd use for you"
            autoComplete="given-name"
          />
        </section>
      </div>

      <StepFooter onBack={onBack}>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Creating…" : "Continue"}
        </Button>
      </StepFooter>
    </form>
  );
}

type ArchetypeQuestion = {
  id: string;
  text: string;
  allow_skip?: boolean;
  options: Array<{ id: string; label: string }>;
};

/** Flashcard archetype — one question at a time. Replaces the scrollable
 *  list because cognitive-impaired users get overwhelmed by long forms; a
 *  single focused question with big options is far easier to complete. */
function ArchetypeStep({
  isLoading,
  isError,
  error,
  questions,
  answers,
  setAnswers,
  onSubmit,
  onBack,
  pending,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  questions: ArchetypeQuestion[];
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  pending: boolean;
}) {
  const [cardIndex, setCardIndex] = useState(0);

  // If questions reload, snap back to the start to avoid a stale index.
  useEffect(() => {
    setCardIndex(0);
  }, [questions.length]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-body text-secondary">
        <Spinner /> Generating questions
      </div>
    );
  }
  if (isError) {
    return (
      <ErrorBanner>
        {error instanceof Error ? error.message : "Failed to load questions."}
      </ErrorBanner>
    );
  }
  if (questions.length === 0) {
    return (
      <ErrorBanner>No questions were returned.</ErrorBanner>
    );
  }

  const safeIndex = Math.min(cardIndex, questions.length - 1);
  const q = questions[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === questions.length - 1;
  const answered = !!answers[q.id];
  const canAdvance = answered || q.allow_skip;

  const goPrev = () => {
    if (isFirst) onBack();
    else setCardIndex((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    if (!canAdvance) return;
    setCardIndex((i) => Math.min(questions.length - 1, i + 1));
  };

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      {/* Card header — question number + progress */}
      <div className="flex items-center justify-between">
        <span className="label-mono text-caption text-secondary">
          Question {(safeIndex + 1).toString().padStart(2, "0")}
          <span className="mx-2 text-tertiary">/</span>
          <span className="text-tertiary">
            {questions.length.toString().padStart(2, "0")}
          </span>
        </span>
        {q.allow_skip && !answered && (
          <button
            type="button"
            onClick={goNext}
            disabled={isLast}
            className="rounded-full border border-white/22 bg-white/4 px-4 py-2 text-caption text-secondary transition hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Skip
          </button>
        )}
      </div>

      {/* The card — fades + lifts on each question change */}
      <div
        key={q.id}
        className="step-in mt-6 flex-1 rounded-3xl border border-white/22 bg-linear-to-b from-white/6 to-white/2 p-6 sm:p-8"
      >
        <p className="text-headline text-primary">{q.text}</p>

        <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {q.options.map((opt) => {
            const active = answers[q.id] === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                }
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-body leading-snug transition ${
                  active
                    ? "border-[rgb(var(--accent-soft))]/70 bg-[rgb(var(--accent))]/55 text-white shadow-[0_12px_30px_-12px_rgba(123,115,253,0.7)]"
                    : "border-white/22 bg-white/5 text-primary hover:border-white/45 hover:bg-white/10"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                    active
                      ? "border-white bg-white text-[rgb(var(--accent-deep))]"
                      : "border-white/40 bg-transparent"
                  }`}
                  aria-hidden
                >
                  {active && (
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                      <path
                        d="M5 12l4 4 10-10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {answered && q.allow_skip && (
          <button
            type="button"
            className="text-caption mt-4 text-secondary underline-offset-4 hover:text-white hover:underline"
            onClick={() =>
              setAnswers((prev) => {
                const { [q.id]: _, ...rest } = prev;
                return rest;
              })
            }
          >
            Clear my answer
          </button>
        )}
      </div>

      {/* Card-level pager — back / next / submit on last */}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/22 pt-5">
        <button
          type="button"
          onClick={goPrev}
          className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/4 px-5 py-2.5 text-caption text-secondary transition hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isFirst ? "Back" : "Previous"}
        </button>

        {/* Pip indicator — small dots for at-a-glance progress */}
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
          {questions.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIndex
                  ? "w-6 bg-[rgb(var(--accent-soft))]"
                  : i < safeIndex
                    ? "w-1.5 bg-white/50"
                    : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        {isLast ? (
          <Button type="submit" disabled={pending || !canAdvance}>
            {pending && <Spinner />}
            {pending ? "Starting…" : "Start first conversation"}
          </Button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--accent-soft))]/55 bg-[rgb(var(--accent))]/30 px-5 py-2.5 text-caption font-medium text-white transition hover:bg-[rgb(var(--accent))]/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
