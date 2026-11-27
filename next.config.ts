import type {NextConfig} from 'next';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com https://*.supabase.co wss://*.firebaseio.com https://www.gstatic.com https://video.bunnycdn.com",
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://drive.google.com https://iframe.mediadelivery.net",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

// The Telegram Mini App page is opened inside Telegram (and framed by web.telegram.org), so it alone may load Telegram's
// script and be framed by Telegram. Every other page keeps the strict policy above.
const MINIAPP_CSP = CSP.replace("script-src 'self'", "script-src 'self' https://telegram.org").replace("frame-ancestors 'self'", 'frame-ancestors https://web.telegram.org https://*.telegram.org https://telegram.org');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/miniapp',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: MINIAPP_CSP }
        ]
      },
      {
        source: '/((?!miniapp$).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // The microphone is needed for Edubek's spoken conversation; the rest of the sensors are not used.
          { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=(), payment=(), usb=()' },
          // Content Security Policy: scripts only from this site (Next.js inlines its bootstrap), Firebase sign-in and
          // the video/image hosts the lessons and news use. Everything else is refused by the browser.
          { key: 'Content-Security-Policy', value: CSP }
        ]
      }
    ];
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
