/** @type {import('next').NextConfig} */

// Content-Security-Policy (docs/SYSTEM_DESIGN.md §4).
//
// `script-src 'unsafe-inline'` is required by Next.js hydration without
// nonce middleware — the documented trade-off is that this CSP defends
// against remote-script injection, clickjacking, base/form hijacking and
// plugin content, while inline-XSS defense stays with React escaping +
// server-side input caps (there are zero dangerouslySetInnerHTML sinks).
// `img-src https:` keeps legacy externally-hosted avatars rendering;
// `data: blob:` keeps in-DB data-URL avatars and upload previews working.
const isDev = process.env.NODE_ENV !== 'production';
const contentSecurityPolicy = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', '),
  },
];

if (process.env.NODE_ENV === 'production') {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  });
}

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      // Serve Digital Asset Links from the spec-required path. Android's TWA
      // verifier fetches this on launch to confirm the APK can render this
      // origin fullscreen (and receive Web Push as a real PWA).
      {
        source: '/.well-known/assetlinks.json',
        destination: '/api/well-known/assetlinks',
      },
    ];
  },
  webpack: (config, { dev }) => {
    // Dev hardening for this Windows workspace:
    // avoid flaky chunk/cache states that can cause white/blank screens.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
