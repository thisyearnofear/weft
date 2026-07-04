'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, fallback } from 'wagmi';
import { mainnet, base, sepolia } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { zeroGTestnet } from './contracts';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const wagmiConfig = getDefaultConfig({
  appName: 'Weft',
  appDescription: 'Milestone-based funding and portable reputation',
  projectId,
  chains: [zeroGTestnet, base, mainnet, sepolia] as const,
  // Fallback transports: the daemon's own telemetry shows the primary 0G RPC
  // times out daily — never let one endpoint take the app down
  transports: {
    [zeroGTestnet.id]: fallback([http('https://evmrpc-testnet.0g.ai'), http('https://0g-galileo-evmrpc2.corenodehq.xyz')]),
    [base.id]: http('https://base-rpc.publicnode.com'),
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
    [sepolia.id]: fallback([http('https://ethereum-sepolia-rpc.publicnode.com'), http('https://sepolia.drpc.org')]),
  },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#6366f1',
            accentColorForeground: '#fff',
            borderRadius: 'small',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          modalSize="compact"
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}