import "server-only";
import type { Locale } from "@/i18n/config";
import { magentoRest } from "./client";

export type PickupStore = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  hoursToday: string;
  qty: number;
};

type Availability = {
  home_delivery: number;
  items: {
    qty: number;
    location: {
      id: number | string;
      name: string;
      address: string;
      city: string;
      phone: string;
      working_time_today?: string;
      freepickupstatus?: boolean;
    };
  }[];
};

/**
 * Stores that hold stock for a product (for a size: the child product id) and
 * whether it can be home-delivered (Amasty store pickup, `storepickup_msi`).
 */
export async function getPickupAvailability(locale: Locale, productId: string) {
  const data = await magentoRest<Availability>(
    `V1/storepickup_msi/${encodeURIComponent(productId)}/getAvailabilityByProduct`,
    { locale, noStore: true },
  );
  const stores: PickupStore[] = data.items
    .filter((i) => i.qty > 0 && i.location.freepickupstatus !== false)
    .map((i) => ({
      id: String(i.location.id),
      name: i.location.name,
      address: i.location.address,
      city: i.location.city,
      phone: i.location.phone,
      hoursToday: i.location.working_time_today ?? "",
      qty: i.qty,
    }));
  return { homeDelivery: data.home_delivery === 1, stores };
}
