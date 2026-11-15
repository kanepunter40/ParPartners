import type { Metadata } from 'next';
import { Hanken_Grotesk, Newsreader } from 'next/font/google';
import { CONTENT } from './content';
import './globals.css';

const serif = Newsreader({ subsets: ['latin'], weight: ['300', '400'], style: ['normal'], variable: '--font-serif', display: 'swap' });
const sans = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://parpartners.app'),
  description: CONTENT.en.description,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon-32.png', sizes: '32x32' }],
    apple: '/apple-touch-icon.png'
  }
};

// Runs before the first paint: lets the CSS hide content that will fade in, so nothing flashes.
// Without JavaScript, or with reduced motion, everything simply shows.
const beforePaint = `document.documentElement.classList.add('js')`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: beforePaint }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
