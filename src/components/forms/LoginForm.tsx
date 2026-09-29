"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import { Field, FormError, buttonClass } from "./Field";

export function LoginForm({
  locale,
  dict,
  redirectTo,
}: {
  locale: string;
  dict: Pick<Dictionary, "account" | "errors">;
  redirectTo?: string;
}) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <FormError message={errorText(dict, state?.error)} />
      <Field
        label={dict.account.email}
        name="email"
        type="email"
        defaultValue={state?.values?.email}
        autoComplete="email"
        required
      />
      <Field
        label={dict.account.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? dict.account.signingIn : dict.account.signIn}
      </button>
    </form>
  );
}
