"use client";

import { useActionState, useState, useTransition } from "react";
import { addToCartAction, pickupAvailabilityAction, type CartActionState } from "@/app/actions/cart";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import type { PickupStore } from "@/lib/magento/pickup";
import { buttonClass } from "./forms/Field";
import { useCartDrawer } from "./cart/CartDrawer";

export type SizeChoice = {
  /** Child product id: store stock is per size. */
  productId: string;
  sku: string;
  label: string;
  available: boolean;
  /** Configurable options (colour + size) identifying this child. */
  options: { option_id: string; option_value: number }[];
};

type Availability = { homeDelivery: boolean; stores: PickupStore[] };

export function AddToCart({
  locale,
  sku,
  productId,
  sizes,
  inStock,
  initialAvailability,
  dict,
}: {
  locale: string;
  /** Product SKU: the parent for configurable products. */
  sku: string;
  productId: string;
  sizes: SizeChoice[];
  inStock: boolean;
  /** Preloaded for simple products; sized products load it per size. */
  initialAvailability: Availability | null;
  dict: Pick<Dictionary, "product" | "errors" | "delivery">;
}) {
  const { openCart } = useCartDrawer();
  const [state, action, pending] = useActionState(
    async (prev: CartActionState, form: FormData) => {
      const result = await addToCartAction(prev, form);
      if (result?.ok) openCart({ added: true });
      return result;
    },
    undefined,
  );
  const hasSizes = sizes.length > 0;
  const [selected, setSelected] = useState<SizeChoice | null>(
    sizes.length === 1 && sizes[0].available ? sizes[0] : null,
  );
  const [availability, setAvailability] = useState<Availability | null>(initialAvailability);
  const [loadingStores, startLoading] = useTransition();
  const homeAllowed = availability?.homeDelivery ?? true;
  const [mode, setMode] = useState<"home" | "pickup">(homeAllowed ? "home" : "pickup");
  const [storeId, setStoreId] = useState("");
  const t = dict.product;
  const d = dict.delivery;

  const loadStores = (id: string) =>
    startLoading(async () => {
      const result = await pickupAvailabilityAction(locale, id);
      setAvailability(result);
      setStoreId((current) => (result?.stores.some((s) => s.id === current) ? current : ""));
      if (result && !result.homeDelivery) setMode("pickup");
    });

  const chooseSize = (size: SizeChoice) => {
    setSelected(size);
    if (mode === "pickup") loadStores(size.productId);
  };

  const chooseMode = (next: "home" | "pickup") => {
    setMode(next);
    const id = hasSizes ? selected?.productId : productId;
    if (next === "pickup" && id && (hasSizes || !availability)) loadStores(id);
  };

  const stores = availability?.stores ?? [];
  const needsStore = mode === "pickup" && !storeId;
  const sizeMissing = hasSizes && !selected;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sku" value={hasSizes ? (selected?.sku ?? "") : sku} />
      <input type="hidden" name="sourceCode" value={mode === "pickup" ? storeId : "home_delivery"} />
      {hasSizes && selected && (
        <>
          <input type="hidden" name="parentSku" value={sku} />
          <input type="hidden" name="options" value={JSON.stringify(selected.options)} />
        </>
      )}

      {hasSizes && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t.size}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size.sku}
                type="button"
                disabled={!size.available}
                aria-pressed={selected?.sku === size.sku}
                onClick={() => chooseSize(size)}
                className="min-w-12 rounded border border-neutral-300 px-3 py-2 text-sm aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white disabled:border-neutral-200 disabled:text-neutral-400 disabled:line-through"
              >
                {size.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {inStock && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">{d.title}</legend>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${mode === "home" ? "border-brand" : "border-neutral-300"} ${homeAllowed ? "" : "opacity-50"}`}
          >
            <input
              type="radio"
              name="deliveryMode"
              checked={mode === "home"}
              disabled={!homeAllowed}
              onChange={() => chooseMode("home")}
              className="mt-1"
            />
            <span>
              <span className="block font-semibold">{d.home}</span>
              <span className="text-xs text-neutral-600">{homeAllowed ? d.homeNote : d.homeUnavailable}</span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${mode === "pickup" ? "border-brand" : "border-neutral-300"}`}
          >
            <input
              type="radio"
              name="deliveryMode"
              checked={mode === "pickup"}
              onChange={() => chooseMode("pickup")}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="block font-semibold">{d.pickup}</span>
              <span className="text-xs text-neutral-600">{d.pickupNote}</span>
            </span>
          </label>

          {mode === "pickup" && (
            <div className="ps-2" aria-live="polite">
              {sizeMissing ? (
                <p className="text-sm text-neutral-600">{d.chooseSizeFirst}</p>
              ) : loadingStores ? (
                <p className="text-sm text-neutral-600">{d.loadingStores}</p>
              ) : stores.length === 0 ? (
                <p className="text-sm text-brand-accent">{d.noStores}</p>
              ) : (
                <ul className="flex flex-col gap-2" role="radiogroup" aria-label={d.chooseStore}>
                  {stores.map((store) => (
                    <li key={store.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded border p-3 text-sm ${storeId === store.id ? "border-brand bg-blue-50" : "border-neutral-200"}`}
                      >
                        <input
                          type="radio"
                          name="store"
                          value={store.id}
                          checked={storeId === store.id}
                          onChange={() => setStoreId(store.id)}
                          className="mt-1"
                        />
                        <span className="flex-1">
                          <span className="block font-semibold">{store.name}</span>
                          <span className="block text-xs text-neutral-600">
                            {store.address}, {store.city}
                          </span>
                          {store.hoursToday && (
                            <span className="block text-xs text-neutral-600">
                              {d.today.replace("{hours}", store.hoursToday)}
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-medium text-green-700">
                          {d.inStock.replace("{qty}", String(store.qty))}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </fieldset>
      )}

      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{t.quantity}</span>
          <select name="qty" defaultValue="1" className="rounded border border-neutral-300 px-3 py-3">
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!inStock || pending || sizeMissing || needsStore}
          className={`${buttonClass} flex-1`}
        >
          {!inStock
            ? t.outOfStock
            : pending
              ? t.adding
              : sizeMissing
                ? t.chooseSize
                : needsStore
                  ? d.chooseStore
                  : t.addToCart}
        </button>
      </div>

      {state?.ok === false && (
        <p role="alert" className="text-sm text-brand-accent">
          {errorText(dict, state.error)}
        </p>
      )}
    </form>
  );
}
