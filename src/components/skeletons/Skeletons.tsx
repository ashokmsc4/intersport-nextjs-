/** Loading placeholders shaped like the pages they stand in for (see the loading.tsx files). */

const bar = "rounded bg-neutral-100";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-6 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="aspect-square rounded-lg bg-neutral-100" />
          <div className={`h-3 w-1/3 ${bar}`} />
          <div className={`h-4 w-4/5 ${bar}`} />
          <div className={`h-4 w-1/3 ${bar}`} />
        </div>
      ))}
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <div aria-busy="true" className="animate-pulse">
      <div className={`mb-4 h-4 w-32 ${bar}`} />
      <div className={`mb-5 h-8 w-48 ${bar}`} />
      <div className="mb-6 flex gap-2">
        {[20, 16, 24].map((w) => (
          <div key={w} className="h-8 rounded-full bg-neutral-100" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          <div className="h-11 rounded bg-neutral-100 lg:hidden" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`hidden h-6 lg:block ${bar}`} />
          ))}
        </div>
        <div>
          <div className="mb-4 flex justify-between">
            <div className={`h-4 w-24 ${bar}`} />
            <div className={`h-9 w-44 ${bar}`} />
          </div>
          <ProductGridSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div aria-busy="true" className="grid animate-pulse gap-6 md:grid-cols-2 md:gap-8">
      <div>
        <div className="-mx-4 aspect-square bg-neutral-100 md:mx-0 md:rounded-lg" />
        <div className="mt-2 hidden grid-cols-5 gap-2 md:grid">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className={`h-3 w-16 ${bar}`} />
        <div className="flex flex-col gap-2">
          <div className={`h-7 w-full ${bar}`} />
          <div className={`h-7 w-2/3 ${bar}`} />
        </div>
        <div className={`h-6 w-32 ${bar}`} />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-11 rounded bg-neutral-100" />
          ))}
        </div>
        <div className="h-20 rounded-xl bg-neutral-100" />
        <div className="h-20 rounded-xl bg-neutral-100" />
        <div className="h-14 rounded-md bg-neutral-100" />
      </div>
    </div>
  );
}

/** Neutral placeholder for pages without a specific one (cart, account, checkout). */
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-4">
      <div className={`h-8 w-48 ${bar}`} />
      <div className="h-24 rounded-lg bg-neutral-100" />
      <div className="h-24 rounded-lg bg-neutral-100" />
      <div className={`h-4 w-2/3 ${bar}`} />
    </div>
  );
}
