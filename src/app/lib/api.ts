import { API_BASE, fetchWithAuth } from "../hooks/useAuth";

class ApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;

  constructor(status: number, message: string, code?: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { skipAuthRetry?: boolean } = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(init.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetchWithAuth(url, { ...init, headers });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const errEnvelope = (body && typeof body === "object" && "error" in body
      ? (body as { error?: { code?: string; message?: string; detail?: unknown } }).error
      : null) ?? null;
    // Walk every common shape a backend uses to convey an error message so
    // the UI never falls back to a useless "Request failed (500)" when the
    // server actually told us what went wrong.
    const fromBody =
      (typeof body === "object" && body
        ? String(
            (body as Record<string, unknown>).message ??
              (body as Record<string, unknown>).detail ??
              (body as Record<string, unknown>).error ??
              ""
          )
        : typeof body === "string"
          ? body.slice(0, 240)
          : "") || "";
    const message =
      errEnvelope?.message ||
      fromBody ||
      `Request failed (${res.status})`;
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[api] ${init.method || "GET"} ${path} → ${res.status}`, body);
    }
    throw new ApiError(res.status, message, errEnvelope?.code, errEnvelope?.detail);
  }

  return body as T;
}

export { ApiError };

// ---------- Legacy v2 types ----------

export type Legacy = {
  personId: string;
  roleId: string | null;
  deceasedName: string;
  relationship: string;
  contributorDisplayName: string;
  referenceImageUrl: string | null;
  gender: string | null;
  onboardingComplete: boolean;
  archetypeAnswers: Array<{ question_id: string; option_id: string }>;
  role: string;
  createdAt: string;
};

export type LegacyHeader = {
  id: string;
  name: string;
  relationship: string;
  profileSummary: string | null;
  phase: string;
  coverageState?: Record<string, number>;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  profileFacts?: ProfileFact[];
};

export type ProfileFact = {
  id: string;
  factKey: string;
  questionText: string;
  answerText: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type LegacySession = {
  sessionId: string;
  personId: string;
  status: "open" | "wrapped";
  turnCount: number;
  opener: string | null;
  metadata: Record<string, unknown>;
  priorSessionSummary: string | null;
  sessionSummary: string | null;
  wrapMetadata: Record<string, unknown> | null;
  openedAt: string;
  lastTurnAt: string | null;
  wrappedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LegacyTurn = {
  sessionId: string;
  turnIndex: number;
  personId: string;
  userMessage: string;
  assistantReply: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ArchetypeQuestion = {
  id: string;
  text: string;
  allow_free_text: boolean;
  allow_skip: boolean;
  options: Array<{ id: string; label: string }>;
};

export type Moment = {
  id: string;
  title?: string;
  narrative: string;
  timeAnchor?: string | null;
  involves?: unknown[];
  happenedAt?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
};

export type LegacyEntity = {
  id: string;
  kind: string;
  name: string;
  description: string;
  aliases: string[];
  attributes: Record<string, unknown>;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Thread = {
  id: string;
  title: string;
  summary?: string;
};

export type Trait = {
  id: string;
  trait: string;
  evidence: string;
};

export type LegacyQuestion = {
  id: string;
  text: string;
  source: string;
  attributes: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type IdentityMerge = {
  id: string;
  status: "pending" | "approved" | "rejected";
  source_entity_name: string;
  target_entity_name: string;
  reason: string;
};

export type Theme = {
  id: string;
  kind: "universal" | "emergent";
  slug: string;
  displayName: string;
  description: string | null;
  state: "locked" | "unlocked";
  tier: string | null;
  qualifyingCount: number;
  lifePeriodCount: number;
  hasRichSensory: boolean;
  archetypeReady: boolean;
  unlockedAt: string | null;
  threadId: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ThemeArchetypeQuestion = {
  question_id: string;
  text: string;
  options: Array<{ option_id: string; label: string }>;
  allow_skip: boolean;
  allow_free_text: boolean;
};

export type ThemeDetail = Theme & {
  archetypeQuestions: ThemeArchetypeQuestion[] | null;
  archetypeAnswers: unknown;
};

export type ThemeMoment = {
  id: string;
  title: string;
  narrative: string;
  timeAnchor?: string | null;
  involves?: unknown[];
  happenedAt?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
};

export type NodeType = "moment" | "entity" | "thread" | "trait" | "question" | "profile_fact";

export type EditNodeResult = {
  node_type: NodeType;
  node_id: string;
  superseded_id: string | null;
  new_entity_ids: string[];
  edges_added: number;
  edges_removed: number;
  artifact_queued: boolean;
  embedding_jobs_pushed: number;
};

// ---------- API methods ----------

export const legacyApi = {
  listMyLegacies: () =>
    request<{ legacies: Legacy[] }>("/api/v2/legacy/me/legacies"),

  uploadOnboardingPhoto: (photo: File) => {
    const fd = new FormData();
    fd.append("photo", photo);
    return request<{ uploadId: string; referenceImageUrl: string }>(
      "/api/v2/legacy/onboarding/photo",
      { method: "POST", body: fd }
    );
  },

  createLegacy: (input: {
    deceasedName: string;
    relationship: string;
    contributorDisplayName: string;
    gender: string;
    uploadId?: string;
  }) =>
    request<{
      personId: string;
      roleId: string;
      deceasedName: string;
      relationship: string;
      contributorDisplayName: string;
      gender: string;
      referenceImageUrl: string | null;
      createdAt: string;
    }>("/api/v2/legacy/onboarding", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getArchetypeQuestions: (personId: string) =>
    request<{
      person_id: string;
      relationship: string;
      archetype: string;
      questions: ArchetypeQuestion[];
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/onboarding/archetype-questions`
    ),

  submitArchetypeAnswers: (
    personId: string,
    input: {
      contributorDisplayName: string;
      answers: Array<{ question_id: string; option_id: string }>;
    }
  ) =>
    request<{
      sessionId: string;
      opener: string;
      item: LegacySession;
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/onboarding/archetype-answers`,
      { method: "POST", body: JSON.stringify(input) }
    ),

  getLegacyHeader: (personId: string) =>
    request<{ item: LegacyHeader }>(
      `/api/v2/legacy/persons/${encodeURIComponent(personId)}`
    ),

  listSessions: (personId: string, limit = 25) =>
    request<{ items: LegacySession[] }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/sessions?limit=${limit}`
    ),

  startSession: (personId: string, priorSessionSummary = "") =>
    request<{
      sessionId: string;
      opener: string;
      metadata: Record<string, unknown>;
      item: LegacySession;
    }>(`/api/v2/legacy/persons/${encodeURIComponent(personId)}/sessions`, {
      method: "POST",
      body: JSON.stringify({ priorSessionSummary }),
    }),

  listTurns: (personId: string, sessionId: string, limit = 100) =>
    request<{ items: LegacyTurn[] }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/sessions/${encodeURIComponent(sessionId)}/turns?limit=${limit}`
    ),

  sendTurn: (personId: string, sessionId: string, message: string) =>
    request<{
      reply: string;
      metadata: Record<string, unknown>;
      turn: LegacyTurn;
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/sessions/${encodeURIComponent(sessionId)}/turns`,
      { method: "POST", body: JSON.stringify({ message }) }
    ),

  wrapSession: (personId: string, sessionId: string) =>
    request<{
      sessionSummary: string;
      metadata: Record<string, unknown>;
      item: LegacySession;
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/sessions/${encodeURIComponent(sessionId)}/wrap`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  listMoments: (personId: string, limit = 25, cursor = "") =>
    request<{ items: Moment[]; nextCursor: string | null }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/moments?limit=${limit}&cursor=${encodeURIComponent(cursor)}`
    ),

  listEntities: (personId: string, limit = 25, kind = "", cursor = "") => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (kind) params.set("kind", kind);
    if (cursor) params.set("cursor", cursor);
    return request<{ items: LegacyEntity[]; nextCursor: string | null }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/entities?${params.toString()}`
    );
  },

  listThreads: (personId: string, limit = 25, cursor = "") =>
    request<{ items: Thread[]; nextCursor: string | null }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/threads?limit=${limit}&cursor=${encodeURIComponent(cursor)}`
    ),

  listTraits: (personId: string) =>
    request<{ items: Trait[] }>(
      `/api/v2/legacy/persons/${encodeURIComponent(personId)}/traits`
    ),

  listQuestions: (personId: string, status?: string) =>
    request<{ items: LegacyQuestion[] }>(
      `/api/v2/legacy/persons/${encodeURIComponent(personId)}/questions${
        status ? `?status=${encodeURIComponent(status)}` : ""
      }`
    ),

  listProfileFacts: (personId: string) =>
    request<{ items: ProfileFact[] }>(
      `/api/v2/legacy/persons/${encodeURIComponent(personId)}/profile-facts`
    ),

  listIdentityMerges: (personId: string) =>
    request<{ items: IdentityMerge[] }>(
      `/api/v2/legacy/persons/${encodeURIComponent(personId)}/identity-merges`
    ),

  listThemes: (personId: string) =>
    request<{ items: Theme[] }>(
      `/api/v2/legacy/persons/${encodeURIComponent(personId)}/themes`
    ),

  getMoment: (personId: string, momentId: string) =>
    request<{ item: Moment }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/moments/${encodeURIComponent(momentId)}`
    ),

  getEntity: (personId: string, entityId: string) =>
    request<{ item: LegacyEntity }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/entities/${encodeURIComponent(entityId)}`
    ),

  getThread: (personId: string, threadId: string) =>
    request<{ item: Thread }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/threads/${encodeURIComponent(threadId)}`
    ),

  getTheme: (personId: string, themeId: string) =>
    request<{ item: ThemeDetail }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/themes/${encodeURIComponent(themeId)}`
    ),

  listThemeMoments: (personId: string, themeId: string, limit = 20, cursor = "") =>
    request<{ items: ThemeMoment[]; nextCursor: string | null }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/themes/${encodeURIComponent(
        themeId
      )}/moments?limit=${limit}&cursor=${encodeURIComponent(cursor)}`
    ),

  unlockPrepareTheme: (personId: string, themeId: string) =>
    request<{
      theme_id: string;
      person_id: string;
      slug: string;
      display_name: string;
      kind: string;
      state: string;
      archetype_questions: Array<{
        question_id: string;
        text: string;
        options: Array<{ option_id: string; label: string }>;
        allow_skip: boolean;
        allow_free_text: boolean;
      }>;
      prompt_version: string;
      generated_this_call: boolean;
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/themes/${encodeURIComponent(themeId)}/unlock_prepare`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  upsertProfileFact: (
    personId: string,
    input: { factKey: string; answerText: string; questionText: string }
  ) =>
    request<{
      fact_id: string;
      person_id: string;
      fact_key: string;
      superseded_id: string | null;
      cap_reached: boolean;
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(personId)}/profile-facts`,
      { method: "POST", body: JSON.stringify(input) }
    ),

  scanIdentityMerges: (personId: string, limit = 20) =>
    request<{
      person_id: string;
      candidates_considered: number;
      verifier_calls: number;
      suggestions_created: number;
      suggestion_ids: string[];
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/identity-merges/scan`,
      { method: "POST", body: JSON.stringify({ limit }) }
    ),

  approveIdentityMerge: (personId: string, suggestionId: string) =>
    request<{
      suggestion_id: string;
      person_id: string;
      source_entity_id: string;
      target_entity_id: string;
      status: "approved";
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/identity-merges/${encodeURIComponent(suggestionId)}/approve`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  rejectIdentityMerge: (personId: string, suggestionId: string) =>
    request<{
      suggestion_id: string;
      person_id: string;
      source_entity_id: string;
      target_entity_id: string;
      status: "rejected";
    }>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/identity-merges/${encodeURIComponent(suggestionId)}/reject`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  editNode: (
    personId: string,
    nodeType: NodeType,
    nodeId: string,
    freeText: string
  ) =>
    request<EditNodeResult>(
      `/api/v2/legacy/persons/${encodeURIComponent(
        personId
      )}/nodes/${encodeURIComponent(nodeType)}/${encodeURIComponent(nodeId)}/edit`,
      { method: "POST", body: JSON.stringify({ freeText }) }
    ),
};

