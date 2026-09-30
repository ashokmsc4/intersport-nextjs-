import Link from "next/link";

/** Home › L1 › L2 › current. The last crumb is the current page (not a link). */
export function Breadcrumbs({
  locale,
  trail,
  labels,
}: {
  locale: string;
  trail: { id: number; name: string }[];
  labels: { home: string; breadcrumb: string };
}) {
  return (
    <nav aria-label={labels.breadcrumb} className="mb-3 text-sm text-neutral-500">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href={`/${locale}`} className="hover:text-brand">
            {labels.home}
          </Link>
        </li>
        {trail.map((crumb, i) => (
          <li key={crumb.id} className="flex items-center gap-1">
            <span aria-hidden className="rtl:rotate-180">›</span>
            {i === trail.length - 1 ? (
              <span aria-current="page" className="text-neutral-800">
                {crumb.name}
              </span>
            ) : (
              <Link href={`/${locale}/category/${crumb.id}`} className="hover:text-brand">
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
