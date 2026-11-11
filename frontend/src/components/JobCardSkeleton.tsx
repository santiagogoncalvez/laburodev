import { Skeleton } from "./Skeleton";

export function JobCardSkeleton() {
   return (
      <div className="job-listing-card" aria-hidden="true">
         <div style={{ flex: 1 }}>
            <Skeleton style={{ width: "55%", height: "1.4rem" }} />
            <div className="meta-row">
               <Skeleton style={{ width: "7rem", height: "0.875rem" }} />
               <Skeleton style={{ width: "5rem", height: "0.875rem" }} />
               <Skeleton style={{ width: "4rem", height: "0.875rem" }} />
            </div>
            <Skeleton style={{ width: "100%", height: "0.875rem", marginTop: "var(--space-3)" }} />
            <Skeleton style={{ width: "80%", height: "0.875rem", marginTop: "var(--space-2)" }} />
            <div className="badges">
               <Skeleton style={{ width: "4.5rem", height: "1.5rem", borderRadius: "var(--r-full)" }} />
               <Skeleton style={{ width: "3.5rem", height: "1.5rem", borderRadius: "var(--r-full)" }} />
               <Skeleton style={{ width: "5rem", height: "1.5rem", borderRadius: "var(--r-full)" }} />
            </div>
         </div>
         <Skeleton style={{ width: "2.5rem", height: "2.5rem", borderRadius: "var(--r-full)", flexShrink: 0 }} />
      </div>
   );
}
