"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  PageShell,
  ScreenIntro,
  Spinner,
} from "../../components/ui";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { filesApi, shelbyApi, type ShelbyBlob } from "../../lib/api";

type TabId = "blobs" | "encrypt";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "blobs", label: "Shelby blobs" },
  { id: "encrypt", label: "Oasis encrypt" },
];

export default function VaultPage() {
  const auth = useRequireAuth();
  const userId = auth.status === "authenticated" ? auth.userId : null;
  const [tab, setTab] = useState<TabId>("blobs");

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
      <AppHeader back="/account" title="Vault" />
      <ScreenIntro
        module="Vault"
        meta="encrypted · shelby"
        title={{ top: "ENCRYPTED", accent: "ARCHIVE." }}
        subtitle="Files and blobs stored encrypted, accessible only with your wallet key."
      />

      <div className="mb-4 flex gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-xs transition ${
              tab === t.id
                ? "border-violet-400 text-white"
                : "border-transparent text-secondary hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "blobs" && userId && <BlobsTab userId={userId} />}
      {tab === "encrypt" && <EncryptTab />}
    </PageShell>
  );
}

function BlobsTab({ userId }: { userId: string }) {
  const [blobs, setBlobs] = useState<ShelbyBlob[] | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setError(null);
    shelbyApi
      .listBlobs(userId)
      .then((res) => {
        setBlobs(res.blobs);
        setAvailable(res.shelby_available);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to list blobs.")
      );
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const fetchUrl = async (objectId: string) => {
    setRefreshingId(objectId);
    try {
      const res = await shelbyApi.getBlobUrl(objectId);
      setResolvedUrls((prev) => ({ ...prev, [objectId]: res.shelby_url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get URL.");
    } finally {
      setRefreshingId(null);
    }
  };

  if (error) return <ErrorBanner>{error}</ErrorBanner>;
  if (!blobs) {
    return (
      <div className="flex items-center gap-2 text-xs text-tertiary">
        <Spinner /> Loading blobs…
      </div>
    );
  }

  if (available === false) {
    return (
      <EmptyState
        title="Shelby is unavailable for this account"
        hint="Encrypted blob storage isn't enabled for your wallet yet."
      />
    );
  }
  if (blobs.length === 0) {
    return (
      <EmptyState
        title="No blobs stored"
        hint="Encrypted blobs uploaded to Shelby appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {blobs.map((b) => {
        const fresh = resolvedUrls[b.object_id] || b.shelby_url;
        return (
          <Card key={b.object_id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-secondary">
                  {b.object_id}
                </p>
                {fresh && (
                  <a
                    href={fresh}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block truncate text-[11px] text-violet-300 hover:underline"
                  >
                    {fresh}
                  </a>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={() => void fetchUrl(b.object_id)}
                disabled={refreshingId === b.object_id}
              >
                {refreshingId === b.object_id && <Spinner />}
                Refresh URL
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function EncryptTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [walletKey, setWalletKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<{ fileId: string; filename: string } | null>(
    null
  );

  // Decrypt panel
  const [decryptFileId, setDecryptFileId] = useState("");
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<{ filename: string; preview: string } | null>(
    null
  );

  const upload = async () => {
    if (!file) {
      setError("Pick a file first.");
      return;
    }
    if (!walletKey.trim()) {
      setError("Enter your wallet key.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const b64 = await fileToBase64(file);
      const res = await filesApi.oasisEncryptUpload({
        wallet_key: walletKey.trim(),
        filename: file.name,
        file_b64: b64,
        metadata: {},
      });
      setLastUpload(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Encrypt-upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const decrypt = async () => {
    if (!decryptFileId.trim() || !walletKey.trim()) {
      setDecryptError("File ID and wallet key are required.");
      return;
    }
    setDecrypting(true);
    setDecryptError(null);
    try {
      const res = await filesApi.oasisDecryptDownload(
        walletKey.trim(),
        decryptFileId.trim()
      );
      const previewBytes = atob(res.result.plaintextB64).slice(0, 200);
      setDecrypted({ filename: res.result.filename, preview: previewBytes });
    } catch (e) {
      setDecryptError(e instanceof Error ? e.message : "Decrypt failed.");
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold text-primary">Encrypt & upload</p>
        <p className="text-xs text-secondary">
          Stored encrypted on Oasis. You&apos;ll need the same wallet key to
          decrypt later.
        </p>

        <div>
          <label className="text-caption text-secondary">Wallet key</label>
          <Input
            className="mt-1"
            type="password"
            value={walletKey}
            onChange={(e) => setWalletKey(e.target.value)}
            placeholder="Your wallet encryption key"
          />
        </div>

        <div>
          <label className="text-caption text-secondary">File</label>
          <div className="mt-1 flex items-center gap-2">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="truncate text-xs text-secondary">
              {file?.name ?? "No file chosen"}
            </span>
          </div>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {lastUpload && (
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200/85">
            Uploaded <span className="font-mono">{lastUpload.filename}</span>{" "}
            with ID{" "}
            <span className="font-mono">{lastUpload.fileId}</span>
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={() => void upload()} disabled={uploading}>
            {uploading && <Spinner />}
            {uploading ? "Encrypting…" : "Encrypt & upload"}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold text-primary">Decrypt & preview</p>
        <p className="text-xs text-secondary">
          Paste a file ID returned from a previous encrypt to retrieve it.
        </p>

        <div>
          <label className="text-caption text-secondary">File ID</label>
          <Input
            className="mt-1 font-mono"
            value={decryptFileId}
            onChange={(e) => setDecryptFileId(e.target.value)}
            placeholder="fileId"
          />
        </div>

        {decryptError && <ErrorBanner>{decryptError}</ErrorBanner>}

        {decrypted && (
          <div className="space-y-1 rounded-xl border border-white/10 bg-white/3 p-3">
            <p className="text-caption text-tertiary">
              {decrypted.filename}
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word text-[11px] text-secondary">
              {decrypted.preview}
            </pre>
            <p className="text-meta text-tertiary">
              (first 200 bytes of plaintext shown)
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => void decrypt()} disabled={decrypting}>
            {decrypting && <Spinner />}
            {decrypting ? "Decrypting…" : "Decrypt"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected reader result"));
        return;
      }
      // data:<mime>;base64,<payload>
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}
