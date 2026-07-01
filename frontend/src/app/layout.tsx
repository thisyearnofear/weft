import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import styles from './layout.module.css';
import { Providers } from '@/lib/providers';
import { ConnectButton } from '@/components/ConnectButton';
import { Nav } from '@/components/Nav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientToasts } from '@/components/ClientToasts';
import { SmoothScroll } from '@/components/SmoothScroll';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Weft — Escrow That Releases Itself',
  description:
    'A sponsor locks ETH behind a deliverable. The builder ships. Autonomous agents verify the work onchain — and capital releases automatically. No manual reviews. No chasing. No politics.',
  keywords: ['milestone funding', 'autonomous agents', 'escrow', 'ENS', 'reputation', '0G Chain', 'builder verification'],
  openGraph: {
    title: 'Weft — Escrow That Releases Itself',
    description: 'Autonomous agents verify onchain work and release escrowed capital. No manual reviews. No chasing sponsors.',
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
            <Nav />
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
