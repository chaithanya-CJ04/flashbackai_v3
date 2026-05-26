"use client";

import {
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
  type VideoHTMLAttributes,
} from "react";

/* ────────────────────────────────────────────────────────────────────
   MediaImg / MediaVideo

   Drop-in wrappers around <img> and <video> that show a shimmering
   skeleton until the bytes are decoded. The image/video itself is
   absolutely positioned inside whatever relative parent the caller
   already had, so the skeleton lives at the same rect and fades out
   the moment `load` fires.

   These are deliberately tiny — they only add the skeleton layer +
   an opacity transition. All other attributes (src, srcSet, alt,
   className, draggable, onClick, etc.) pass straight through.
   ──────────────────────────────────────────────────────────────────── */

type MediaImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Tailwind classes on the skeleton box. Defaults to absolute fill,
   *  which works when the wrapping parent is `relative`. */
  skeletonClassName?: string;
  /** Rounded-* class to match the image's own corner radius. */
  skeletonRounded?: string;
};

export function MediaImg({
  className = "",
  skeletonClassName = "absolute inset-0 h-full w-full",
  skeletonRounded = "rounded-none",
  onLoad,
  onError,
  ...rest
}: MediaImgProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <>
      {!loaded && !errored && (
        <div
          aria-hidden
          className={`skeleton ${skeletonRounded} ${skeletonClassName}`}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...rest}
        alt={rest.alt ?? ""}
        className={`${className} transition-opacity duration-300 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={(e: SyntheticEvent<HTMLImageElement>) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e: SyntheticEvent<HTMLImageElement>) => {
          setErrored(true);
          onError?.(e);
        }}
      />
    </>
  );
}

type MediaVideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  skeletonClassName?: string;
  skeletonRounded?: string;
};

/** Same idea for <video>: poster gets to paint immediately, but the
 *  full video frames don't show until `loadeddata` (or the first
 *  `playing` event). We show the skeleton until then so the box isn't
 *  empty if the poster is also missing/slow. */
export function MediaVideo({
  className = "",
  skeletonClassName = "absolute inset-0 h-full w-full",
  skeletonRounded = "rounded-none",
  onLoadedData,
  onError,
  ...rest
}: MediaVideoProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <>
      {!loaded && !errored && (
        <div
          aria-hidden
          className={`skeleton ${skeletonRounded} ${skeletonClassName}`}
        />
      )}
      <video
        {...rest}
        className={`${className} transition-opacity duration-300 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoadedData={(e: SyntheticEvent<HTMLVideoElement>) => {
          setLoaded(true);
          onLoadedData?.(e);
        }}
        onError={(e: SyntheticEvent<HTMLVideoElement>) => {
          setErrored(true);
          onError?.(e);
        }}
      />
    </>
  );
}
