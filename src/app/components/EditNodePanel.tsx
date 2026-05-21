"use client";

import { useState } from "react";
import { Button, Card, ErrorBanner, Spinner, Textarea } from "./ui";
import { legacyApi, type NodeType } from "../lib/api";

export function EditNodePanel({
  personId,
  nodeType,
  nodeId,
  onApplied,
}: {
  personId: string;
  nodeType: NodeType;
  nodeId: string;
  onApplied?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) {
      setError("Add some text first.");
      return;
    }
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const res = await legacyApi.editNode(personId, nodeType, nodeId, text.trim());
      setResult(
        `Saved. ${res.edges_added} edge(s) added, ${res.edges_removed} removed, ${res.new_entity_ids.length} new entit${res.new_entity_ids.length === 1 ? "y" : "ies"}.`
      );
      setText("");
      onApplied?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">Edit this {nodeType}</p>
        <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : "Show editor"}
        </Button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-secondary">
            Write a correction, addition, or clarification in plain English. The
            system will apply it and re-link related nodes.
          </p>
          <Textarea
            rows={3}
            placeholder="e.g. correct relationship: friend, not brother"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <ErrorBanner>{error}</ErrorBanner>}
          {result && (
            <p className="text-xs text-emerald-300/80">{result}</p>
          )}
          <div className="flex justify-end">
            <Button onClick={() => void submit()} disabled={saving}>
              {saving && <Spinner />}
              {saving ? "Applying…" : "Apply edit"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
