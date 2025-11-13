import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Webpack configuration to handle optional Apollo Server dependencies
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore optional @yaacovcr/transform dependency for Apollo Server
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@yaacovcr/transform': false,
      };
    }
    return config;
  },
  // Prevent search engine indexing
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
