import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// Cached pages (ISR) and Magento responses (fetch cache) live in R2, with a per-region
// in-memory layer in front. Background revalidation (stale-while-revalidate, every
// MAGENTO_REVALIDATE_SECONDS) runs through a Durable Object queue.
// No tag cache: the app sets fetch tags but never calls revalidateTag.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
});