// ---------- User-facing v1 ----------

export type UserDetails = {
  user_id: string;
  email?: string;
  userName?: string;
  name?: string;
  date_of_birth?: string;
  gender?: string;
  ethnicity?: string;
  profile_setup_completed?: boolean;
  time_zone?: string;
  imageUrl?: string;
};

export const userApi = {
  getUser: (userId: string) =>
    request<{ message: string; data: UserDetails; shelby?: unknown }>(
      `/api/v1/users/${encodeURIComponent(userId)}`
    ),

  updateUser: (userId: string, patch: Partial<UserDetails> & { userId?: string }) =>
    request<{ message: string; data: UserDetails }>(
      `/api/v1/users/${encodeURIComponent(userId)}`,
      { method: "PUT", body: JSON.stringify({ userId, ...patch }) }
    ),

  uploadPortrait: (userId: string, image: File) => {
    const fd = new FormData();
    fd.append("image", image);
    return request<{ message: string; data: { imageUrl: string } }>(
      `/api/v1/users/${encodeURIComponent(userId)}/portrait`,
      { method: "POST", body: fd }
    );
  },
};

// ---------- Wallets v1 ----------

export type WalletDetails = {
  wallet_address?: string;
  [k: string]: unknown;
};

export const walletApi = {
  getWallet: (userId: string) =>
    request<{
      message: string;
      walletDetails: WalletDetails;
      shelby?: { shelby_available?: boolean };
      status: number;
    }>(`/api/v1/wallet/${encodeURIComponent(userId)}`),

  createEvmWallet: (userId: string) =>
    request<{ message: string; status: number; wallet: { address: string } }>(
      "/api/v1/wallet/create",
      { method: "POST", body: JSON.stringify({ userId }) }
    ),

  createSolanaWallet: (userId: string) =>
    request<{ message: string; status: number; wallet: { address: string } }>(
      "/api/v1/wallet/solana/create",
      { method: "POST", body: JSON.stringify({ userId }) }
    ),
};

