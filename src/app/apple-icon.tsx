import { ImageResponse } from "next/og";
import { ogLogoDataUrl } from "./_brand/og-logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const logoSrc = ogLogoDataUrl();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={180} height={180} alt="" />
      </div>
    ),
    { ...size }
  );
}
