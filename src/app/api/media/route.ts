import { fetchMedia, isAllowedMedia, mediaProblem } from "@/lib/media-fetch";

/**
 * Image pass-through for Magento media (see src/lib/image-loader.ts).
 * Only https URLs on the configured image hosts under /media/ are fetched, so
 * this can't be used to reach other sites. Responses are cached by the CDN.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (!isAllowedMedia(target)) return new Response("Not allowed", { status: 403 });

  const upstream = await fetchMedia(target);
  const problem = mediaProblem(upstream);
  if (problem !== null || typeof upstream === "string") {
    // The reason helps diagnose deployments (firewall, redirects); it contains no secrets.
    return new Response(`Image unavailable: ${problem}`, {
      status: 502,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      // Browsers keep it a day; the CDN keeps it a month and refreshes in the background.
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
