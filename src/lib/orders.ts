import type { Order } from "@/lib/magento/customer";

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
