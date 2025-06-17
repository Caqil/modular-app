
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile packages
  transpilePackages: ['@modular-app/ui', '@modular-app/core','@modular-app/config'],
  
  webpack: (config, { isServer }) => {
    // Exclude server-only modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };

      // Exclude server-only packages
      config.externals = [
        ...(config.externals || []),
        {
          'redis': 'redis',
          '@redis/client': '@redis/client', 
          'mongoose': 'mongoose',
          'bcryptjs': 'bcryptjs',
          'jsonwebtoken': 'jsonwebtoken',
          'sharp': 'sharp',
          'multer': 'multer',
          'express': 'express',
          'helmet': 'helmet',
          'cors': 'cors',
          'compression': 'compression',
          'winston': 'winston',
        }
      ];
    }

    return config;
  },

  // Experimental features
  experimental: {
    serverComponentsExternalPackages: [
      'mongoose',
      'redis',
      '@redis/client',
      'bcryptjs',
      'jsonwebtoken',
      'sharp',
      'multer',
      'winston'
    ],
  },
};

module.exports = nextConfig;