import { JobDetailSkeleton } from "./JobDetailSkeleton";

export function JobDetailPageSkeleton() {
   return (
      <div
         className="page"
         role="status"
         aria-label="Cargando empleo"
         style={{
            paddingBlock: "var(--space-6)",
            minHeight: "75vh",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
         }}
      >
         <JobDetailSkeleton />
      </div>
   );
}
