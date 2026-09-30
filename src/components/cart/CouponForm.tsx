"use client";

import { useActionState, useEffect, useRef } from "react";
import { couponAction } from "@/app/actions/cart";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import { TagIcon } from "@/components/icons";

export function CouponForm({
  locale,
  coupon,
  onChange,
  dict,
}: {
  locale: string;
  coupon: string;
  /** Called after a code is applied or removed (e.g. to re-quote checkout totals). */
  onChange?: () => void;
  dict: Pick<Dictionary, "cart" | "errors">;
}) {
  const [state, action, pending] = useActionState(couponAction, undefined);
  const notify = useRef(onChange);
  useEffect(() => {
    notify.current = onChange;
  });
  useEffect(() => {
    if (state?.ok) notify.current?.();
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="locale" value={locale} />
      <p className="flex items-center gap-2 text-sm font-semibold">
        <TagIcon />
        {dict.cart.coupon}
      </p>
      {coupon ? (
        <div className="flex items-center justify-between gap-2 rounded bg-green-50 px-3 py-2.5 text-sm text-green-800">
          <span>{dict.cart.applied.replace("{code}", coupon)}</span>
          <button
            type="submit"
            name="remove"
            value="1"
            disabled={pending}
            className="text-neutral-600 underline"
          >
            {dict.cart.removeCoupon}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="coupon">
            {dict.cart.coupon}
          </label>
          <input
            id="coupon"
            name="code"
            placeholder={dict.cart.coupon}
            className="min-w-0 flex-1 rounded border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-sm focus:border-brand focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-neutral-100 px-4 py-2.5 text-sm text-neutral-700 hover:bg-brand hover:text-white disabled:opacity-60"
          >
            {dict.cart.apply}
          </button>
        </div>
      )}
      {state?.ok === false && (
        <p role="alert" className="text-sm text-brand-accent">
          {errorText(dict, state.error)}
        </p>
      )}
    </form>
  );
}
