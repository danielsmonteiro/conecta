/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL || 'http://localhost:3000';

const nextConfig = {
  output: 'standalone',
  // Proxy same-origin: o browser chama /api/* e o Next encaminha ao backend,
  // preservando cookies httpOnly (mesmo modelo da produção).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
