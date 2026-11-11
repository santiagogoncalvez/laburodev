import { useState, useCallback } from "react";
import { API_URL } from "../config";

export function useAISummary(jobId: string) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    // NO limpiamos summary aquí - mantenemos el anterior visible

    try {
      const response = await fetch(`${API_URL}/ai/summary/${jobId}`);
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

      // Solo limpiamos cuando llega el PRIMER chunk real
      let firstChunk = true;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        setSummary((prev) => {
          if (firstChunk) {
            firstChunk = false;
            return chunkText; // reemplaza el anterior
          }
          return prev + chunkText;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // En error, podríamos mantener el anterior o limpiar - tu call
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  return {
    summary,
    loading,
    error,
    generateSummary,
  };
}
