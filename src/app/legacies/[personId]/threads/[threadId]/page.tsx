"use client";

import { use, useCallback, useEffect, useState } from "react";
import { AppHeader } from "../../../../components/AppHeader";
import { EditNodePanel } from "../../../../components/EditNodePanel";
import {
  Card,
  ErrorBanner,
  PageShell,
  Spinner,
} from "../../../../components/ui";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { legacyApi, type Thread } from "../../../../lib/api";

export default function ThreadDetailPage({
  params,
}: {
  params: Promise<{ personId: string; threadId: string }>;
}) {
  const { personId, threadId } = use(params);
  const auth = useRequireAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    legacyApi
      .getThread(personId, threadId)
      .then((res) => setThread(res.item))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load thread.")
      );
  }, [personId, threadId]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    load();
  }, [auth.status, load]);

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
      <AppHeader
        back={`/legacies/${encodeURIComponent(personId)}`}
        title="Thread"
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {!thread ? (
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <Spinner /> Loading thread…
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <h1 className="text-lg font-semibold text-primary">{thread.title}</h1>
            {thread.summary && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-primary">
                {thread.summary}
              </p>
            )}
          </Card>

          <EditNodePanel
            personId={personId}
            nodeType="thread"
            nodeId={threadId}
            onApplied={load}
          />
        </div>
      )}
    </PageShell>
  );
}
