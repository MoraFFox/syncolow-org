/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-icons'],
  },
  // Turbopack is the default in Next.js 16 and handles code splitting automatically
  // Removed webpack config as it conflicts with Turbopack
  turbopack: {},
  // Skip TypeScript checking during build to avoid hangs with large codebases
  // Run 'npm run typecheck' separately for type checking
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
