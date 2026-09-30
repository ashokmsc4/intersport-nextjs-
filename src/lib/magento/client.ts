import "server-only";
import type { Locale } from "@/i18n/config";
import { MAGENTO_BASE_URL } from "@/lib/base-url";
import { WAF_MESSAGE, backendHeaders, isWafChallenge } from "./backend-headers";

const BASE_URL = MAGENTO_BASE_URL;
const REVALIDATE = Number(process.env.MAGENTO_REVALIDATE_SECONDS ?? 300);
const SETTINGS_PATH =
  process.env.MAGENTO_APP_SETTINGS_PATH ?? "/media/mobile-app/intersport";
const SETTINGS_VERSION = process.env.MAGENTO_APP_SETTINGS_VERSION ?? "";

const storeCodes: Record<Locale, string> = {
  en: process.env.MAGENTO_STORE_CODE_EN ?? "intersport_en",
  ar: process.env.MAGENTO_STORE_CODE_AR ?? "intersport_ar",
};

export const storeCode = (locale: Locale) => storeCodes[locale];

/** Magento messages use %1 / %name placeholders filled from `parameters`. */
function fillParameters(
  message: string,
  parameters?: Record<string, string> | string[],
) {
  if (!parameters) return message;
  const values: Record<string, string> = Array.isArray(parameters)
    ? Object.fromEntries(parameters.map((v, i) => [String(i + 1), v]))
    : parameters;
  return message.replace(/%(\w+)/g, (match, key) => values[key] ?? match);
}

/** Error from the Magento API; `message` is safe to show to shoppers. */
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
  /** Never cache (carts, checkout); implied for customer requests and non-GETs. */
  noStore?: boolean;
};

async function request<T>(url: string, init: RequestInit): Promise<T> {
  if (!BASE_URL) throw new MagentoError("MAGENTO_BASE_URL is not set");

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      ...backendHeaders(),
    },
  });
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  if (!res.ok || !isJson) {
    let message = `Magento responded ${res.status}`;
    if (isJson) {
      try {
        const body = (await res.json()) as {
          message?: string;
          parameters?: Record<string, string> | string[];
        };
        if (body.message) message = fillParameters(body.message, body.parameters);
      } catch {
        // Unreadable error body; keep the status-only message.
      }
    } else {
      // An HTML page instead of JSON: the firewall's bot check, or an error page.
      const body = await res.text().catch(() => "");
      message = isWafChallenge(body)
        ? WAF_MESSAGE
        : `Magento returned a web page instead of data (${res.status})`;
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
    noStore = false,
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

  const cacheable = method === "GET" && auth.type !== "customer" && !noStore;
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
 * Reads a JSON endpoint of the Magento storefront (outside /rest), e.g. the search
 * autocomplete. Cached like REST GETs; gives up after `timeoutMs`.
 */
export function magentoStorefront<T>(
  path: string,
  {
    query,
    timeoutMs = 5000,
    tags,
  }: { query?: URLSearchParams; timeoutMs?: number; tags?: string[] } = {},
): Promise<T> {
  const qs = query?.toString();
  return request<T>(`${BASE_URL}/${path.replace(/^\//, "")}${qs ? `?${qs}` : ""}`, {
    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: REVALIDATE, tags },
  });
}

// Backend-only hosts some endpoints put in image URLs (e.g. admin.uat.aawweb.com).
const BACKEND_MEDIA_HOSTS = (process.env.MAGENTO_BACKEND_MEDIA_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const baseHost = (() => {
  try {
    return new URL(BASE_URL).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
})();

/**
 * Where browsers load Magento media from. Production's own host has hotlink
 * protection, so its /media files are served from the CDN (static.aawweb.com)
 * unless MAGENTO_MEDIA_URL says otherwise.
 */
export const MEDIA_URL = (
  process.env.MAGENTO_MEDIA_URL ||
  (baseHost === "intersport.com.kw" ? "https://static.aawweb.com" : BASE_URL)
).replace(/\/$/, "");

/**
 * Absolute URL for a Magento image: a catalog path such as `/p/h/file.jpg`, or a
 * full URL. URLs on the storefront host or a backend-only host are moved to
 * MEDIA_URL; CDN URLs (prod.aaw.com, static.aawweb.com) are kept as they are.
 * Browsers load them directly, without a Referer (see ProductImage).
 */
export function productImageUrl(file: string | null | undefined) {
  if (!file) return null;
  if (/^https?:\/\//.test(file)) {
    const url = new URL(file);
    const host = url.hostname.replace(/^www\./, "");
    const move =
      url.hostname.startsWith("admin.") ||
      BACKEND_MEDIA_HOSTS.includes(url.hostname) ||
      (host === baseHost && url.pathname.startsWith("/media/"));
    return MEDIA_URL && move ? `${MEDIA_URL}${url.pathname}` : file;
  }
  return `${MEDIA_URL}/media/catalog/product${file.startsWith("/") ? "" : "/"}${file}`;
}
