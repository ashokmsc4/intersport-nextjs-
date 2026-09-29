"use client";

import { useActionState } from "react";
import { deleteAddressAction } from "@/app/actions/account";

export function DeleteAddressButton({
  locale,
  addressId,
  label,
  errorLabel,
}: {
  locale: string;
  addressId: string;
  label: string;
  errorLabel: string;
}) {
  const [state, action, pending] = useActionState(deleteAddressAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="addressId" value={addressId} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-neutral-500 underline hover:text-brand-accent"
      >
        {label}
      </button>
      {state?.ok === false && (
        <p role="alert" className="text-xs text-brand-accent">
          {errorLabel}
        </p>
      )}
    </form>
  );
}
