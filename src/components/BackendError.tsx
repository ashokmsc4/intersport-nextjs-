import type { Dictionary } from "@/i18n/dictionaries";

export function BackendError({
  dict,
  reason,
}: {
  dict: Pick<Dictionary, "home">;
  reason: string;
}) {
  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p>{dict.home.backendUnavailable}</p>
      <p dir="ltr" className="mt-1 font-mono text-xs">
        {reason} · /api/health
      </p>
    </div>
  );
}
