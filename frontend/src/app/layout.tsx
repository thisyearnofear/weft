import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';
import { ConnectButton } from '@/components/ConnectButton';

export const metadata: Metadata = {
  title: 'Weft — Milestone Funding for Fluid Builder Teams',
  description:
    'Milestone-based funding and portable reputation. Humans and agents participate identically. Replace companies, lawyers, and managers with onchain milestones.',
  keywords: ['milestone funding', 'web3', 'autonomous agents', 'ENS', 'reputation', 'DeFi'],
  openGraph: {
    title: 'Weft — Milestone Funding for Fluid Builder Teams',
    description: 'Humans and agents participate identically.',
    type: 'website',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: '1rem 1.5rem',
            background: 'rgba(10, 10, 15, 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <a href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '1.25rem',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              ⬡ Weft
            </a>
            <ConnectButton />
          </header>
          <main style={{ paddingTop: '68px' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}