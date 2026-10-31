import { Skeleton } from "./Skeleton";
import { SearchResultsSkeleton } from "./SearchResultsSkeleton";

export function SearchPageSkeleton() {
   return (
      <div className="page">
         <div style={{ paddingBlock: "var(--space-6) var(--space-4)" }}>
            <Skeleton style={{ width: "45%", height: "2.5rem" }} />
            <Skeleton style={{ width: "60%", height: "1rem", marginTop: "var(--space-2)" }} />
            <Skeleton style={{ width: "100%", height: "3.5rem", borderRadius: "var(--r-full)", marginTop: "var(--space-5)" }} />
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }} aria-hidden="true">
               <Skeleton style={{ width: "7rem", height: "2.25rem", borderRadius: "var(--r-full)" }} />
               <Skeleton style={{ width: "6rem", height: "2.25rem", borderRadius: "var(--r-full)" }} />
               <Skeleton style={{ width: "8rem", height: "2.25rem", borderRadius: "var(--r-full)" }} />
            </div>
         </div>
         <SearchResultsSkeleton count={4} />
      </div>
   );
}
