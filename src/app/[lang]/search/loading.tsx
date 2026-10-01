import { ProductGridSkeleton } from "@/components/skeletons/Skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" className="animate-pulse">
      <div className="mb-6 h-8 w-64 rounded bg-neutral-100" />
      <div className="mb-8 h-10 max-w-xl rounded bg-neutral-100" />
      <ProductGridSkeleton />
    </div>
  );
}
