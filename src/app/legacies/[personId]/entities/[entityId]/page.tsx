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
import { legacyApi, type LegacyEntity } from "../../../../lib/api";

export default function EntityDetailPage({
  params,
}: {
  params: Promise<{ personId: string; entityId: string }>;
}) {
  const { personId, entityId } = use(params);
  const auth = useRequireAuth();
  const [entity, setEntity] = useState<LegacyEntity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    legacyApi
      .getEntity(personId, entityId)
      .then((res) => setEntity(res.item))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load entity.")
      );
  }, [personId, entityId]);

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
        title="Entity"
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {!entity ? (
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <Spinner /> Loading entity…
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-lg font-semibold text-primary">
                {entity.name}
              </h1>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-secondary">
                {entity.kind}
              </span>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-primary">
              {entity.description}
            </p>

            {entity.aliases?.length > 0 && (
              <div className="mt-4">
                <p className="text-caption uppercase tracking-wider text-tertiary">
                  Also known as
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {entity.aliases.join(", ")}
                </p>
              </div>
            )}

            {entity.attributes &&
              Object.keys(entity.attributes).length > 0 && (
                <div className="mt-4">
                  <p className="text-caption uppercase tracking-wider text-tertiary">
                    Attributes
                  </p>
                  <dl className="mt-1 space-y-1">
                    {Object.entries(entity.attributes).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <dt className="text-tertiary">{k}:</dt>
                        <dd className="text-secondary">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

            <p className="mt-4 text-caption text-tertiary">
              Updated {new Date(entity.updatedAt).toLocaleString()}
            </p>
          </Card>

          <EditNodePanel
            personId={personId}
            nodeType="entity"
            nodeId={entityId}
            onApplied={load}
          />
        </div>
      )}
    </PageShell>
  );
}
