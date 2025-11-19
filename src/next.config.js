
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    // ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias['~'] = 'node_modules';
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https'
        ,
        hostname: '*.tile.openstreetmap.org',
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {},
  // reactStrictMode: false,
  experimental: {
    
  },
  allowedDevOrigins: ["https://*.cloudworkstations.dev","*"],
};

export default nextConfig;
