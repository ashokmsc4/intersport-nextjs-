import type { SavedAddress } from "@/lib/magento/customer";

/** One-line summary of a saved Kuwait address. */
export function addressLine(a: SavedAddress, labels: { block: string; house: string }) {
  return [
    `${labels.block} ${a.block}`,
    a.street,
    a.address_line_1,
    a.building_number && `${labels.house} ${a.building_number}`,
    a.city,
    a.region,
  ]
    .filter(Boolean)
    .join(", ");
}
