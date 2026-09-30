import "server-only";
import { magentoStorefront, productImageUrl } from "./client";

/**
 * Size conversions and size guides come from the website's own widgets
 * (Aaw_SizeRegionMap and the size chart module); the REST API has neither.
 */

export type SizeRegion = {
  code: string;
  label: string;
  /** Size label as stored on the product (the default region) -> label in this region. */
  sizes: Record<string, string>;
};

export type SizeRegions = { regions: SizeRegion[]; selected: string };

type RegionData = {
  defaultRegionSelected?: string;
  sizeRegions?: { region: string; label: string; sortOrder: string; terms: Record<string, string> | [] }[];
};

/** US / UK / EU labels for a configurable product's sizes, or null when it has no size map. */
export async function getSizeRegions(productId: string): Promise<SizeRegions | null> {
  const { output } = await magentoStorefront<{ output?: string }>(
    "sizemapregion/sizemapregion/render/",
    { query: new URLSearchParams({ product_id: productId }), timeoutMs: 4000, tags: [`sizes:${productId}`] },
  );
  const json = output?.match(/<script type="text\/x-magento-init">([\s\S]*?)<\/script>/)?.[1];
  if (!json) return null;
  const init = JSON.parse(json) as Record<string, Record<string, { data?: RegionData }>>;
  const data = Object.values(init["*"] ?? {})[0]?.data;
  const regions = (data?.sizeRegions ?? [])
    .filter((r) => r.terms && !Array.isArray(r.terms) && Object.keys(r.terms).length > 0)
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((r) => ({
      code: r.region,
      label: r.label,
      // Keys are the base64 of the product's own size label.
      sizes: Object.fromEntries(
        Object.entries(r.terms as Record<string, string>).map(([k, v]) => [
          Buffer.from(k, "base64").toString("utf8"),
          v,
        ]),
      ),
    }));
  if (regions.length < 2) return null;
  const selected = regions.some((r) => r.code === data?.defaultRegionSelected)
    ? data!.defaultRegionSelected!
    : regions[0].code;
  return { regions, selected };
}

/** The size guide's HTML (tables, styles and its tab script), or null when there is none. */
export async function getSizeGuideHtml(productId: string): Promise<string | null> {
  const { output } = await magentoStorefront<{ output?: string }>("sizechart/sizechart/render/", {
    query: new URLSearchParams({ product_id: productId }),
    timeoutMs: 4000,
    tags: [`sizes:${productId}`],
  });
  if (!output || !output.includes("<table")) return null;
  return (
    output
      // The popup script needs the website's jQuery/RequireJS; the page shows the guide itself.
      .replace(/<script[^>]*>\s*require\([\s\S]*?<\/script>/g, "")
      // Images load from the media CDN (backend hosts rewritten).
      .replace(/(<img[^>]+src=")(https?:\/\/[^"]+)"/g, (_, head: string, src: string) => {
        const url = productImageUrl(src.replace(/&amp;/g, "&")) ?? src;
        return `${head}${url.replace(/&/g, "&amp;")}"`;
      })
  );
}
