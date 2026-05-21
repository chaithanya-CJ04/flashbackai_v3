"use client";

import { ReactNode, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl } from "@solana/web3.js";

import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { mainnet } from "wagmi/chains";

type WalletProvidersProps = {
  children: ReactNode;
};

export function WalletProviders({ children }: WalletProvidersProps) {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || clusterApiUrl("mainnet-beta");

  const solanaWallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  const [config] = useState(() =>
    createConfig({
      chains: [mainnet],
      connectors: [
        injected({
          target: "metaMask",
        }),
      ],
      transports: {
        [mainnet.id]: http(),
      },
    }) as any
  );

  const [queryClient] = useState(() => new QueryClient());

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={solanaWallets}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>{children}</WagmiProvider>
        </QueryClientProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
