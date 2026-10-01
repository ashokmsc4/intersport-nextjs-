import { PageSkeleton } from "@/components/skeletons/Skeletons";

/**
 * Shown instantly while a page renders (routes with their own loading.tsx use a
 * closer match). Links to streaming pages prefetch only up to this boundary, so a
 * visible link costs a small request and no Magento calls.
 */
export default function Loading() {
  return <PageSkeleton />;
}
