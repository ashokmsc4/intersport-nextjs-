"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { addToCartAction, pickupAvailabilityAction, type CartActionState } from "@/app/actions/cart";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import type { PickupStore } from "@/lib/magento/pickup";
import type { SizeRegions } from "@/lib/magento/sizes";
import { useCartDrawer } from "./cart/CartDrawer";
import { CartIcon, HomeIcon, PinIcon } from "./icons";
import { SizeGuide } from "./product/SizeGuide";
import { StorePicker } from "./product/StorePicker";

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

const MAX_QTY = 10;

const headingClass = "text-sm font-bold uppercase tracking-wider";
const pillClass = (ok: boolean) =>
  `shrink-0 rounded px-3 py-1.5 text-xs font-semibold ${ok ? "bg-green-50 text-green-800" : "bg-neutral-100 text-neutral-500"}`;

export function AddToCart({
  locale,
  sku,
  productId,
  name,
  image,
  imageOptimized,
  color,
  sizes,
  sizeRegions,
  hasSizeGuide,
  inStock,
  dict,
}: {
  locale: string;
  /** Product SKU: the parent for configurable products. */
  sku: string;
  productId: string;
  name: string;
  image: string | null;
  /** Whether `image` goes through the image optimizer (decided on the server). */
  imageOptimized: boolean;
  color?: string;
  sizes: SizeChoice[];
  /** US / UK / EU labels, when the product has a size map. */
  sizeRegions: SizeRegions | null;
  hasSizeGuide: boolean;
  inStock: boolean;
  dict: Pick<Dictionary, "product" | "errors" | "delivery">;
}) {
  const { openCart, startAdding, addFailed } = useCartDrawer();
  const [state, action, pending] = useActionState(
    async (prev: CartActionState, form: FormData) => {
      const result = await addToCartAction(prev, form);
      if (result?.ok) openCart({ added: true });
      else addFailed();
      return result;
    },
    undefined,
  );
  const hasSizes = sizes.length > 0;
  const [selected, setSelected] = useState<SizeChoice | null>(
    sizes.length === 1 && sizes[0].available ? sizes[0] : null,
  );
  const [region, setRegion] = useState(sizeRegions?.selected ?? "");
  const [qty, setQty] = useState(1);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingStores, startLoading] = useTransition();
  const [mode, setMode] = useState<"home" | "pickup">("home");
  const [storeId, setStoreId] = useState("");
  const [picking, setPicking] = useState(false);
  const t = dict.product;
  const d = dict.delivery;

  // Store stock is live data, so it's loaded here rather than cached with the page.
  const loadStores = useCallback(
    (id: string) =>
      startLoading(async () => {
        const result = await pickupAvailabilityAction(locale, id);
        setAvailability(result);
        // Keep the chosen store if it has this size too; otherwise suggest the first one.
        setStoreId((current) =>
          result?.stores.some((s) => s.id === current) ? current : (result?.stores[0]?.id ?? ""),
        );
        if (result && !result.homeDelivery && result.stores.length) setMode("pickup");
        if (result && !result.stores.length) setMode("home");
      }),
    [locale],
  );

  const firstId = hasSizes ? selected?.productId : productId;
  useEffect(() => {
    if (inStock && firstId) loadStores(firstId);
    // Only for the initial product / preselected size; later sizes load on click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regionData = sizeRegions?.regions.find((r) => r.code === region);
  const sizeLabel = (size: SizeChoice) => regionData?.sizes[size.label] ?? size.label;

  const chooseSize = (size: SizeChoice) => {
    setSelected(size);
    loadStores(size.productId);
  };

  const stores = availability?.stores ?? [];
  const store = stores.find((s) => s.id === storeId);
  const homeAllowed = availability?.homeDelivery ?? true;
  const pickupAllowed = !availability || stores.length > 0;
  const sizeMissing = hasSizes && !selected;
  const needsStore = mode === "pickup" && !store;

  return (
    <form
      action={action}
      // Show the drawer straight away (outside the action, so React doesn't hold the
      // update until Magento answers, which can take seconds).
      onSubmit={() =>
        startAdding({ name, image, imageOptimized, size: selected ? sizeLabel(selected) : undefined, qty })
      }
      className="flex flex-col gap-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sku" value={hasSizes ? (selected?.sku ?? "") : sku} />
      <input type="hidden" name="sourceCode" value={mode === "pickup" ? storeId : "home_delivery"} />
      <input type="hidden" name="qty" value={qty} />
      {hasSizes && selected && (
        <>
          <input type="hidden" name="parentSku" value={sku} />
          <input type="hidden" name="options" value={JSON.stringify(selected.options)} />
        </>
      )}

      {hasSizes && (
        <fieldset className="flex flex-col gap-4">
          <legend className={`${headingClass} mb-4`}>
            {t.size}
            {selected && <span className="ms-4 font-normal normal-case tracking-normal">{sizeLabel(selected)}</span>}
          </legend>

          {sizeRegions && (
            <div className="flex gap-2" role="radiogroup" aria-label={t.sizeSystem}>
              {sizeRegions.regions.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  role="radio"
                  aria-checked={region === r.code}
                  onClick={() => setRegion(r.code)}
                  className="min-w-14 rounded border border-neutral-300 px-4 py-2 text-sm aria-checked:border-black aria-checked:bg-black aria-checked:text-white"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {sizes.map((size) => (
              <button
                key={size.sku}
                type="button"
                disabled={!size.available}
                aria-pressed={selected?.sku === size.sku}
                onClick={() => chooseSize(size)}
                className="rounded border border-neutral-200 px-2 py-3 text-sm font-medium outline-offset-2 hover:border-neutral-500 aria-pressed:border-black aria-pressed:bg-black aria-pressed:text-white aria-pressed:outline aria-pressed:outline-1 aria-pressed:outline-black disabled:text-neutral-300 disabled:line-through disabled:hover:border-neutral-200"
              >
                {sizeLabel(size)}
              </button>
            ))}
          </div>

          {hasSizeGuide && <SizeGuide productId={productId} label={t.sizeGuide} closeLabel={d.close} />}
        </fieldset>
      )}

      {inStock && (
        <fieldset className="flex flex-col gap-4">
          <legend className={`${headingClass} mb-4`}>{d.title}</legend>

          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 sm:gap-4 sm:px-5 sm:py-5 ${mode === "home" ? "border-brand bg-neutral-50" : "border-neutral-200"} ${homeAllowed ? "" : "cursor-not-allowed opacity-50"}`}
          >
            <input
              type="radio"
              name="deliveryMode"
              checked={mode === "home"}
              disabled={!homeAllowed}
              onChange={() => setMode("home")}
              className="size-5 accent-black"
            />
            <HomeIcon />
            <span className="min-w-0 flex-1 font-semibold tracking-wide">{d.home}</span>
            <span className={pillClass(homeAllowed)}>{homeAllowed ? d.available : d.unavailable}</span>
          </label>

          <div
            className={`flex items-start gap-3 rounded-xl border-2 p-4 sm:gap-4 sm:px-5 sm:py-5 ${mode === "pickup" ? "border-brand bg-neutral-50" : "border-neutral-200"} ${pickupAllowed ? "" : "opacity-50"}`}
          >
            <input
              id="delivery-pickup"
              type="radio"
              name="deliveryMode"
              aria-label={d.pickup}
              checked={mode === "pickup"}
              disabled={!store}
              onChange={() => setMode("pickup")}
              className="mt-8 size-5 accent-black"
            />
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="delivery-pickup" className="cursor-pointer font-semibold tracking-wide">
                {d.pickup}
              </label>
              <div className="flex items-center gap-3">
                <PinIcon />
                <label htmlFor="delivery-pickup" className="flex-1 cursor-pointer text-sm font-medium" aria-live="polite">
                  {sizeMissing
                    ? d.chooseSizeFirst
                    : loadingStores
                      ? d.loadingStores
                      : store
                        ? d.pickupFromStore.replace("{store}", store.name)
                        : availability
                          ? d.noStores
                          : d.pickupAnyStore}
                </label>
                {!sizeMissing && !loadingStores && availability && (
                  <span className={pillClass(Boolean(store))}>{store ? d.available : d.unavailable}</span>
                )}
              </div>
              {store && !loadingStores && (
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="self-start text-sm font-semibold text-brand underline underline-offset-4"
                >
                  {d.checkOtherStores}
                </button>
              )}
            </div>
          </div>
        </fieldset>
      )}

      <div className="flex flex-col items-center gap-3">
        <span id="qty-label" className={headingClass}>
          {t.quantity}
        </span>
        <div
          role="group"
          aria-labelledby="qty-label"
          className="flex items-center rounded border-2 border-neutral-200"
        >
          <button
            type="button"
            aria-label={t.decrease}
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-4 py-2 text-2xl leading-none disabled:text-neutral-300"
          >
            −
          </button>
          <output aria-live="polite" className="min-w-10 text-center text-lg">
            {qty}
          </output>
          <button
            type="button"
            aria-label={t.increase}
            disabled={qty >= MAX_QTY}
            onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
            className="px-4 py-2 text-2xl leading-none disabled:text-neutral-300"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!inStock || pending || sizeMissing || needsStore}
        className="flex items-center justify-center gap-3 rounded-md bg-brand px-4 py-4 text-lg font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        <CartIcon />
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

      {state?.ok === false && (
        <p role="alert" className="text-sm text-brand-accent">
          {errorText(dict, state.error)}
        </p>
      )}

      {picking && (
        <StorePicker
          stores={stores}
          current={storeId}
          summary={{
            name,
            image,
            imageOptimized,
            color,
            size: selected ? sizeLabel(selected) : undefined,
            qty,
          }}
          dict={{ ...d, size: t.size, color: t.color }}
          onClose={() => setPicking(false)}
          onChoose={(id) => {
            setStoreId(id);
            setMode("pickup");
            setPicking(false);
          }}
        />
      )}
    </form>
  );
}
