import type { Dictionary } from "./dictionaries";

/** Maps an action error (a known key or a Magento message) to display text. */
export function errorText(
  dict: Pick<Dictionary, "errors">,
  error: string | undefined,
) {
  if (!error) return "";
  const known = dict.errors as Record<string, string>;
  return known[error] ?? error;
}
