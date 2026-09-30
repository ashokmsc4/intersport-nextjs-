import type { NextConfig } from "next";

// Images load directly from the Magento CDNs (prod.aaw.com, static.aawweb.com) in
// the browser, sent without a Referer so hotlink protection lets them through
// (see ProductImage). IMAGE_PROXY=true serves them through /api/media instead.
const useProxy = process.env.IMAGE_PROXY === "true";

const nextConfig: NextConfig = {
  images: useProxy
    ? { loader: "custom", loaderFile: "./src/lib/image-loader.ts" }
    : { unoptimized: true },
};

export default nextConfig;
