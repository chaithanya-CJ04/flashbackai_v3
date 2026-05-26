"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  activationApi,
  ApiError,
  legacyApi,
  metricsApi,
  rewardsApi,
  shelbyApi,
  trendingApi,
  userApi,
  walletApi,
  type ArchetypeQuestion,
  type IdentityMerge,
  type Legacy,
  type LegacyEntity,
  type LegacyHeader,
  type LegacyQuestion,
  type LegacySession,
  type LegacyTurn,
  type Moment,
  type NodeType,
  type ProfileFact,
  type Theme,
  type ThemeDetail,
  type ThemeMoment,
  type Thread,
  type Trait,
} from "./api";

// ---------- Query keys (centralised so invalidation is consistent) ----------

export const qk = {
  legacies: ["legacies"] as const,
  legacy: (personId: string) => ["legacy", personId] as const,
  sessions: (personId: string) => ["legacy", personId, "sessions"] as const,
  turns: (personId: string, sessionId: string) =>
    ["legacy", personId, "sessions", sessionId, "turns"] as const,
  archetype: (personId: string) =>
    ["legacy", personId, "archetype-questions"] as const,
  moments: (personId: string) => ["legacy", personId, "moments"] as const,
  moment: (personId: string, momentId: string) =>
    ["legacy", personId, "moments", momentId] as const,
  entities: (personId: string, kind: string) =>
    ["legacy", personId, "entities", kind] as const,
  entity: (personId: string, entityId: string) =>
    ["legacy", personId, "entities", entityId] as const,
  threads: (personId: string) => ["legacy", personId, "threads"] as const,
  thread: (personId: string, threadId: string) =>
    ["legacy", personId, "threads", threadId] as const,
  themes: (personId: string) => ["legacy", personId, "themes"] as const,
  theme: (personId: string, themeId: string) =>
    ["legacy", personId, "themes", themeId] as const,
  themeMoments: (personId: string, themeId: string) =>
    ["legacy", personId, "themes", themeId, "moments"] as const,
  traits: (personId: string) => ["legacy", personId, "traits"] as const,
  questions: (personId: string) => ["legacy", personId, "questions"] as const,
  facts: (personId: string) => ["legacy", personId, "facts"] as const,
  merges: (personId: string) => ["legacy", personId, "merges"] as const,

  user: (userId: string) => ["user", userId] as const,
  wallet: (userId: string) => ["wallet", userId] as const,
  metrics: (userId: string) => ["metrics", userId] as const,
  streak: (userId: string) => ["streak", userId] as const,
  rewardsTx: (userId: string, claimed?: boolean) =>
    ["rewards", userId, claimed ?? null] as const,

  trendingFlashbacks: ["trending", "flashbacks"] as const,
  trendingPeople: ["trending", "people"] as const,
  shelbyBlobs: (userId: string) => ["shelby", userId] as const,
};

// ---------- Tunables ----------

const FRESH_MINUTES = 1000 * 60 * 2; // most reads stay fresh 2 minutes
const LIVE_MINUTES = 1000 * 30; // chat/turns is more dynamic

// ---------- Legacy reads ----------

export function useLegacies(opts?: UseQueryOptions<{ legacies: Legacy[] }>) {
  return useQuery({
    queryKey: qk.legacies,
    queryFn: () => legacyApi.listMyLegacies(),
    staleTime: FRESH_MINUTES,
    ...(opts ?? {}),
  });
}

