import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O pacote de schemas é compilado para CommonJS, então não precisa de transpilação.
};

export default nextConfig;
