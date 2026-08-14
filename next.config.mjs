/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The stylesheet is loaded with a plain <link>; Next's build-time font
  // fetch just adds a network round-trip (and fails in offline CI).
  optimizeFonts: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async headers() {
    return [
      {
        // Web Serial + SharedArrayBuffer friendly isolation headers.
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'serial=(self)' },
        ],
      },
    ];
  },
};
export default nextConfig;
