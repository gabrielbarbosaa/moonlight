import path from 'node:path';
import type { NextConfig } from 'next';

const docker = process.env.DOCKER_BUILD === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(docker && {
    output: 'standalone',
    outputFileTracingRoot: path.join(__dirname, '../..'),
  }),
};

export default nextConfig;