// ---------- Activation codes v1 ----------

export type ActivationCodeInfo = {
  ok: boolean;
  code: string;
  activation_id: string;
  status: "AVAILABLE" | "USED" | string;
  is_active: boolean;
  source?: string;
  code_type?: string;
  campaign_id?: string;
  subject_user_id?: string;
};

// ---------- Trending v1 ----------

export type TrendingItem = {
  id: string;
  name: string;
  imageUrl?: string;
  [k: string]: unknown;
};

export const trendingApi = {
  flashbacks: () =>
    request<{ success: boolean; data: TrendingItem[] }>(
      "/api/v1/trending-flashbacks"
    ),
  people: () =>
    request<{ success: boolean; data: TrendingItem[] }>(
      "/api/v1/trending-people"
    ),
};

// ---------- Metrics + Rewards ----------

export type LoginStreak = {
  user_id: string;
  currentStreak: number;
  lastOpenDate?: string;
  streakStartUtc: string;
};

export type UserMetrics = {
  user_id: string;
  xp: number;
  credits: number;
};

export type RewardsTx = {
  txId: string;
  actionType: string;
  reward?: { xp?: number; credits?: number } | null;
  meta?: Record<string, unknown>;
  claimed: boolean;
  createdAt?: string;
};

export const metricsApi = {
  upsertLoginStreak: (userId: string, timezone = "UTC") =>
    request<LoginStreak>("/api/metrics/login-streak", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, timezone }),
    }),

  getLoginStreak: (userId: string) =>
    request<LoginStreak>(`/api/metrics/login-streak/${encodeURIComponent(userId)}`),

  getMetrics: (userId: string) =>
    request<UserMetrics>(`/api/metrics/${encodeURIComponent(userId)}`),

  updateMetrics: (
    userId: string,
    delta: { xpDelta?: number; creditsDelta?: number }
  ) =>
    request<{ ok: boolean; name: string }>("/api/metrics", {
      method: "PATCH",
      body: JSON.stringify({ user_id: userId, ...delta }),
    }),
};

