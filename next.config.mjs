// Same-origin Firebase Auth helpers: the browser uses `<our host>/__/auth/*`
// (see src/lib/firebase/client.ts), which must be proxied to the project's hosting domain.
const firebaseAuthHost = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
  : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (!firebaseAuthHost) return [];
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseAuthHost}/__/auth/:path*`,
      },
      {
        source: "/__/firebase/:path*",
        destination: `https://${firebaseAuthHost}/__/firebase/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Inject <link rel="preconnect"> for critical third-party origins.
  // This tells the browser to open the TCP+TLS handshake BEFORE it
  // discovers those domains in the HTML, saving ~300ms on mobile.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Link",
            value: [
              '<https://res.cloudinary.com>; rel=preconnect',
              '<https://identitytoolkit.googleapis.com>; rel=preconnect',
              '<https://securetoken.googleapis.com>; rel=preconnect',
            ].join(", "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
