import { ImageResponse } from "next/og";
import { ogLogoDataUrl } from "./_brand/og-logo";

export const alt = "Flashback — A private archive for the people who shaped you.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const logoSrc = ogLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "84px 88px",
          color: "white",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          backgroundColor: "#060418",
          backgroundImage: [
            "radial-gradient(900px 600px at 18% -10%, rgba(148,137,255,0.55), transparent 60%)",
            "radial-gradient(900px 700px at 95% 110%, rgba(99,88,245,0.45), transparent 65%)",
            "radial-gradient(600px 400px at 70% 30%, rgba(240,200,154,0.10), transparent 70%)",
            "linear-gradient(180deg, #0a0820 0%, #07051a 55%, #040312 100%)",
          ].join(", "),
        }}
      >
        {/* Top row: logo + brand wordmark + readout strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                display: "flex",
                width: 92,
                height: 92,
                borderRadius: 22,
                boxShadow: "0 24px 60px -16px rgba(123,115,253,0.7), 0 0 0 1px rgba(255,255,255,0.06) inset",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} width={92} height={92} alt="" />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                }}
              >
                Flashback
              </span>
              <span
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                }}
              >
                Private archive · v1.0
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(180,173,255,0.35)",
              backgroundColor: "rgba(123,115,253,0.10)",
              fontSize: 14,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: "#B4ADFF",
                boxShadow: "0 0 18px 4px rgba(180,173,255,0.6)",
              }}
            />
            <span>STN-04 · Encrypted</span>
          </div>
        </div>

        {/* Center: editorial headline + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 116,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 0.94,
              textTransform: "uppercase",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>A place to keep</span>
            <span style={{ color: "#B4ADFF" }}>someone close.</span>
          </div>

          <div
            style={{
              marginTop: 32,
              fontSize: 26,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 880,
              lineHeight: 1.35,
            }}
          >
            A private archive for the people who shaped you.
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            fontSize: 16,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          }}
        >
          <span>flashback.ai</span>
          <span>Memory · Legacy · Continuity</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
