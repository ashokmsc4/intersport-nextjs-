import type { NextConfig } from "next";
import { imageHosts } from "./src/lib/media";

// Vercel's image service can't fetch Magento media (firewall / quota), so on
// Vercel images go through our own /api/media route. Set IMAGE_PROXY=false to
// use the built-in optimizer there, or IMAGE_PROXY=true to force the proxy.
const useProxy = process.env.IMAGE_PROXY
  ? process.env.IMAGE_PROXY === "true"
  : process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  images: useProxy
    ? { loader: "custom", loaderFile: "./src/lib/image-loader.ts" }
    : {
        // Product and banner images from the Magento media folders only.
        remotePatterns: imageHosts().map((hostname) => ({
          protocol: "https" as const,
          hostname,
          pathname: "/media/**",
        })),
        formats: ["image/avif", "image/webp"],
        // Catalog images rarely change; Magento cache paths change when they do.
        minimumCacheTTL: 60 * 60 * 24,
      },
};

export default nextConfig;
