import "server-only";
import type { Locale } from "@/i18n/config";
import { getProductDetail, productUrlKey, skuForUrlKey } from "./catalog";
import { getSizeGuideHtml, getSizeRegions } from "./sizes";
import type { Product } from "./types";

const WARM_COUNT = 6;
const CONCURRENCY = 2;

/**
 * Loads what a product page needs (URL key lookup, details, size map, size guide) into the data cache,
 * so opening a product from a listing doesn't wait on Magento. Cache hits cost nothing;
 * failures are ignored. Two at a time, so a cold cache doesn't flood Magento.
 * Recommendations are left out: they stream in on the page.
 */
export async function warmProductPages(locale: Locale, products: Product[]) {
  const queue = products.slice(0, WARM_COUNT);
  const worker = async () => {
    for (let product = queue.shift(); product; product = queue.shift()) {
      try {
        const urlKey = productUrlKey(product);
        await Promise.all([
          getProductDetail(locale, product.sku),
          // The SEO URL (/en/<url_key>.html) is resolved to the SKU on the product page.
          urlKey ? skuForUrlKey(locale, urlKey) : null,
        ]);
        if (product.type_id === "configurable") {
          await Promise.allSettled([
            getSizeRegions(String(product.id)),
            getSizeGuideHtml(String(product.id)),
          ]);
        }
      } catch {
        // Warming is best effort.
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}