export function useLegacyHeader(personId: string) {
  return useQuery({
    queryKey: qk.legacy(personId),
    queryFn: () => legacyApi.getLegacyHeader(personId).then((r) => r.item),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useLegacySessions(personId: string, limit = 25) {
  return useQuery({
    queryKey: qk.sessions(personId),
    queryFn: () =>
      legacyApi.listSessions(personId, limit).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useLegacyTurns(personId: string, sessionId: string) {
  return useQuery({
    queryKey: qk.turns(personId, sessionId),
    queryFn: () =>
      legacyApi.listTurns(personId, sessionId).then((r) => r.items),
    staleTime: LIVE_MINUTES,
    enabled: !!personId && !!sessionId,
  });
}

export function useMoments(personId: string) {
  return useQuery({
    queryKey: qk.moments(personId),
    queryFn: () => legacyApi.listMoments(personId).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useMoment(personId: string, momentId: string) {
  return useQuery({
    queryKey: qk.moment(personId, momentId),
    queryFn: () => legacyApi.getMoment(personId, momentId).then((r) => r.item),
    staleTime: FRESH_MINUTES,
    enabled: !!personId && !!momentId,
  });
}

export function useEntities(personId: string, kind = "") {
  return useQuery({
    queryKey: qk.entities(personId, kind),
    queryFn: () =>
      legacyApi.listEntities(personId, 25, kind).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useEntity(personId: string, entityId: string) {
  return useQuery({
    queryKey: qk.entity(personId, entityId),
    queryFn: () =>
      legacyApi.getEntity(personId, entityId).then((r) => r.item),
    staleTime: FRESH_MINUTES,
    enabled: !!personId && !!entityId,
  });
}

export function useThreads(personId: string) {
  return useQuery({
    queryKey: qk.threads(personId),
    queryFn: () => legacyApi.listThreads(personId).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useThread(personId: string, threadId: string) {
  return useQuery({
    queryKey: qk.thread(personId, threadId),
    queryFn: () =>
      legacyApi.getThread(personId, threadId).then((r) => r.item),
    staleTime: FRESH_MINUTES,
    enabled: !!personId && !!threadId,
  });
}

export function useThemes(personId: string) {
  return useQuery({
    queryKey: qk.themes(personId),
    queryFn: () => legacyApi.listThemes(personId).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useTheme(personId: string, themeId: string) {
  return useQuery({
    queryKey: qk.theme(personId, themeId),
    queryFn: () => legacyApi.getTheme(personId, themeId).then((r) => r.item),
    staleTime: FRESH_MINUTES,
    enabled: !!personId && !!themeId,
  });
}

export function useThemeMoments(personId: string, themeId: string) {
  return useQuery({
    queryKey: qk.themeMoments(personId, themeId),
    queryFn: () =>
      legacyApi.listThemeMoments(personId, themeId).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId && !!themeId,
  });
}

export function useTraits(personId: string) {
  return useQuery({
    queryKey: qk.traits(personId),
    queryFn: () => legacyApi.listTraits(personId).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useLegacyQuestions(personId: string) {
  return useQuery({
    queryKey: qk.questions(personId),
    queryFn: () => legacyApi.listQuestions(personId).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useProfileFacts(personId: string) {
  return useQuery({
    queryKey: qk.facts(personId),
    queryFn: () => legacyApi.listProfileFacts(personId).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useIdentityMerges(personId: string) {
  return useQuery({
    queryKey: qk.merges(personId),
    queryFn: () => legacyApi.listIdentityMerges(personId).then((r) => r.items),
    staleTime: FRESH_MINUTES,
    enabled: !!personId,
  });
}

export function useArchetypeQuestions(personId: string, enabled = true) {
  return useQuery({
    queryKey: qk.archetype(personId),
    queryFn: () =>
      legacyApi.getArchetypeQuestions(personId).then((r) => r.questions),
    staleTime: Infinity,
    enabled: !!personId && enabled,
  });
}

// ---------- Legacy mutations ----------

export function useStartSession(personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => legacyApi.startSession(personId, ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.sessions(personId) });
    },
  });
}

/* Open (or start) a conversation with a particular person, optionally
   seeding the composer with a question. Centralised so the workshop's
   Questions tab and the home page's question rail share the same logic:
   reuse the live "open" session if one exists, otherwise mint a new one.
   The `pendingPersonId` value lets the caller put a spinner on the row
   the user actually tapped, even when multiple are on screen. */
export function useOpenConversationFor() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pendingPersonId, setPendingPersonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (personId: string, prompt?: string) => {
      setError(null);
      setPendingPersonId(personId);
      try {
        let sessions = qc.getQueryData<LegacySession[]>(qk.sessions(personId));
        if (!sessions) {
          const r = await legacyApi.listSessions(personId, 25);
          sessions = r.items;
          qc.setQueryData(qk.sessions(personId), sessions);
        }
        // Pick the freshest open session — backend can leave several
        // "open" sessions lying around when previous attempts orphaned
        // without a turn. We sort by lastTurnAt (or openedAt fallback)
        // descending and prefer the most recently touched.
        const openSessions = (sessions ?? [])
          .filter((s) => s.status === "open")
          .sort((a, b) => {
            const at = new Date(a.lastTurnAt ?? a.openedAt).getTime();
            const bt = new Date(b.lastTurnAt ?? b.openedAt).getTime();
            return bt - at;
          });
        // A session with zero turns that was opened more than a day ago
        // is almost certainly a ghost the backend will refuse turns on
        // (we've seen 6-day-old empty "open" sessions return 409). Skip
        // it and mint a fresh one rather than handing the user a dead
        // conversation.
        const GHOST_AFTER_MS = 24 * 60 * 60 * 1000;
        const usable = openSessions.find((s) => {
          if (s.turnCount > 0) return true;
          const age = Date.now() - new Date(s.openedAt).getTime();
          return age < GHOST_AFTER_MS;
        });
        let sid: string;
        if (usable) {
          sid = usable.sessionId;
        } else {
          const res = await legacyApi.startSession(personId, "");
          await qc.invalidateQueries({ queryKey: qk.sessions(personId) });
          sid = res.sessionId;
        }
        const trimmed = prompt?.trim();
        const qs = trimmed ? `?prompt=${encodeURIComponent(trimmed)}` : "";
        router.push(
          `/legacies/${encodeURIComponent(personId)}/sessions/${encodeURIComponent(sid)}${qs}`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not open the conversation.");
        setPendingPersonId(null);
      }
    },
    [router, qc]
  );

  return { open, pendingPersonId, error, clearError: () => setError(null) };
}

export function useSendTurn(personId: string, sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      legacyApi.sendTurn(personId, sessionId, message),
    onSuccess: (data) => {
      qc.setQueryData<LegacyTurn[]>(qk.turns(personId, sessionId), (prev) =>
        prev ? [...prev, data.turn] : [data.turn]
      );
    },
    onError: (err) => {
      // 409 means the server's view of the session disagrees with ours —
      // typically it's been wrapped/locked while our cached list still
      // says "open". Refetch sessions so the composer unmounts and the
      // user stops mash-clicking Send against a closed session.
      const status =
        err instanceof ApiError ? err.status : undefined;
      if (status === 409 || status === 410 || status === 423) {
        void qc.invalidateQueries({ queryKey: qk.sessions(personId) });
        void qc.invalidateQueries({
          queryKey: qk.turns(personId, sessionId),
        });
      }
    },
  });
}

export function useWrapSession(personId: string, sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        return await legacyApi.wrapSession(personId, sessionId);
      } catch (err) {
        // 409 means the session was already wrapped server-side — likely a
        // stale client cache or a parallel wrap. Treat as a no-op success:
        // refresh the sessions list so the UI reflects the actual state.
        if (err instanceof ApiError && err.status === 409) {
          await qc.invalidateQueries({ queryKey: qk.sessions(personId) });
          return null;
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      if (!data) return;
      qc.setQueryData<LegacySession[]>(qk.sessions(personId), (prev) =>
        prev
          ? prev.map((s) => (s.sessionId === sessionId ? data.item : s))
          : prev
      );
    },
  });
}

export function useCreateLegacy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof legacyApi.createLegacy>[0]) =>
      legacyApi.createLegacy(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.legacies });
    },
  });
}

export function useUploadOnboardingPhoto() {
  return useMutation({
    mutationFn: (file: File) => legacyApi.uploadOnboardingPhoto(file),
  });
}

export function useSubmitArchetypeAnswers(personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof legacyApi.submitArchetypeAnswers>[1]) =>
      legacyApi.submitArchetypeAnswers(personId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.sessions(personId) });
      qc.invalidateQueries({ queryKey: qk.legacy(personId) });
      qc.invalidateQueries({ queryKey: qk.legacies });
    },
  });
}

export function useUpsertProfileFact(personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof legacyApi.upsertProfileFact>[1]) =>
      legacyApi.upsertProfileFact(personId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.facts(personId) });
      qc.invalidateQueries({ queryKey: qk.legacy(personId) });
    },
  });
}

export function useEditNode(personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      nodeType,
      nodeId,
      freeText,
    }: {
      nodeType: NodeType;
      nodeId: string;
      freeText: string;
    }) => legacyApi.editNode(personId, nodeType, nodeId, freeText),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.legacy(personId) });
      if (vars.nodeType === "moment") {
        qc.invalidateQueries({ queryKey: qk.moments(personId) });
        qc.invalidateQueries({ queryKey: qk.moment(personId, vars.nodeId) });
      }
      if (vars.nodeType === "entity") {
        qc.invalidateQueries({
          queryKey: ["legacy", personId, "entities"],
          exact: false,
        });
      }
      if (vars.nodeType === "thread") {
        qc.invalidateQueries({ queryKey: qk.threads(personId) });
        qc.invalidateQueries({ queryKey: qk.thread(personId, vars.nodeId) });
      }
    },
  });
}

