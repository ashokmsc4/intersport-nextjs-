import { NextResponse } from "next/server";
import { getCartCount, getCustomerName } from "@/lib/session";

/**
 * Shopper's first name and cart count for the header. Read in the browser so
 * pages themselves don't depend on cookies and can be cached on the CDN.
 */
export async function GET() {
  const [name, count] = await Promise.all([getCustomerName(), getCartCount()]);
  return NextResponse.json(
    { name: name ?? null, count },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
