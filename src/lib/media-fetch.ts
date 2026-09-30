import "server-only";
import { imageHosts } from "@/lib/media";

/** https URL under /media/ on one of the configured image hosts. */
export const isAllowedMedia = (url: URL) =>
  url.protocol === "https:" &&
  imageHosts().includes(url.hostname) &&
  url.pathname.startsWith("/media/");

/**
 * Fetches a Magento media file, following up to 3 redirects as long as each
 * hop stays on an allowed image host. Returns the response, or a short,
 * non-secret reason when it couldn't be fetched.
 */
export async function fetchMedia(target: URL): Promise<Response | string> {
  const userAgent = process.env.MAGENTO_USER_AGENT;
  let url = target;
  for (let hop = 0; hop <= 3; hop++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          ...(userAgent ? { "User-Agent": userAgent } : {}),
        },
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      const e = error as Error & { cause?: { code?: string } };
      return `fetch failed: ${[e.name, e.message, e.cause?.code].filter(Boolean).join(" ")}`;
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url);
      if (!isAllowedMedia(next)) return `redirected to ${next.hostname}${next.pathname}, which isn't allowed`;
      url = next;
      continue;
    }
    return res;
  }
  return "too many redirects";
}

/** Why a media response isn't a usable image, or null if it is. */
export function mediaProblem(res: Response | string): string | null {
  if (typeof res === "string") return res;
  const type = res.headers.get("content-type") ?? "";
  if (res.ok && type.startsWith("image/")) return null;
  return `upstream ${res.status} ${type || "(no content type)"}`;
}
