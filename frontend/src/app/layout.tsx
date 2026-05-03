import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import styles from './layout.module.css';
import { Providers } from '@/lib/providers';
import { ConnectButton } from '@/components/ConnectButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientToasts } from '@/components/ClientToasts';
import { SmoothScroll } from '@/components/SmoothScroll';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

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
        <Providers>
          <SmoothScroll />
          <a href="#main-content" className={styles.skipLink}>Skip to content</a>
          <header className={styles.header} role="banner">
            <Link href="/" className={styles.logo}>
              ⬡ Weft
            </Link>
            <ConnectButton />
          </header>
          <main id="main-content" className={styles.main}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
          <ClientToasts />
        </Providers>
      </body>
    </html>
  );
}
