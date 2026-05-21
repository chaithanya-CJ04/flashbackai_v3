"use client";

import { useEffect, useState } from "react";

/** Renders a person avatar that gracefully degrades:
 *
 *  1. Try `imageUrl`, then `thumbnailUrl`, skipping any non-http(s) URL.
 *  2. If the image fails to load at runtime, swap to initials.
 *
 *  Used in both the gallery cards and the legacy detail header. */
export function Avatar({
  name,
  imageUrl,
  thumbnailUrl,
  size = 96,
  rounded = "rounded-2xl",
  className = "",
}: {
  name: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const candidates = (
    [imageUrl, thumbnailUrl].filter((u): u is string => {
      if (!u) return false;
      return /^https?:\/\//i.test(u);
    })
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  // Re-evaluate if URLs change between renders.
  useEffect(() => {
    setActiveIdx(0);
    setFailed(false);
  }, [imageUrl, thumbnailUrl]);

  const current = !failed ? candidates[activeIdx] : undefined;

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "—";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-white/10 ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* sheen + base */}
      <div className="absolute inset-0 bg-linear-to-br from-[rgb(var(--accent))]/35 via-[rgb(var(--accent-deep))]/30 to-black/40" />
      {current ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => {
              if (activeIdx < candidates.length - 1) {
                setActiveIdx((i) => i + 1);
              } else {
                setFailed(true);
              }
            }}
          />
          {/* tiny readability scrim at bottom — helps when used over a name caption */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/30 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="display-sans select-none text-primary"
            style={{ fontSize: Math.max(18, Math.round(size * 0.4)) }}
          >
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
