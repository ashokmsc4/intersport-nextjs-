import { NextResponse } from "next/server";
import { fetchMedia, mediaProblem } from "@/lib/media-fetch";
import { backendHeaders, isWafChallenge } from "@/lib/magento/backend-headers";

export const dynamic = "force-dynamic";

/**
 * Deployment check: which Magento settings this server sees and whether the
 * backend answers. Reports no secrets (only whether optional values are set).
 */
export async function GET() {
  const base = (process.env.MAGENTO_BASE_URL ?? "").replace(/\/$/, "");
  const store = process.env.MAGENTO_STORE_CODE_EN ?? "intersport_en";
  const settingsPath = process.env.MAGENTO_APP_SETTINGS_PATH ?? "/media/mobile-app/intersport";
  const userAgent = process.env.MAGENTO_USER_AGENT;
  const accessHeader = Boolean(
    process.env.MAGENTO_ACCESS_HEADER_NAME && process.env.MAGENTO_ACCESS_HEADER_VALUE,
  );

  const probe = async (url: string) => {
    const started = Date.now();
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json", ...backendHeaders() },
        signal: AbortSignal.timeout(20000),
      });
      const type = res.headers.get("content-type") ?? "";
      const json = type.includes("json");
      const body = json ? "" : await res.text().catch(() => "");
      return {
        status: res.status,
        ok: res.ok && json,
        ms: Date.now() - started,
        contentType: type,
        ...(isWafChallenge(body) ? { blockedBy: "AWS WAF bot check (Human Verification page)" } : {}),
      };
    } catch (error) {
      const e = error as Error & { cause?: { code?: string } };
      return { status: 0, ok: false, ms: Date.now() - started, error: [e.message, e.cause?.code].filter(Boolean).join(": ") };
    }
  };

  const media = async (url: string) => {
    const started = Date.now();
    const res = await fetchMedia(new URL(url));
    const problem = mediaProblem(res);
    return {
      ok: problem === null,
      ms: Date.now() - started,
      ...(problem ? { problem } : {}),
    };
  };

  const checks = base
    ? {
        settings: await probe(`${base}${settingsPath}/${store}/settings/config.json`),
        rest: await probe(`${base}/rest/${store}/V1/aaw/arealist`),
        // One image from the Magento host and one from the banner CDN.
        productImage: await media(`${base}/media/catalog/category/INT-CATEGORY_APP-SPORTS_copy.png`),
        bannerImage: await media(
          "https://static.aawweb.com/media/weltpixel/owlcarouselslider/images/r/u/running.jpg",
        ),
      }
    : null;

  const blocked = checks && [checks.settings, checks.rest].some((c) => "blockedBy" in c);
  // The address Magento sees, for the hosting team's firewall logs (it can change between requests).
  const outboundIp = await fetch("https://api.ipify.org", { cache: "no-store", signal: AbortSignal.timeout(3000) })
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);

  return NextResponse.json({
    magentoBaseUrl: base || "(not set)",
    storeCodes: { en: store, ar: process.env.MAGENTO_STORE_CODE_AR ?? "intersport_ar" },
    userAgentSet: Boolean(userAgent),
    accessHeaderSet: accessHeader,
    outboundIp,
    region: process.env.VERCEL_REGION ?? null,
    imageProxy: process.env.IMAGE_PROXY ?? (process.env.VERCEL === "1" ? "on (Vercel)" : "off"),
    checks,
    hint: !base
      ? "Set MAGENTO_BASE_URL and redeploy."
      : blocked
        ? "Magento's AWS WAF serves this server its bot check. Ask the hosting team to allow requests that carry a secret header, then set MAGENTO_ACCESS_HEADER_NAME and MAGENTO_ACCESS_HEADER_VALUE and redeploy."
        : checks && !checks.rest.ok && checks.rest.status === 403
        ? "Magento's firewall rejected this server (403): set MAGENTO_USER_AGENT, or ask the hosting team to allow this server."
        : undefined,
  });
}
