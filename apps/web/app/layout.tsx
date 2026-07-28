import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/service-worker';

const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-newsreader',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'The Morning Brief',
  description:
    'A daily morning intelligence briefing: AI, Saudi Arabia, the Middle East, markets and global events, clustered and ranked by importance.',
  applicationName: 'The Morning Brief',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Morning Brief', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4ecdc' },
    { media: '(prefers-color-scheme: dark)', color: '#14130f' },
  ],
};

/**
 * Applies the stored paper before first paint.
 *
 * This has to be inline and synchronous: a reader who chose dark should never
 * see a flash of sepia while React hydrates.
 *
 * Sepia is the default for everyone, including readers whose system is set to
 * dark. The brief is meant to look like paper on first open, and deferring to
 * the OS would mean most people never see the default at all.
 */
const THEME_SCRIPT = `(function(){var t='sepia';try{t=localStorage.getItem('morning-brief-theme')||'sepia';}catch(e){}document.documentElement.dataset.theme=t;})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${newsreader.variable} ${inter.variable}`}>
      {/* Placed at the top of <body> rather than in a hand-written <head>: the
          App Router owns <head>, and this still runs before anything paints. */}
      <body className="min-h-dvh antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
