import { Skeleton } from "./Skeleton";

export function PageSkeleton() {
   return (
      <div className="page-skeleton" role="status" aria-label="Cargando página">
         <Skeleton style={{ width: "10rem", height: "0.875rem" }} />
         <Skeleton style={{ width: "45%", height: "2rem" }} />
         <div className="meta-row" aria-hidden="true">
            <Skeleton style={{ width: "7rem", height: "0.875rem" }} />
            <Skeleton style={{ width: "5rem", height: "0.875rem" }} />
            <Skeleton style={{ width: "6rem", height: "0.875rem" }} />
         </div>
         {[0, 1].map((i) => (
            <div className="job-listing-card" key={i} aria-hidden="true">
               <div style={{ flex: 1 }}>
                  <Skeleton style={{ width: "50%", height: "1.4rem" }} />
                  <Skeleton style={{ width: "100%", height: "0.875rem", marginTop: "var(--space-3)" }} />
                  <Skeleton style={{ width: "75%", height: "0.875rem", marginTop: "var(--space-2)" }} />
               </div>
            </div>
         ))}
         <Skeleton style={{ width: "100%", height: "0.875rem" }} />
         <Skeleton style={{ width: "85%", height: "0.875rem" }} />
      </div>
   );
}
