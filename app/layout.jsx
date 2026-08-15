import './globals.css';
import Background from '@/components/layout/Background';

export const metadata = {
  title: 'FlashForge — ESP32 & Arduino Web Flasher',
  description:
    'Flash ESP32 and Arduino firmware straight from your browser. No drivers, no IDE, no install — just Web Serial.',
  keywords: ['ESP32', 'Arduino', 'Web Serial', 'firmware', 'flasher', 'esptool'],
  openGraph: {
    title: 'FlashForge — ESP32 & Arduino Web Flasher',
    description: 'Browser-based firmware flashing with a built-in serial monitor.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#F5F8FD',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
        <Background />
        {children}
      </body>
    </html>
  );
}