export const rewardsApi = {
  createTx: (input: {
    actionType: string;
    reward: { xp?: number; credits?: number };
    meta?: Record<string, unknown>;
  }) =>
    request<RewardsTx>("/api/rewards/tx", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listTx: async (userId: string, claimed?: boolean) => {
    const q =
      claimed === undefined
        ? ""
        : `?claimed=${claimed ? "true" : "false"}`;
    // Spec says this returns an array, but in practice the server has been
    // observed returning `{ data: [...] }`, `null`, or an empty object on edge
    // cases. Coerce to RewardsTx[] so callers can always .map() safely.
    const raw = await request<unknown>(
      `/api/rewards/tx/${encodeURIComponent(userId)}${q}`
    );
    if (Array.isArray(raw)) return raw as RewardsTx[];
    if (raw && typeof raw === "object") {
      const obj = raw as { data?: unknown; items?: unknown };
      if (Array.isArray(obj.data)) return obj.data as RewardsTx[];
      if (Array.isArray(obj.items)) return obj.items as RewardsTx[];
    }
    return [] as RewardsTx[];
  },

  claim: (userId: string, txId: string) =>
    request<{ txId: string; claimed: boolean }>(
      `/api/rewards/tx/${encodeURIComponent(userId)}/claim`,
      { method: "POST", body: JSON.stringify({ txId }) }
    ),
};

// ---------- Secure Files ----------

export type SecureFileUpload = {
  fileId: string;
  bucketName: string;
  objectName: string;
};

export const filesApi = {
  oasisEncryptUpload: (input: {
    wallet_key: string;
    filename: string;
    file_b64: string;
    metadata?: Record<string, unknown>;
  }) =>
    request<{ ok: boolean; result: { fileId: string; filename: string } }>(
      "/api/v1/oasis/encrypt-upload",
      { method: "POST", body: JSON.stringify(input) }
    ),

  oasisDecryptDownload: (wallet_key: string, fileId: string) =>
    request<{
      ok: boolean;
      result: { filename: string; plaintextB64: string };
    }>("/api/v1/oasis/decrypt-download", {
      method: "POST",
      body: JSON.stringify({ wallet_key, fileId }),
    }),

  uploadSecureFile: (
    userId: string,
    walletKey: string,
    file: File,
    metadata: Record<string, unknown> = {}
  ) => {
    const fd = new FormData();
    fd.append("userId", userId);
    fd.append("wallet_key", walletKey);
    fd.append("metadata", JSON.stringify(metadata));
    fd.append("file", file);
    return request<{ ok: boolean; data: SecureFileUpload }>(
      "/api/v1/file/upload",
      { method: "POST", body: fd }
    );
  },

  downloadSecureFile: (input: {
    userId: string;
    filename: string;
    fileId: string;
    bucketName: string;
    objectName: string;
  }) =>
    request<{ ok: boolean; data: { fileId: string; plaintextB64: string } }>(
      "/api/v1/file/download",
      { method: "POST", body: JSON.stringify(input) }
    ),
};

// ---------- Shelby blobs ----------

export type ShelbyBlob = {
  object_id: string;
  shelby_url: string;
  [k: string]: unknown;
};

export const shelbyApi = {
  listBlobs: (userId: string) =>
    request<{
      ok: boolean;
      userId: string;
      shelby_available: boolean;
      count: number;
      blobs: ShelbyBlob[];
    }>(`/api/v1/shelby/blobs/${encodeURIComponent(userId)}`),

  getBlobUrl: (objectId: string) =>
    request<{
      ok: boolean;
      object_id: string;
      shelby_uri: string;
      shelby_url: string;
      status: string;
    }>(`/api/v1/shelby/blob/${encodeURIComponent(objectId)}/url`),
};

export const activationApi = {
  verify: (code: string) =>
    request<ActivationCodeInfo>("/api/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  redeem: (code: string, userId: string) =>
    request<ActivationCodeInfo>("/api/redeem", {
      method: "POST",
      body: JSON.stringify({ code, user_id: userId }),
    }),
};
