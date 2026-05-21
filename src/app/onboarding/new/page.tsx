"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/AppHeader";
import {
  Button,
  Card,
  Chip,
  ErrorBanner,
  Eyebrow,
  Input,
  PageShell,
  Spinner,
  StepIndicator,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import {
  useArchetypeQuestions,
  useCreateLegacy,
  useSubmitArchetypeAnswers,
  useUploadOnboardingPhoto,
} from "../../lib/queries";

type Step = "photo" | "details" | "archetype";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "photo", label: "Photo" },
  { id: "details", label: "Details" },
  { id: "archetype", label: "Archetype" },
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
      <PageShell narrow>
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-5 w-5" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell narrow>
      <AppHeader back="history" title="New legacy" />
      <div>
        <div className="mb-7">
          <h1 className="display-sans text-headline text-white">
            Add someone
            <br />
            <span className="text-tertiary">to keep close.</span>
          </h1>
        </div>

        <div className="mb-8">
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner>{error}</ErrorBanner>
          </div>
        )}

        {step === "photo" && (
          <Card variant="glass" className="p-6">
            <p className="display-sans text-title text-white">
              Add a photo (optional)
            </p>
            <p className="mt-1 text-xs text-secondary">
              A clear face photo helps us recognise them in moments later.
            </p>

            <div className="mt-6 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-dashed border-white/20 bg-white/3 text-tertiary transition hover:border-white/40 hover:text-white/70 sm:h-36 sm:w-36"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs">Tap to upload</span>
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
                  className="label-mono text-meta text-tertiary hover:text-white/80"
                  onClick={() => {
                    setPhotoFile(null);
                    setUploadId(null);
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>

            <form onSubmit={handlePhotoUpload}>
              <div className="mt-8 flex items-center justify-between gap-2">
                <Button variant="ghost" type="button" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadPhoto.isPending}>
                  {uploadPhoto.isPending && <Spinner />}
                  {photoFile
                    ? uploadPhoto.isPending
                      ? "Uploading…"
                      : "Continue"
                    : "Skip"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {step === "details" && (
          <Card variant="glass" className="p-6">
            <p className="display-sans text-title text-white">
              Tell us about them
            </p>
            <p className="mt-1 text-xs text-secondary">
              Just the basics. You&apos;ll fill in the rest through conversation.
            </p>

            <form onSubmit={handleCreate}>
              <div className="mt-6 space-y-5">
                <div>
                  <Eyebrow>Their name</Eyebrow>
                  <Input
                    className="mt-2"
                    value={deceasedName}
                    onChange={(e) => setDeceasedName(e.target.value)}
                    placeholder="Jane Doe"
                    autoFocus
                  />
                </div>

                <div>
                  <Eyebrow>Relationship to you</Eyebrow>
                  <div className="mt-2 flex flex-wrap gap-1.5">
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
                      className="mt-3"
                      value={customRelationship}
                      onChange={(e) => setCustomRelationship(e.target.value)}
                      placeholder="e.g. mentor"
                    />
                  )}
                </div>

                <div>
                  <Eyebrow>Pronouns</Eyebrow>
                  <div className="mt-2 flex flex-wrap gap-1.5">
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
                </div>

                <div>
                  <Eyebrow>Your name</Eyebrow>
                  <Input
                    className="mt-2"
                    value={contributorDisplayName}
                    onChange={(e) => setContributorDisplayName(e.target.value)}
                    placeholder="The name they'd use for you"
                    autoComplete="given-name"
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-2">
                <Button variant="ghost" type="button" onClick={() => setStep("photo")}>
                  Back
                </Button>
                <Button type="submit" disabled={createLegacy.isPending}>
                  {createLegacy.isPending && <Spinner />}
                  {createLegacy.isPending ? "Creating…" : "Continue"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {step === "archetype" && (
          <Card variant="glass" className="p-6">
            <p className="display-sans text-title text-white">
              A little more about them
            </p>
            <p className="mt-1 text-xs text-secondary">
              Pick what feels closest. There&apos;s no wrong answer — and you can
              skip any you&apos;re unsure about.
            </p>

            {archetypeQ.isLoading ? (
              <div className="mt-6 flex items-center gap-3 label-mono text-meta text-tertiary">
                <Spinner /> Generating questions
              </div>
            ) : archetypeQ.isError ? (
              <div className="mt-4">
                <ErrorBanner>
                  {archetypeQ.error instanceof Error
                    ? archetypeQ.error.message
                    : "Failed to load questions."}
                </ErrorBanner>
              </div>
            ) : (
              <form onSubmit={handleSubmitAnswers}>
                <div className="mt-6 space-y-7">
                  {(archetypeQ.data ?? []).map((q) => (
                    <div key={q.id}>
                      <p className="text-sm text-primary">{q.text}</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {q.options.map((opt) => {
                          const active = answers[q.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                              }
                              className={`rounded-2xl border px-3 py-2.5 text-left text-xs leading-snug transition ${
                                active
                                  ? "border-[rgb(var(--accent-soft))]/50 bg-[rgb(var(--accent))]/15 text-white"
                                  : "border-white/10 bg-white/3 text-secondary hover:border-white/25"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {q.allow_skip && answers[q.id] && (
                        <button
                          type="button"
                          className="mt-2 label-mono text-meta text-tertiary hover:text-white/65"
                          onClick={() =>
                            setAnswers((prev) => {
                              const { [q.id]: _, ...rest } = prev;
                              return rest;
                            })
                          }
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between gap-2">
                  <Button variant="ghost" type="button" onClick={() => setStep("details")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={submitAnswers.isPending}>
                    {submitAnswers.isPending && <Spinner />}
                    {submitAnswers.isPending ? "Starting…" : "Start first conversation"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>
    </PageShell>
  );
}
