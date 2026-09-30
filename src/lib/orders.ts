import type { Order } from "@/lib/magento/customer";
import { formatPrice } from "@/lib/format";

/** Magento lists configurable children too; show only top-level lines. */
export const visibleItems = (order: Order) =>
  (order.items ?? []).filter((item) => !item.parent_item_id);

export const deliveryAddress = (order: Order) =>
  order.extension_attributes?.shipping_assignments?.[0]?.shipping?.address ??
  order.billing_address;

/** "pending_payment" -> "Pending payment" (Magento sends status codes). */
export const statusLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

export const formatDate = (value: string, locale: string) =>
  new Date(value.replace(" ", "T") + "Z").toLocaleDateString(
    locale === "ar" ? "ar-KW-u-nu-latn" : "en-KW",
    { year: "numeric", month: "short", day: "numeric" },
  );

/** One line of the order history, ready to display. */
export type OrderRow = { id: string; date: string; status: string; total: string };

export const toOrderRow = (order: Order, locale: string): OrderRow => ({
  id: order.increment_id,
  date: formatDate(order.created_at, locale),
  status: statusLabel(order.status),
  total: formatPrice(order.grand_total, locale as "en" | "ar"),
});
