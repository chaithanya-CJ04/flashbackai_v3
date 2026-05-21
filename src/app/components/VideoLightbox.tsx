"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "../hooks/useAuth";

/** Decide whether a URL belongs to our app/backend (so we should attach the
 *  Bearer token) or a third-party CDN/S3 (where the URL is either public or
 *  carries its own signature in query params — and where adding our Bearer
 *  header would cause the third party to reject the request). */
function isOurOriginUrl(url: string): boolean {
  if (url.startsWith("/")) return true; // relative path → our app
  try {
    const parsed = new URL(url);
    const apiBaseRaw =
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "";
    if (apiBaseRaw) {
      try {
        const api = new URL(apiBaseRaw);
        if (parsed.hostname === api.hostname) return true;
      } catch {}
    }
    if (
      typeof window !== "undefined" &&
      parsed.hostname === window.location.hostname
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Fetch a video URL with our auth token and expose it as a Blob URL so the
 *  native <video> element can play it. Only used for OUR-origin URLs (our
 *  API routes that require Bearer auth). Third-party URLs (S3, CDN, presigned)
 *  should bypass this and be passed straight to `<video src>` for streaming. */
function useAuthedVideo(url: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      setError(null);
      return;
    }
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      setError("Video URL is not in a streamable format.");
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    (async () => {
      try {
        const res = await fetchWithAuth(url);
        if (!res.ok) {
          throw new Error(`Could not fetch video (${res.status}).`);
        }
        const blob = await res.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load video.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url]);

  return { blobUrl, loading, error };
}

/** Full-screen video lightbox.
 *
 *  - Locks body scroll while open.
 *  - Click outside the video (the dim backdrop) closes.
 *  - Escape key closes.
 *  - Renders an inline <video> with controls and autoplay — preload="metadata"
 *    so we don't fetch full bytes until the user actually presses play. */
export function VideoLightbox({
  src,
  poster,
  title,
  onClose,
}: {
  src: string;
  poster?: string | null;
  title?: string;
  onClose: () => void;
}) {
  // Only fetch-as-blob if the URL needs our Bearer token. S3 / CDN URLs go
  // straight to <video src> — the browser handles range/streaming natively
  // and we don't pollute the request with a header S3 will reject.
  const direct = !isOurOriginUrl(src);
  const { blobUrl, loading, error } = useAuthedVideo(direct ? null : src);
  const finalSrc = direct ? src : blobUrl;

  // Lock body scroll while the lightbox is mounted.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const usablePoster =
    poster && /^https?:\/\//i.test(poster) ? poster : undefined;

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-md sm:py-12"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-secondary backdrop-blur transition hover:border-white/35 hover:text-white sm:right-6 sm:top-6"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        className="relative flex w-full max-w-4xl flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <p className="text-center label-mono text-meta text-secondary">
            {title}
          </p>
        )}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
          {finalSrc && (
            <video
              src={finalSrc}
              poster={usablePoster}
              controls
              autoPlay
              preload="metadata"
              playsInline
              className="block h-auto max-h-[80vh] w-full"
            />
          )}
          {!direct && (loading || error) && !blobUrl && (
            <div className="grid aspect-video w-full place-items-center">
              {loading ? (
                <span className="inline-flex items-center gap-3 label-mono text-meta text-secondary">
                  <span className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white" />
                  Fetching video
                </span>
              ) : (
                <p className="px-6 text-center text-xs text-red-200/85">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Inline authed-video element — same fetch-as-blob path as the lightbox,
 *  but renders directly in the page (e.g. on the moment detail). */
export function AuthedVideo({
  src,
  poster,
  className = "block h-auto max-h-[70vh] w-full",
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
}: {
  src: string;
  poster?: string | null;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}) {
  const direct = !isOurOriginUrl(src);
  const { blobUrl, loading, error } = useAuthedVideo(direct ? null : src);
  const finalSrc = direct ? src : blobUrl;
  const usablePoster =
    poster && /^https?:\/\//i.test(poster) ? poster : undefined;

  // S3 / CDN: just let the browser stream it.
  if (direct) {
    return (
      <video
        src={src}
        poster={usablePoster}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        preload="metadata"
        playsInline
        className={className}
      />
    );
  }
  // Our origin: blob-fetch first, then render.
  if (loading || error) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-2xl border border-white/10 bg-black">
        {loading ? (
          <span className="inline-flex items-center gap-3 label-mono text-meta text-secondary">
            <span className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white" />
            Fetching video
          </span>
        ) : (
          <p className="px-6 text-center text-xs text-red-200/85">{error}</p>
        )}
      </div>
    );
  }
  if (!finalSrc) return null;
  return (
    <video
      src={finalSrc}
      poster={usablePoster}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      preload="metadata"
      playsInline
      className={className}
    />
  );
}

/** Compact play-arrow badge — overlays on a thumbnail to signal video. */
export function PlayBadge({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid place-items-center rounded-full border border-white/30 bg-black/55 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm transition group-hover:scale-105 group-hover:border-white/55"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 translate-x-[1px]"
        fill="currentColor"
      >
        <path d="M8 5.5v13l11-6.5L8 5.5z" />
      </svg>
    </span>
  );
}
