import { NextResponse } from "next/server";
import { hasLocale } from "@/i18n/config";
import { getSuggestions } from "@/lib/magento/suggest";

/** Search-as-you-type results for the search box: `/api/suggest?q=&lang=`. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const lang = params.get("lang") ?? "en";
  if (!hasLocale(lang) || q.length < 2) {
    return NextResponse.json({ products: [], categories: [], total: 0 });
  }
  const suggestions = await getSuggestions(lang, q);
  return NextResponse.json(suggestions, {
    // Same query, same answer: browsers and the CDN reuse it for a few minutes.
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
