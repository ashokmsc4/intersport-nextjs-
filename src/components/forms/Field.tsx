import type { InputHTMLAttributes } from "react";

export function Field({
  label,
  invalid,
  ...input
}: { label: string; invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        // Emails and phone numbers read left-to-right even on Arabic pages.
        dir={input.type === "email" || input.type === "tel" ? "ltr" : undefined}
        {...input}
        aria-invalid={invalid || undefined}
        className="rounded border border-neutral-300 px-3 py-2 text-base aria-invalid:border-brand-accent"
      />
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded bg-red-50 p-3 text-sm text-brand-accent">
      {message}
    </p>
  );
}

export const buttonClass =
  "rounded bg-brand px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60";
