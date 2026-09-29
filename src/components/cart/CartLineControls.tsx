"use client";

import { useActionState } from "react";
import { removeItemAction, updateQtyAction } from "@/app/actions/cart";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";

export function CartLineControls({
  locale,
  itemId,
  sku,
  qty,
  maxQty,
  sourceCode,
  dict,
}: {
  locale: string;
  itemId: string;
  sku: string;
  qty: number;
  maxQty: number;
  /** Kept on quantity updates so a Click & Collect line stays at its store. */
  sourceCode: string;
  dict: Pick<Dictionary, "cart" | "product" | "errors">;
}) {
  const [updateState, update, updating] = useActionState(updateQtyAction, undefined);
  const [removeState, remove, removing] = useActionState(removeItemAction, undefined);
  const error =
    (updateState?.ok === false && updateState.error) ||
    (removeState?.ok === false && removeState.error) ||
    "";
  const options = Math.max(qty, Math.min(10, maxQty || 10));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <form action={update}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="sku" value={sku} />
          <input type="hidden" name="sourceCode" value={sourceCode} />
          <label className="sr-only" htmlFor={`qty-${itemId}`}>
            {dict.product.quantity}
          </label>
          <select
            // Remount when the server confirms a new quantity so defaultValue applies.
            key={qty}
            id={`qty-${itemId}`}
            name="qty"
            defaultValue={String(qty)}
            disabled={updating || removing}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            {Array.from({ length: options }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </form>
        <form action={remove}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="itemId" value={itemId} />
          <button
            type="submit"
            disabled={updating || removing}
            className="text-sm text-neutral-500 underline hover:text-brand-accent"
          >
            {dict.cart.remove}
          </button>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-xs text-brand-accent">
          {errorText(dict, error)}
        </p>
      )}
    </div>
  );
}
