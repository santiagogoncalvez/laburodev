import { Skeleton } from "./Skeleton";

export function HomePageSkeleton() {
   return (
      <div className="page" role="status" aria-label="Cargando inicio">
         <div style={{ paddingBlock: "var(--space-6) var(--space-4)" }}>
            <Skeleton style={{ width: "55%", height: "2.5rem" }} />
            <Skeleton style={{ width: "60%", height: "1rem", marginTop: "var(--space-2)" }} />
            <Skeleton style={{ width: "100%", height: "3.5rem", borderRadius: "var(--r-full)", marginTop: "var(--space-5)" }} />
         </div>
         <div style={{ paddingBlock: "var(--space-6)" }}>
            <Skeleton style={{ width: "35%", height: "1.5rem" }} />
            <Skeleton style={{ width: "50%", height: "1rem", marginTop: "var(--space-2)" }} />
            {[0, 1, 2].map((i) => (
               <div key={i} style={{ marginTop: "var(--space-5)" }}>
                  <Skeleton style={{ width: "40%", height: "1.125rem" }} />
                  <Skeleton style={{ width: "70%", height: "1rem", marginTop: "var(--space-2)" }} />
               </div>
            ))}
         </div>
      </div>
   );
}
