import path from "node:path";
import type { NextConfig } from "next";

const stub = path.resolve(__dirname, "./empty-module.js");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      accounts: stub,
      "@base-org/account": stub,
      "@coinbase/cdp-sdk": stub,
    },
  },
};

export default nextConfig;
