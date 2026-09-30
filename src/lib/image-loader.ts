/**
 * Image loader used when IMAGE_PROXY is on (default on Vercel): remote images
 * are served by our own /api/media route instead of the platform's image
 * service. That route runs where the Magento API is reachable and isn't hit by
 * Magento's hotlink protection. Local files are served as-is.
 */
export default function mediaLoader({ src, width }: { src: string; width: number }) {
  if (src.startsWith("/")) return src;
  return `/api/media?url=${encodeURIComponent(src)}&w=${width}`;
}
