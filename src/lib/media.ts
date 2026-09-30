import { MAGENTO_BASE_URL } from "@/lib/base-url";

/**
 * Magento media hosts. Images from them load directly in the browser by default;
 * with IMAGE_PROXY=true they go through /api/media, which only fetches these hosts.
 */
export function imageHosts(): string[] {
  // The Magento CDNs: product images (prod.aaw.com) and banners/theme (static.aawweb.com).
  const hosts = new Set<string>(["static.aawweb.com", "prod.aaw.com"]);
  const media = process.env.MAGENTO_MEDIA_URL;
  if (media) hosts.add(new URL(media).hostname);
  const base = MAGENTO_BASE_URL;
  if (base) {
    // Magento content mixes "www." and bare-domain media URLs; allow both.
    const host = new URL(base).hostname;
    hosts.add(host);
    hosts.add(host.startsWith("www.") ? host.slice(4) : `www.${host}`);
  }
  for (const h of (process.env.MAGENTO_IMAGE_HOSTS ?? "").split(",")) {
    if (h.trim()) hosts.add(h.trim());
  }
  return [...hosts];
}

export const isOptimizable = (src: string) => {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && imageHosts().includes(url.hostname);
  } catch {
    return false;
  }
};
