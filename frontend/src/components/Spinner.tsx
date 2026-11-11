import { LoaderCircle } from "lucide-react";

interface SpinnerProps {
   size?: number;
   label?: string;
}

export function Spinner({ size = 28, label = "Cargando" }: SpinnerProps) {
   return (
      <span role="status" aria-label={label}>
         <LoaderCircle size={size} className="spinner" aria-hidden="true" />
      </span>
   );
}
