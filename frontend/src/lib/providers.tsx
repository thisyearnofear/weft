'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
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
  transports: {
    [zeroGTestnet.id]: http('https://evmrpc-testnet.0g.ai'),
    [base.id]: http('https://base-rpc.publicnode.com'),
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

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