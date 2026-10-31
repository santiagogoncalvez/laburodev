import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Streamdown } from "streamdown";
import { useAISummary } from "../hooks/useAISummary";
import styles from "./AISummary.module.css";

function AISummary({ jobId }) {
  const { summary, loading, error, generateSummary } = useAISummary(jobId);

  // Si hay error, SIEMPRE mostrar vista de error (incluso si hay summary previo)
  if (error) {
    return (
      <section className={styles.section} aria-live="polite">
        <div className={styles.error}>
          <div className={styles.errorInline}>
            <AlertCircle className={styles.errorIcon} aria-hidden="true" />
            <p>{error}</p>
          </div>
          <button
            onClick={generateSummary}
            disabled={loading}
            className={styles.retry}
          >
            {loading ? "Reintentando..." : "Reintentar"}
          </button>
        </div>
      </section>
    );
  }

  if (summary) {
    return (
      <section className={styles.section} aria-live="polite">
        <header className={styles.header}>
          <h2 className={styles.title}>
            <Sparkles className={styles.icon} aria-hidden="true" />
            Resumen generado por IA
          </h2>
          <button
            onClick={generateSummary}
            disabled={loading}
            className={styles.regenerate}
            aria-label="Regenerar resumen"
          >
            {loading ? (
              <>
                <Loader2 className={styles.spinner} aria-hidden="true" />
                Regenerando...
              </>
            ) : (
              <>
                <Sparkles className={styles.icon} aria-hidden="true" />
                Regenerar
              </>
            )}
          </button>
        </header>

        <div className={styles.content}>
          <Streamdown isAnimating={loading}>{summary}</Streamdown>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <button
        onClick={generateSummary}
        disabled={loading}
        className={styles.generate}
      >
        {loading ? (
          <>
            <Loader2 className={styles.spinner} aria-hidden="true" />
            Generando resumen...
          </>
        ) : (
          <>
            <Sparkles className={styles.icon} aria-hidden="true" />
            Generar resumen con IA
          </>
        )}
      </button>
    </section>
  );
}

export { AISummary };