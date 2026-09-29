"use client";

import { useActionState } from "react";
import { passwordResetAction } from "@/app/actions/account";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import { Field, FormError, buttonClass } from "./Field";

export function ResetForm({
  locale,
  dict,
}: {
  locale: string;
  dict: Pick<Dictionary, "account" | "errors">;
}) {
  const [state, action, pending] = useActionState(passwordResetAction, undefined);
  const t = dict.account;

  if (state?.ok) {
    return (
      <p role="status" className="rounded bg-green-50 p-4 text-sm text-green-800">
        {t.resetSent.replace("{email}", state.message ?? "")}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <FormError message={state?.ok === false ? errorText(dict, state.error) : ""} />
      <Field
        label={t.email}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state?.ok === false ? state.values?.email : undefined}
        required
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? t.sending : t.sendLink}
      </button>
    </form>
  );
}
