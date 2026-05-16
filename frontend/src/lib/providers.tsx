'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base, sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { zeroGTestnet } from './contracts';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

export function Providers({ children }: { children: React.ReactNode }) {
  const [wagmiConfig] = useState(() =>
    createConfig({
      chains: [zeroGTestnet, base, mainnet, sepolia],
      connectors: [
        injected(),
        ...(projectId ? [walletConnect({ projectId })] : []),
      ],
      transports: {
        [zeroGTestnet.id]: http('https://evmrpc-testnet.0g.ai'),
        [base.id]: http('https://base-rpc.publicnode.com'),
        [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
        [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
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
