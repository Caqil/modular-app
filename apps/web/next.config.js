/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost', 'your-domain.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/plugins/:path*',
        destination: '/api/plugins/:path*',
      },
      {
        source: '/themes/:path*',
        destination: '/api/themes/:path*',
      },
    ];
  },
  webpack: (config) => {
    // Plugin and theme hot-reload support
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: [/packages\/plugins/, /themes/],
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      ],
    });
    return config;
  },
  transpilePackages: ['@modular-app/core', '@modular-app/ui'],
};

module.exports = nextConfig;