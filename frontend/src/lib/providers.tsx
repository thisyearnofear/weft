'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { useState } from 'react';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

export function Providers({ children }: { children: React.ReactNode }) {
  const [wagmiConfig] = useState(() =>
    createConfig({
      chains: [base, mainnet],
      connectors: [
        injected(),
        ...(projectId ? [walletConnect({ projectId })] : []),
      ],
      transports: {
        [base.id]: http(),
        [mainnet.id]: http(),
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
