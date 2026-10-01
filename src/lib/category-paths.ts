/**
 * Category URL paths for proxy.ts (SEO URL → category id). Kept free of server-only
 * modules so it can run in the proxy; pages use getCategoryIndex in lib/magento/catalog.
 */
import { MAGENTO_BASE_URL } from "@/lib/base-url";

type Node = { id: number; url_key?: string; children_data?: Node[] };

/** "men/men-shoes/running-0" → 804, from the top level down (the root category is not part of it). */
export function pathsFromTree(root: Node) {
  const idByPath = new Map<string, number>();
  const pathById = new Map<number, string>();
  const walk = (node: Node, parent: string) => {
    for (const child of node.children_data ?? []) {
      const path = parent ? `${parent}/${child.url_key || child.id}` : `${child.url_key || child.id}`;
      pathById.set(child.id, path);
      if (!idByPath.has(path)) idByPath.set(path, child.id);
      walk(child, path);
    }
  };
  walk(root, "");
  return { idByPath, pathById };
}

const TTL_MS = 10 * 60 * 1000;
type Paths = ReturnType<typeof pathsFromTree>;
const empty = (): Paths => ({ idByPath: new Map(), pathById: new Map() });
const loaded = new Map<string, { at: number; paths: Promise<Paths> }>();

function settingsUrl(locale: string) {
  const store =
    locale === "ar"
      ? (process.env.MAGENTO_STORE_CODE_AR ?? "intersport_ar")
      : (process.env.MAGENTO_STORE_CODE_EN ?? "intersport_en");
  const base = process.env.MAGENTO_APP_SETTINGS_PATH ?? "/media/mobile-app/intersport";
  const version = process.env.MAGENTO_APP_SETTINGS_VERSION;
  return `${MAGENTO_BASE_URL}${base}/${store}${version ? `/${version}` : ""}/data/categories.json`;
}

async function fetchPaths(locale: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.MAGENTO_USER_AGENT) headers["User-Agent"] = process.env.MAGENTO_USER_AGENT;
  const name = process.env.MAGENTO_ACCESS_HEADER_NAME?.trim();
  const value = process.env.MAGENTO_ACCESS_HEADER_VALUE?.trim();
  if (name && value) headers[name] = value;
  const res = await fetch(settingsUrl(locale), { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`categories.json ${res.status}`);
  return pathsFromTree((await res.json()) as Node);
}

/** Category paths for a locale; refreshed every 10 minutes, keeping the last good copy on errors. */
function pathsFor(locale: string): Promise<Paths> {
  const now = Date.now();
  let entry = loaded.get(locale);
  if (!entry || now - entry.at > TTL_MS) {
    const previous = entry?.paths;
    const paths = fetchPaths(locale).catch((error) => {
      console.error("[seo] category paths:", error);
      loaded.delete(locale);
      return previous ?? empty();
    });
    entry = { at: now, paths };
    loaded.set(locale, entry);
  }
  return entry.paths;
}

export async function categoryIdForPath(locale: string, path: string) {
  return (await pathsFor(locale)).idByPath.get(path) ?? null;
}

export async function pathForCategoryId(locale: string, id: number) {
  return (await pathsFor(locale)).pathById.get(id) ?? null;
}
