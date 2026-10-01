import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { categoryIdForPath, pathForCategoryId } from "@/lib/category-paths";
import { SEO_REWRITE_HEADER } from "@/lib/seo";

function preferredLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && hasLocale(cookie)) return cookie;

  const accept = request.headers.get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("ar") ? "ar" : defaultLocale;
}

/** Serves an SEO URL from an internal route, keeping the address the shopper sees. */
function rewrite(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const headers = new Headers(request.headers);
  headers.set(SEO_REWRITE_HEADER, "1");
  return NextResponse.rewrite(url, { request: { headers } });
}

/**
 * - SEO URLs, as on the Magento website: /en/<category/path>.html → category page,
 *   /en/<url_key>.html → product page.
 * - Magento's own URLs have no locale (/men.html): they move permanently to /en/....
 * - Old /en/category/<id> links move permanently to the category's SEO URL.
 * - Any other path without a locale is sent to the shopper's language.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "";

  if (!hasLocale(first)) {
    const url = request.nextUrl.clone();
    if (pathname.endsWith(".html")) {
      url.pathname = `/${defaultLocale}${pathname}`;
      return NextResponse.redirect(url, 301);
    }
    url.pathname = `/${preferredLocale(request)}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Old /en/category/<id> links: permanently to the category's SEO URL (query kept).
  if (segments[1] === "category" && /^\d+$/.test(segments[2] ?? "") && segments.length === 3) {
    const path = await pathForCategoryId(first, Number(segments[2]));
    if (path) {
      const url = request.nextUrl.clone();
      url.pathname = `/${first}/${path}.html`;
      return NextResponse.redirect(url, 301);
    }
  }

  if (pathname.endsWith(".html") && segments.length > 1) {
    const path = decodeURIComponent(segments.slice(1).join("/").slice(0, -".html".length));
    const categoryId = await categoryIdForPath(first, path);
    if (categoryId) return rewrite(request, `/${first}/category/${categoryId}`);
    if (segments.length === 2) return rewrite(request, `/${first}/product/${encodeURIComponent(path)}`);
  }
}

export const config = {
  // Skip Next internals, API routes and static files (but not .html: those are SEO URLs).
  matcher: ["/((?!_next|api|.*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|txt|xml|js|css|map|json|woff2?)$).*)"],
};
