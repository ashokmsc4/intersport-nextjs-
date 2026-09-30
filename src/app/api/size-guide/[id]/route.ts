import { getSizeGuideHtml } from "@/lib/magento/sizes";

const CSS = `
  body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; color: #111; }
  .pschart-sizechart-link-close, .close, .pschart-sizechart-link { display: none !important; }
  .pschart-popup, .pschart-popup-internal, .pschart-content { position: static !important; margin: 0 !important; width: auto !important; height: auto !important; max-width: none !important; }
  table { border-collapse: collapse; overflow-x: auto; max-width: 100%; }
  td, th { border: 1px solid #ddd; }
  img { max-width: 160px; height: auto; }
`;

/**
 * The product's size guide as a standalone page, shown in a sandboxed frame on the
 * product page: its styles and tab script come from Magento and must not touch the site.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/size-guide/[id]">) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response("Not found", { status: 404 });
  const html = await getSizeGuideHtml(id).catch(() => null);
  if (!html) return new Response("Not found", { status: 404 });

  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${CSS}</style></head><body>${html}</body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Opaque origin even if opened directly; only inline styles/scripts and our image route.
        "Content-Security-Policy":
          "sandbox allow-scripts; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    },
  );
}
