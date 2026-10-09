import type { NextConfig } from 'next';

const BFF_URL = process.env.BFF_URL ?? 'http://localhost:4000';
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Reads and claim creation go through the GraphQL BFF.
      { source: '/graphql', destination: `${BFF_URL}/graphql` },
      // Photo uploads go straight to the REST API (multipart doesn't belong in the BFF).
      { source: '/api/:path*', destination: `${API_URL}/:path*` },
    ];
  },
};

export default nextConfig;
