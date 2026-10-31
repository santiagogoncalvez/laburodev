import { LoaderCircle } from "lucide-react";

export function Spinner({ size = 28, label = "Cargando" }) {
   return (
      <span role="status" aria-label={label}>
         <LoaderCircle size={size} className="spinner" aria-hidden="true" />
      </span>
   );
}
