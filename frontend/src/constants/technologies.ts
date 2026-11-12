// Parseo API → UI para tecnologías (mismo patrón que levels.ts): el dato
// llega con guiones (react-native, scikit-learn) y se muestra con espacio.
export function formatTechnology(technology: string): string {
  return technology.replace(/-/g, ' ');
}
