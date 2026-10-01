import type { NextConfig } from 'next';
import path from 'node:path';
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const config: NextConfig = {
  turbopack: { root: path.resolve(__dirname, '..') },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
};
export default config;
