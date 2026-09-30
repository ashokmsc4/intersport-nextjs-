import { imageHosts } from "@/lib/media";

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
  if (
    target.protocol !== "https:" ||
    !imageHosts().includes(target.hostname) ||
    !target.pathname.startsWith("/media/")
  ) {
    return new Response("Not allowed", { status: 403 });
  }

  const userAgent = process.env.MAGENTO_USER_AGENT;
  const upstream = await fetch(target, {
    headers: {
      Accept: "image/avif,image/webp,image/*",
      ...(userAgent ? { "User-Agent": userAgent } : {}),
    },
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);

  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream || !upstream.ok || !type.startsWith("image/")) {
    return new Response("Image unavailable", {
      status: upstream && !upstream.ok ? upstream.status : 502,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      // Browsers keep it a day; the CDN keeps it a month and refreshes in the background.
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