export function useScanIdentityMerges(personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => legacyApi.scanIdentityMerges(personId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.merges(personId) });
    },
  });
}

export function useApproveMerge(personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) =>
      legacyApi.approveIdentityMerge(personId, suggestionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.merges(personId) });
      qc.invalidateQueries({
        queryKey: ["legacy", personId, "entities"],
        exact: false,
      });
    },
  });
}

export function useRejectMerge(personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) =>
      legacyApi.rejectIdentityMerge(personId, suggestionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.merges(personId) });
    },
  });
}

export function useUnlockPrepareTheme(personId: string, themeId: string) {
  return useMutation({
    mutationFn: () => legacyApi.unlockPrepareTheme(personId, themeId),
  });
}

// ---------- User / wallet / metrics / rewards ----------

export function useUser(userId: string | null) {
  return useQuery({
    queryKey: qk.user(userId ?? "anon"),
    queryFn: () =>
      userApi.getUser(userId!).then((r) => r.data),
    staleTime: FRESH_MINUTES,
    enabled: !!userId,
  });
}

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof userApi.updateUser>[1]) =>
      userApi.updateUser(userId, patch),
    onSuccess: (data) => {
      qc.setQueryData(qk.user(userId), data.data);
    },
  });
}

export function useUploadPortrait(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => userApi.uploadPortrait(userId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.user(userId) });
    },
  });
}

