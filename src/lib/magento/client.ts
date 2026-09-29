import "server-only";
import type { Locale } from "@/i18n/config";

const BASE_URL = (process.env.MAGENTO_BASE_URL ?? "").replace(/\/$/, "");
const REVALIDATE = Number(process.env.MAGENTO_REVALIDATE_SECONDS ?? 300);
const SETTINGS_PATH =
  process.env.MAGENTO_APP_SETTINGS_PATH ?? "/media/mobile-app/intersport";
const SETTINGS_VERSION = process.env.MAGENTO_APP_SETTINGS_VERSION ?? "";

const storeCodes: Record<Locale, string> = {
  en: process.env.MAGENTO_STORE_CODE_EN ?? "intersport_en",
  ar: process.env.MAGENTO_STORE_CODE_AR ?? "intersport_ar",
};

export const storeCode = (locale: Locale) => storeCodes[locale];

export class MagentoError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "MagentoError";
  }
}

type Auth =
  /** No Authorization header. */
  | { type: "none" }
  /** Integration token from MAGENTO_INTEGRATION_TOKEN, sent only when set. */
  | { type: "integration" }
  /** Logged-in customer token. Responses are never cached. */
  | { type: "customer"; token: string };

type RestOptions = {
  locale: Locale;
  auth?: Auth;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: URLSearchParams;
  headers?: Record<string, string>;
  /** Cache tags so webhooks can revalidate specific data. */
  tags?: string[];
};

async function request<T>(url: string, init: RequestInit): Promise<T> {
  if (!BASE_URL) throw new MagentoError("MAGENTO_BASE_URL is not set");

  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Magento responded ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message += `: ${body.message}`;
    } catch {
      // Non-JSON error body; keep the status-only message.
    }
    throw new MagentoError(message, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Calls the Magento REST API for the store view that matches `locale`:
 * `${MAGENTO_BASE_URL}/rest/${storeCode}/${path}`.
 * GET requests without a customer token are cached (ISR); everything else is not.
 */
export function magentoRest<T>(
  path: string,
  {
    locale,
    auth = { type: "integration" },
    method = "GET",
    body,
    query,
    headers: extraHeaders,
    tags,
  }: RestOptions,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const integrationToken = process.env.MAGENTO_INTEGRATION_TOKEN;
  if (auth.type === "integration" && integrationToken) {
    headers.Authorization = `Bearer ${integrationToken}`;
  } else if (auth.type === "customer") {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  const cacheable = method === "GET" && auth.type !== "customer";
  const qs = query?.toString();
  const url = `${BASE_URL}/rest/${storeCode(locale)}/${path.replace(/^\//, "")}${qs ? `?${qs}` : ""}`;

  return request<T>(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(cacheable
      ? { next: { revalidate: REVALIDATE, tags } }
      : { cache: "no-store" as const }),
  });
}

/**
 * Reads one of the public mobile-app settings files, e.g. `settings/config.json`
 * or `data/categories.json`. When MAGENTO_APP_SETTINGS_VERSION is set, `data/`
 * files are read from that version folder (production uses one, staging doesn't).
 */
export function magentoAppSettings<T>(
  file: string,
  { locale }: { locale: Locale },
): Promise<T> {
  const version =
    SETTINGS_VERSION && file.startsWith("data/") ? `/${SETTINGS_VERSION}` : "";
  const url = `${BASE_URL}${SETTINGS_PATH}/${storeCode(locale)}${version}/${file}`;
  return request<T>(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE, tags: [`settings:${file}`] },
  });
}

/**
 * Absolute URL for a product image path such as `/p/h/file.jpg`.
 * Some endpoints return image URLs on the Magento admin host; the same /media
 * files are served by the storefront host, so those are rewritten to it.
 */
export function productImageUrl(file: string | null | undefined) {
  if (!file) return null;
  if (/^https?:\/\//.test(file)) {
    const url = new URL(file);
    if (BASE_URL && url.hostname.startsWith("admin.")) {
      return `${BASE_URL}${url.pathname}`;
    }
    return file;
  }
  return `${BASE_URL}/media/catalog/product${file.startsWith("/") ? "" : "/"}${file}`;
}
