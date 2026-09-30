/**
 * MAGENTO_BASE_URL as an origin such as "https://www.intersport.com.kw".
 * Tolerates a pasted value with extra lines, spaces or a trailing slash by using the
 * first http(s) URL's origin; `problem` explains what was wrong (shown by /api/health).
 */
export function parseBaseUrl(raw = process.env.MAGENTO_BASE_URL ?? "") {
  const candidates = raw.split(/\s+/).filter(Boolean);
  const first = candidates.find((c) => /^https?:\/\//i.test(c));
  if (!first) {
    return { url: "", problem: raw.trim() ? "MAGENTO_BASE_URL is not an http(s) URL" : null };
  }
  let url = "";
  try {
    url = new URL(first).origin;
  } catch {
    return { url: "", problem: "MAGENTO_BASE_URL is not a valid URL" };
  }
  const problem =
    candidates.length > 1
      ? `MAGENTO_BASE_URL has ${candidates.length} values; using ${url}. Set it to a single URL.`
      : null;
  return { url, problem };
}

export const MAGENTO_BASE_URL = parseBaseUrl().url;
