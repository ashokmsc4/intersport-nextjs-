/**
 * Shown instantly while a page renders. It also stops link prefetching at this
 * boundary, so visible links don't trigger Magento calls for pages the shopper
 * may never open.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="grid animate-pulse grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="aspect-square rounded-lg bg-neutral-100" />
          <div className="h-3 w-1/3 rounded bg-neutral-100" />
          <div className="h-4 w-3/4 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}
