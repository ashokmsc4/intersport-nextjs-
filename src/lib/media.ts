/**
 * Hosts whose product images go through the Next.js image optimizer.
 * Fetching on the server avoids the Magento hotlink protection (which rejects
 * image requests referred by other domains) and serves resized WebP/AVIF.
 * Shared by next.config.ts (remotePatterns) and ProductImage.
 */
export function imageHosts(): string[] {
  const hosts = new Set<string>(["static.aawweb.com"]);
  const base = process.env.MAGENTO_BASE_URL;
  if (base) hosts.add(new URL(base).hostname);
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
