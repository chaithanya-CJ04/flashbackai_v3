import path from "node:path";
import type { NextConfig } from "next";

const stub = path.resolve(__dirname, "./empty-module.js");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The dev-mode "N" indicator sits in the bottom-left of the viewport
  // and on mobile collides with our BottomNav (covers the "HOME" label).
  // We don't need it during development — turn it off so what we see in
  // dev matches production.
  devIndicators: false,
  turbopack: {
    resolveAlias: {
      accounts: stub,
      "@base-org/account": stub,
      "@coinbase/cdp-sdk": stub,
    },
  },
};

export default nextConfig;
