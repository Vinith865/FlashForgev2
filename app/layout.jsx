import './globals.css';
import Background from '@/components/layout/Background';

export const metadata = {
  title: 'TE Flasher — ESP32 & Arduino Web Flasher',
  description:
    'Flash ESP32 and Arduino firmware straight from your browser. No drivers, no IDE, no install — just Web Serial.',
  keywords: ['ESP32', 'Arduino', 'Web Serial', 'firmware', 'flasher', 'esptool'],
  openGraph: {
    title: 'TE Flasher — ESP32 & Arduino Web Flasher',
    description: 'Browser-based firmware flashing with a built-in serial monitor.',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'TE Flasher' }],
  },
  // app/icon.png and app/apple-icon.png are picked up automatically by Next.
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F8FD' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1220' },
  ],
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
        {/* Applies the saved theme before first paint so there is no flash
            of the wrong background on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('te-flasher:theme')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
        <Background />
        {children}
      </body>
    </html>
  );
}
