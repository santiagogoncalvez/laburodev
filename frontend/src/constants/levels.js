// Patrón de parseos API → UI: mapa constante + función con fallback
// al valor original. Cada nuevo parseo suma su archivo en esta carpeta.
export const JOB_LEVELS = {
   junior: "Junior",
   "mid-level": "Semi Senior",
   senior: "Senior",
   lead: "Lead",
};

export function formatJobLevel(level) {
   return JOB_LEVELS[level] ?? level;
}
