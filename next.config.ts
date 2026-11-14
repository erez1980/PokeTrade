import type { NextConfig } from "next";

// Static export so the site can be hosted on GitHub Pages or any static host.
// NEXT_PUBLIC_BASE_PATH lets the site live under a sub-path (e.g. /PokeTrade on GitHub Pages).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
