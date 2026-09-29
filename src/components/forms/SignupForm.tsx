"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/actions/auth";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorText } from "@/i18n/errors";
import { Field, FormError, buttonClass } from "./Field";

export function SignupForm({
  locale,
  dict,
  redirectTo,
}: {
  locale: string;
  dict: Pick<Dictionary, "account" | "errors">;
  redirectTo?: string;
}) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  const t = dict.account;
  const v = state?.values ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <FormError message={errorText(dict, state?.error)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.firstname} name="firstname" defaultValue={v.firstname} autoComplete="given-name" required />
        <Field label={t.lastname} name="lastname" defaultValue={v.lastname} autoComplete="family-name" required />
      </div>
      <Field label={t.email} name="email" type="email" defaultValue={v.email} autoComplete="email" required />
      <Field
        label={t.mobile}
        name="mobile"
        type="tel"
        defaultValue={v.mobile}
        autoComplete="tel"
        inputMode="tel"
        placeholder="5XXXXXXX"
        invalid={state?.field === "mobile"}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.dob} name="dob" type="date" defaultValue={v.dob} autoComplete="bday" required />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t.gender}</span>
          <select
            // Remount so the restored value applies after a failed submit.
            key={v.gender ?? ""}
            name="gender"
            required
            defaultValue={v.gender ?? ""}
            className="rounded border border-neutral-300 px-3 py-2 text-base"
          >
            <option value="" disabled />
            <option value="1">{t.genderMale}</option>
            <option value="2">{t.genderFemale}</option>
            <option value="3">{t.genderOther}</option>
          </select>
        </label>
      </div>
      <Field
        label={t.password}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        invalid={state?.field === "password"}
        required
      />
      <Field
        label={t.confirmPassword}
        name="confirm"
        type="password"
        autoComplete="new-password"
        invalid={state?.field === "confirm"}
        required
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? t.creating : t.createAccount}
      </button>
    </form>
  );
}
