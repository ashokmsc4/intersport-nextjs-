"use client";

import { useActionState, useState } from "react";
import { addAddressAction, type AccountState } from "@/app/actions/account";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import { Field, FormError, buttonClass } from "@/components/forms/Field";
import { AreaSelect, type AreaValue, type Governorate } from "./AreaSelect";

type Props = {
  locale: string;
  governorates: Governorate[];
  defaults: { firstname: string; lastname: string; telephone: string };
  dict: Pick<Dictionary, "account" | "checkout" | "addresses" | "errors">;
};

export function AddressForm(props: Props) {
  const [state, action, pending] = useActionState(addAddressAction, undefined);
  // Remount (clearing inputs and area pickers) after every successful save.
  return (
    <AddressFields
      key={state?.ok ? state.savedAt : "editing"}
      {...props}
      state={state}
      action={action}
      pending={pending}
    />
  );
}

function AddressFields({
  locale,
  governorates,
  defaults,
  dict,
  state,
  action,
  pending,
}: Props & {
  state: AccountState;
  action: (form: FormData) => void;
  pending: boolean;
}) {
  const [area, setArea] = useState<AreaValue>({ governorate: "", areaId: "", areaName: "" });
  const t = dict.checkout;
  const v: Record<string, string> = {
    ...defaults,
    ...(state?.ok === false ? state.values : {}),
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="governorate" value={area.governorate} />
      <input type="hidden" name="areaId" value={area.areaId} />
      <input type="hidden" name="areaName" value={area.areaName} />
      <FormError message={state?.ok === false ? errorText(dict, state.error) : ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.account.firstname} name="firstname" defaultValue={v.firstname} required />
        <Field label={dict.account.lastname} name="lastname" defaultValue={v.lastname} required />
        <Field label={dict.account.mobile} name="telephone" type="tel" inputMode="tel" defaultValue={v.telephone} required />
        <div className="hidden sm:block" />
        <AreaSelect
          governorates={governorates}
          value={area}
          onChange={setArea}
          labels={{ governorate: t.governorate, area: t.area, chooseArea: t.chooseArea }}
        />
        <Field label={t.block} name="block" defaultValue={v.block} required />
        <Field label={t.street} name="street" defaultValue={v.street} required />
        <Field label={t.avenue} name="avenue" defaultValue={v.avenue} />
        <Field label={t.house} name="house" defaultValue={v.house} required />
        <Field label={t.floor} name="floor" defaultValue={v.floor} />
        <Field label={t.apartment} name="apartment" defaultValue={v.apartment} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDefault" />
        {dict.addresses.makeDefault}
      </label>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? dict.addresses.saving : dict.addresses.save}
      </button>
    </form>
  );
}