export function useWallet(userId: string | null) {
  return useQuery({
    queryKey: qk.wallet(userId ?? "anon"),
    queryFn: () => walletApi.getWallet(userId!),
    staleTime: FRESH_MINUTES,
    enabled: !!userId,
    retry: (failureCount, error) => {
      if (
        typeof error === "object" &&
        error &&
        "status" in error &&
        (error as { status?: number }).status === 404
      )
        return false;
      return failureCount < 2;
    },
  });
}

export function useCreateWallet(userId: string, kind: "evm" | "solana") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      kind === "evm"
        ? walletApi.createEvmWallet(userId)
        : walletApi.createSolanaWallet(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.wallet(userId) });
    },
  });
}

export function useMetrics(userId: string | null) {
  return useQuery({
    queryKey: qk.metrics(userId ?? "anon"),
    queryFn: () => metricsApi.getMetrics(userId!),
    staleTime: FRESH_MINUTES,
    enabled: !!userId,
  });
}

export function useStreak(userId: string | null) {
  return useQuery({
    queryKey: qk.streak(userId ?? "anon"),
    queryFn: () => metricsApi.getLoginStreak(userId!),
    staleTime: FRESH_MINUTES,
    enabled: !!userId,
  });
}

export function useUpsertStreak(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (timezone: string) =>
      metricsApi.upsertLoginStreak(userId, timezone),
    onSuccess: (data) => {
      qc.setQueryData(qk.streak(userId), data);
    },
  });
}

export function useRewardsTx(userId: string | null, claimed?: boolean) {
  return useQuery({
    queryKey: qk.rewardsTx(userId ?? "anon", claimed),
    queryFn: () => rewardsApi.listTx(userId!, claimed),
    staleTime: FRESH_MINUTES,
    enabled: !!userId,
  });
}

export function useClaimReward(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txId: string) => rewardsApi.claim(userId, txId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["rewards", userId],
        exact: false,
      });
      qc.invalidateQueries({ queryKey: qk.metrics(userId) });
    },
  });
}

// ---------- Trending ----------

export function useTrendingFlashbacks() {
  return useQuery({
    queryKey: qk.trendingFlashbacks,
    queryFn: () => trendingApi.flashbacks().then((r) => r.data),
    staleTime: FRESH_MINUTES,
  });
}

export function useTrendingPeople() {
  return useQuery({
    queryKey: qk.trendingPeople,
    queryFn: () => trendingApi.people().then((r) => r.data),
    staleTime: FRESH_MINUTES,
  });
}

// ---------- Shelby ----------

export function useShelbyBlobs(userId: string | null) {
  return useQuery({
    queryKey: qk.shelbyBlobs(userId ?? "anon"),
    queryFn: () => shelbyApi.listBlobs(userId!),
    staleTime: FRESH_MINUTES,
    enabled: !!userId,
  });
}

export function useShelbyBlobUrl() {
  return useMutation({
    mutationFn: (objectId: string) => shelbyApi.getBlobUrl(objectId),
  });
}

// ---------- Activation ----------

export function useVerifyActivation() {
  return useMutation({
    mutationFn: (code: string) => activationApi.verify(code),
  });
}

export function useRedeemActivation(userId: string) {
  return useMutation({
    mutationFn: (code: string) => activationApi.redeem(code, userId),
  });
}

// ---------- Type re-exports to silence "imported and unused" warnings ----------
export type {
  ArchetypeQuestion,
  IdentityMerge,
  Legacy,
  LegacyEntity,
  LegacyHeader,
  LegacyQuestion,
  LegacySession,
  LegacyTurn,
  Moment,
  ProfileFact,
  Theme,
  ThemeDetail,
  ThemeMoment,
  Thread,
  Trait,
};
