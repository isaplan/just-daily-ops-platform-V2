import type { NextConfig } from "next";
import path from "path";

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
  // Webpack configuration to handle optional Apollo Server dependency
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Resolve @yaacovcr/transform to our stub module
      const fs = require('fs');
      const stubPath = path.resolve(__dirname, 'node_modules', '@yaacovcr', 'transform', 'index.js');
      
      // Ensure stub exists, create if it doesn't
      if (!fs.existsSync(stubPath)) {
        try {
          require('./scripts/create-apollo-stub.js');
        } catch (e) {
          console.warn('Could not create Apollo stub automatically:', e);
        }
      }
      
      if (fs.existsSync(stubPath)) {
        config.resolve.alias = {
          ...config.resolve.alias,
          '@yaacovcr/transform': stubPath,
        };
      }
    }
    
    // Exclude large directories from file watching for faster dev server
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/ai-compliance-export/**',
        '**/old-supabase-pages-sql-scripts-readonly-dont-use-code-in-rebuild-unless-specifcly-asked-by-me/**',
        '**/build-docs-scripts-sql-ai/**',
        '**/scripts/**',
        '**/tools/**',
        '**/data-archives/**',
        '**/dev-docs/**',
        '**/docs/**',
      ],
    };
    
    return config;
  },
  // Turbopack configuration (for Next.js 15+ with Turbopack)
  experimental: {
    turbo: {
      resolveAlias: {
        '@yaacovcr/transform': './node_modules/@yaacovcr/transform/index.mjs',
      },
    },
    // Enable instrumentation hook for cron job initialization
    instrumentationHook: true,
  },
};

export default nextConfig;
