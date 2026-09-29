import type { NextConfig } from "next";
import { imageHosts } from "./src/lib/media";

const nextConfig: NextConfig = {
  images: {
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
