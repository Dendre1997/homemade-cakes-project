/** @type {import('next').NextConfig} */
const nextConfig = {
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
