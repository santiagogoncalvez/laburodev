import { useState, useCallback, useEffect, useRef } from "react";
import { API_URL } from "@/config";

export function useAISummary(jobId: string) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stream activo: se aborta al regenerar, cambiar de empleo o desmontar
  const controllerRef = useRef<AbortController | null>(null);
  // "¿Es el primer chunk?" se decide FUERA del updater (updaters deben ser puros)
  const firstChunkRef = useRef(true);

  // PENDING_FIXES [useAISummary]: abort del stream en cleanup + reinicio al
  // cambiar de jobId (el resumen viejo no debe verse en el empleo nuevo)
  useEffect(() => {
    setSummary("");
    setError(null);
    setLoading(false);

    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [jobId]);

  const generateSummary = useCallback(async () => {
    // Guard de concurrencia: cancela el stream anterior antes de arrancar uno nuevo
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    // NO limpiamos summary aquí - mantenemos el anterior visible hasta el 1er chunk
    firstChunkRef.current = true;

    try {
      const response = await fetch(`${API_URL}/ai/summary/${jobId}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        // errData como unknown + narrowing explícito (sin `as`, sin any).
        const errData: unknown = await response.json().catch(() => undefined);
        const apiMessage =
          typeof errData === "object" &&
          errData !== null &&
          "error" in errData &&
          typeof errData.error === "string"
            ? errData.error
            : undefined;
        throw new Error(apiMessage ?? "Error generando el resumen");
      }

      // body es ReadableStream | null en los tipos: guard explícito (sin `!`).
      const body = response.body;
      if (!body) {
        throw new Error("La respuesta no incluye stream de contenido");
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // Stream cancelado en la ventana del await: no escribir chunks viejos
        if (controller.signal.aborted) break;

        const chunkText = decoder.decode(value, { stream: true });
        // Updater puro: reemplazo vs append ya decidido antes del set
        const isFirstChunk = firstChunkRef.current;
        firstChunkRef.current = false;
        setSummary((prev) => (isFirstChunk ? chunkText : prev + chunkText));
      }
    } catch (err) {
      if (controller.signal.aborted) return; // cancelación esperada, sin error
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [jobId]);

  return {
    summary,
    loading,
    error,
    generateSummary,
  };
}
