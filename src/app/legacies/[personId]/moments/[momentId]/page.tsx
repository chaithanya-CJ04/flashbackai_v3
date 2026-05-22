"use client";

import { use, useCallback, useEffect, useState } from "react";
import { AppHeader } from "../../../../components/AppHeader";
import { EditNodePanel } from "../../../../components/EditNodePanel";
import { AuthedVideo } from "../../../../components/VideoLightbox";
import {
  Card,
  ErrorBanner,
  PageLoader,
  PageShell,
  Spinner,
} from "../../../../components/ui";
import { useRequireAuth } from "../../../../hooks/useRequireAuth";
import { legacyApi, type Moment } from "../../../../lib/api";

export default function MomentDetailPage({
  params,
}: {
  params: Promise<{ personId: string; momentId: string }>;
}) {
  const { personId, momentId } = use(params);
  const auth = useRequireAuth();
  const [moment, setMoment] = useState<Moment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    legacyApi
      .getMoment(personId, momentId)
      .then((res) => setMoment(res.item))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load moment.")
      );
  }, [personId, momentId]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    load();
  }, [auth.status, load]);

  if (auth.status !== "authenticated") {
    return (
      <PageShell>
        <PageLoader label="Opening moment" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AppHeader
        back={`/legacies/${encodeURIComponent(personId)}`}
        title="Moment"
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {!moment ? (
        <PageLoader label="Loading moment" />
      ) : (
        <div className="space-y-4">
          {moment.videoUrl &&
            (/^https?:\/\//i.test(moment.videoUrl) ||
              moment.videoUrl.startsWith("/")) && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
                <AuthedVideo
                  src={moment.videoUrl}
                  poster={moment.thumbnailUrl}
                />
              </div>
            )}

          <Card className="p-5">
            {moment.title && (
              <h1 className="text-lg font-semibold text-primary">{moment.title}</h1>
            )}
            <p className="mt-1 text-caption text-tertiary">
              Created {new Date(moment.createdAt).toLocaleString()}
            </p>
            {moment.timeAnchor && (
              <p className="mt-1 text-xs text-secondary">
                When: {moment.timeAnchor}
              </p>
            )}
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-primary">
              {moment.narrative}
            </p>
          </Card>

          <EditNodePanel
            personId={personId}
            nodeType="moment"
            nodeId={momentId}
            onApplied={load}
          />
        </div>
      )}
    </PageShell>
  );
}
