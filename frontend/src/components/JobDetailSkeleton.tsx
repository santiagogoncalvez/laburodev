import { Skeleton } from "./Skeleton";

const SECTIONS = [0, 1, 2, 3];

export function JobDetailSkeleton() {
   return (
      <>
         <Skeleton style={{ width: "50%", height: "0.875rem" }} />
         <div style={{ display: "flex", gap: "var(--space-4)", width: "100%" }}>
            <div style={{ flex: 1 }}>
               <Skeleton style={{ width: "75%", height: "2rem" }} />
               <Skeleton style={{ width: "55%", height: "1rem", marginTop: "var(--space-2)" }} />
            </div>
            <Skeleton style={{ width: "2.5rem", height: "2.5rem", borderRadius: "var(--r-full)", flexShrink: 0 }} />
         </div>
         {SECTIONS.map((i) => (
            <div key={i} style={{ width: "100%" }}>
               <Skeleton style={{ width: "12rem", height: "1.125rem", marginBottom: "var(--space-3)" }} />
               <Skeleton style={{ width: "100%", height: "0.875rem" }} />
               <Skeleton style={{ width: "100%", height: "0.875rem", marginTop: "var(--space-2)" }} />
               <Skeleton style={{ width: "70%", height: "0.875rem", marginTop: "var(--space-2)" }} />
            </div>
         ))}
      </>
   );
}
