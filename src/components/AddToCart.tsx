"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addToCartAction } from "@/app/actions/cart";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import { buttonClass } from "./forms/Field";

export type SizeChoice = {
  sku: string;
  label: string;
  available: boolean;
  /** Configurable options (colour + size) identifying this child. */
  options: { option_id: string; option_value: number }[];
};

export function AddToCart({
  locale,
  sku,
  sizes,
  inStock,
  dict,
}: {
  locale: string;
  /** Product SKU: the parent for configurable products. */
  sku: string;
  sizes: SizeChoice[];
  inStock: boolean;
  dict: Pick<Dictionary, "product" | "errors">;
}) {
  const [state, action, pending] = useActionState(addToCartAction, undefined);
  const [selected, setSelected] = useState<SizeChoice | null>(
    sizes.length === 1 && sizes[0].available ? sizes[0] : null,
  );
  const t = dict.product;
  const hasSizes = sizes.length > 0;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sku" value={hasSizes ? (selected?.sku ?? "") : sku} />
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
                onClick={() => setSelected(size)}
                className="min-w-12 rounded border border-neutral-300 px-3 py-2 text-sm aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white disabled:border-neutral-200 disabled:text-neutral-400 disabled:line-through"
              >
                {size.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{t.quantity}</span>
          <select
            name="qty"
            defaultValue="1"
            className="rounded border border-neutral-300 px-3 py-3"
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!inStock || pending || (hasSizes && !selected)}
          className={`${buttonClass} flex-1`}
        >
          {!inStock
            ? t.outOfStock
            : pending
              ? t.adding
              : hasSizes && !selected
                ? t.chooseSize
                : t.addToCart}
        </button>
      </div>

      {state?.ok === true && (
        <p role="status" className="text-sm text-green-700">
          {t.added}{" "}
          <Link href={`/${locale}/cart`} className="font-semibold underline">
            {t.viewCart}
          </Link>
        </p>
      )}
      {state?.ok === false && (
        <p role="alert" className="text-sm text-brand-accent">
          {errorText(dict, state.error)}
        </p>
      )}
    </form>
  );
}
