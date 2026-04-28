import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
