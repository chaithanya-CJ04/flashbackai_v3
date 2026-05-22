import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { WalletProviders } from "./components/WalletProviders";
import { BottomNav } from "./components/BottomNav";
import ShapeGrid from "./components/ShapeGrid";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const serifDisplay = Instrument_Serif({
  variable: "--font-serif-display",
  weight: "400",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5173";
const TAGLINE = "A private archive for the people who shaped you.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Flashback — A place to keep someone close",
    template: "%s · Flashback",
  },
  description: TAGLINE,
  applicationName: "Flashback",
  generator: "Next.js",
  keywords: [
    "Flashback",
    "memory",
    "legacy",
    "private archive",
    "remembrance",
    "AI companion",
  ],
  authors: [{ name: "Flashback Labs" }],
  creator: "Flashback Labs",
  publisher: "Flashback Labs",
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Flashback",
    title: "Flashback — A place to keep someone close",
    description: TAGLINE,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flashback — A place to keep someone close",
    description: TAGLINE,
  },
  appleWebApp: {
    capable: true,
    title: "Flashback",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060418" },
    { media: "(prefers-color-scheme: light)", color: "#7B73FD" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Theme-tinted shape grid — fixed background layer, sits above the
            cosmic gradient/constellation (z = -1..-3) and below app content.
            Hover only registers in empty regions (cards cover most). */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.6]"
        >
          <ShapeGrid
            shape="hexagon"
            direction="diagonal"
            speed={0.3}
            squareSize={46}
            borderColor="rgba(168, 145, 235, 0.22)"
            hoverFillColor="rgba(168, 130, 255, 0.32)"
            hoverTrailAmount={5}
            glowColor="rgba(176, 130, 255, 0.85)"
            glowBlur={12}
          />
        </div>
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <WalletProviders>
            {children}
            <BottomNav />
          </WalletProviders>
        </div>
      </body>
    </html>
  );
}
