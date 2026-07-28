import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The shared package ships TypeScript source rather than a build step.
  transpilePackages: ['@morning-brief/shared'],
  poweredByHeader: false,
  // Dev only. Without this, opening the site on 127.0.0.1 rather than localhost
  // makes Next treat /_next/* as cross-origin and block it — the page renders
  // but no client chunk loads, so nothing hydrates and every control is dead.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
