'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base, sepolia } from 'wagmi/chains';
import { defineChain } from 'viem';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

const zeroGTestnet = defineChain({
  id: 16602,
  name: "0G Testnet",
  network: "0g-testnet",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
    public: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [wagmiConfig] = useState(() =>
    createConfig({
      chains: [zeroGTestnet, base, mainnet, sepolia],
      connectors: [
        injected(),
        ...(projectId ? [walletConnect({ projectId })] : []),
      ],
      transports: {
        [zeroGTestnet.id]: http(),
        [base.id]: http(),
        [mainnet.id]: http(),
        [sepolia.id]: http(),
      },
    })
  );

  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

import { useState } from 'react';