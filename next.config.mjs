/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Dev hardening for this Windows workspace:
    // avoid flaky chunk/cache states that can cause white/blank screens.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
