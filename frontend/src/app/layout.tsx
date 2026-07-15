import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import styles from './layout.module.css';
import { Providers } from '@/lib/providers';
import { ConnectButton } from '@/components/ConnectButton';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientToasts } from '@/components/ClientToasts';
import { SmoothScroll } from '@/components/SmoothScroll';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://weft.thisyearnofear.com'),
  title: {
    default: 'Weft — Milestone Release for Program Offices',
    template: '%s · Weft',
  },
  description:
    'Institutional funders escrow capital against checkable deliverables. Agents verify against a fixed template; Canton settles privately. Builder wedge on 0G Testnet for crypto-native demos.',
  keywords: ['milestone funding', 'program office', 'Canton', 'institutional settlement', 'autonomous agents', 'escrow', 'grant programs'],
  applicationName: 'Weft',
  openGraph: {
    type: 'website',
    url: 'https://weft.thisyearnofear.com',
    siteName: 'Weft',
    title: 'Weft — Milestone Release for Program Offices',
    description:
      'Agents verify checkable deliverables; private settlement for program issuers and funders. No public-chain leakage of counterparties.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weft — Milestone Release for Program Offices',
    description:
      'Agents verify checkable deliverables for program offices. Private Canton settlement; public EVM wedge on testnet.',
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
          <Footer />
          <ClientToasts />
        </Providers>
      </body>
    </html>
  );
}
