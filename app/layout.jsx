import './globals.css';
import Background from '@/components/layout/Background';

/**
 * Absolute base for Open Graph images. Without it Next resolves them against
 * localhost, so shared links show a broken preview. VERCEL_URL is injected on
 * every deployment; NEXT_PUBLIC_SITE_URL wins when a custom domain is set.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Telugu Experiments Flasher — ESP32, ESP8266 & Arduino',
  description:
    'Flash ESP32, ESP8266 and Arduino firmware straight from your browser. No drivers, no IDE, no install — just Web Serial.',
  keywords: ['ESP32', 'Arduino', 'Web Serial', 'firmware', 'flasher', 'esptool'],
  openGraph: {
    title: 'Telugu Experiments Flasher — ESP32, ESP8266 & Arduino',
    description: 'Browser-based firmware flashing with a built-in serial monitor.',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'TE Flasher' }],
  },
  // app/icon.png and app/apple-icon.png are picked up automatically by Next.
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
};

export const viewport = {
  themeColor: '#F5F8FD',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Loaded via <link> rather than next/font so the app also builds in
            offline / air-gapped CI. Falls back to the system stack. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-screen bg-canvas">
        {/* Light unless the visitor previously chose dark. Applied before
            first paint so there is no flash of the wrong background. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.toggle('dark',localStorage.getItem('te-flasher:theme')==='dark');}catch(e){}})();`,
          }}
        />
        <Background />
        {children}
      </body>
    </html>
  );
}
