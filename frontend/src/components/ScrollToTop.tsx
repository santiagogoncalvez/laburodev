import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router";

export function ScrollToTop() {
   const { pathname } = useLocation();
   const navType = useNavigationType();

   useEffect(() => {
      // En atrás/adelante (POP) manda el navegador con su posición guardada
      if (navType !== "POP") {
         window.scrollTo(0, 0);
      }
   }, [pathname, navType]);

   return null;
}
