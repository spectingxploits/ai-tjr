// File: next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["grammy", "tweetnacl", "tweetnacl-util"], // ✅ move here
};

export default nextConfig;
