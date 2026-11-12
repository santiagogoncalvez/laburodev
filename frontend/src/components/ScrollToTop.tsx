import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname es el trigger intencional del scroll al navegar
  useEffect(() => {
    // En atrás/adelante (POP) manda el navegador con su posición guardada
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
}
