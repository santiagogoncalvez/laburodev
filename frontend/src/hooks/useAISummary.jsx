import { useState, useCallback } from "react";
import { API_URL } from "../config.js";

export function useAISummary(jobId) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    // NO limpiamos summary aquí - mantenemos el anterior visible

    try {
      const response = await fetch(`${API_URL}/ai/summary/${jobId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Error generando el resumen");
      }

      const reader = response.body.getReader();
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
      setError(err.message);
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