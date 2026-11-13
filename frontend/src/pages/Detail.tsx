import DOMPurify from 'dompurify';
import { Building2, Heart, Home, MapPin, Signal, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import snarkdown from 'snarkdown';
import { AISummary } from '@/components/AISummary';
import { JobDetailSkeleton } from '@/components/JobDetailSkeleton';
import { Link } from '@/components/Link';
import { API_URL } from '@/config';
import { formatJobLevel } from '@/constants/levels';
import { formatTechnology } from '@/constants/technologies';
import { useFavoritesStore } from '@/store/favoritesStore';
import type { Job } from '@/types/api';
import styles from './Detail.module.css';

interface JobSectionProps {
  title: string;
  content: string;
}

function JobSection({ title, content }: JobSectionProps) {
  // XSS (auditoría 2026-11-11): snarkdown deja pasar HTML crudo → DOMPurify
  // sanea el markdown renderizado antes de inyectarlo al DOM.
  const html = DOMPurify.sanitize(snarkdown(content));

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>

      {/* biome-ignore-start lint/security/noDangerouslySetInnerHtml: html viene saneado con DOMPurify antes de renderizar */}
      <div
        className={`${styles.sectionContent} prose`}
        dangerouslySetInnerHTML={{
          __html: html,
        }}
      />
      {/* biome-ignore-end lint/security/noDangerouslySetInnerHtml: html viene saneado con DOMPurify antes de renderizar */}
    </section>
  );
}

interface DetailPageBreadCrumbProps {
  job: Job;
}

function DetailPageBreadCrumb({ job }: DetailPageBreadCrumbProps) {
  return (
    <nav className={styles.breadcrumb}>
      <Link href="/search" className={styles.breadcrumbButton}>
        Empleos
      </Link>
      <span className={styles.breadcrumbSeparator}>/</span>
      <span className={styles.breadcrumbCurrent}>{job.title}</span>
    </nav>
  );
}

interface DetailPageHeaderProps {
  job: Job;
}

function DetailPageHeader({ job }: DetailPageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{job.title}</h1>
        <DetailFavoriteButton jobId={job.id} />
      </div>
      <div className="meta-row">
        <span className="meta-item">
          <Building2 size={14} aria-hidden="true" />
          {job.company}
        </span>
        <span className="meta-item">
          <MapPin size={14} aria-hidden="true" />
          {job.location}
        </span>
        <span className="meta-item">
          {job.data.modality === 'remoto' ? (
            <Wifi size={14} aria-hidden="true" />
          ) : (
            <Home size={14} aria-hidden="true" />
          )}
          {job.data.modality === 'remoto' ? 'Remoto' : 'Presencial'}
        </span>
        <span className="meta-item">
          <Signal size={14} aria-hidden="true" />
          {formatJobLevel(job.data.level)}
        </span>
      </div>
      {job.data.technology.length > 0 && (
        <div className="badges">
          {job.data.technology.map((technology) => (
            <span key={technology} className="badge">
              {formatTechnology(technology)}
            </span>
          ))}
        </div>
      )}
      {job.createdAt && (
        <span className={styles.createdAt}>
          Publicado: {new Date(job.createdAt).toLocaleDateString('es-AR')}
        </span>
      )}
    </header>
  );
}

interface DetailFavoriteButtonProps {
  jobId: string;
}

function DetailFavoriteButton({ jobId }: DetailFavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const fav = isFavorite(jobId);

  return (
    <button
      type="button"
      className={`icon-btn${fav ? ' is-active' : ''}`}
      onClick={() => toggleFavorite(jobId)}
      aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={fav}
    >
      <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
    </button>
  );
}

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // PENDING_FIXES [Detail]: AbortController + flag de cancelación + !ok corta
    const controller = new AbortController();

    async function loadJob() {
      try {
        const response = await fetch(`${API_URL}/jobs/${jobId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          navigate('/not-found');
          return;
        }

        const json: Job = await response.json();
        setJob(json);
      } catch (err) {
        // Cancelación esperada (cambio de jobId / desmontaje): no es error
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadJob();

    return () => controller.abort();
  }, [jobId, navigate]);

  if (loading) {
    return (
      <div
        className={styles.container}
        role="status"
        aria-label="Cargando empleo"
      >
        <JobDetailSkeleton />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        <title>Oferta no encontrada · laburoDev</title>
        <div className={styles.error}>
          <h2 className={styles.errorTitle}>Oferta no encontrada</h2>
          <button
            type="button"
            onClick={() => navigate('/')}
            className={styles.errorButton}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <title>{job.title} · laburoDev</title>
      <DetailPageBreadCrumb job={job} />
      <DetailPageHeader job={job} />
      <AISummary jobId={job.id} />

      <JobSection
        title="Descripción del puesto"
        content={job.content.description}
      />
      {/* La API devuelve string[] (join → markdown líneas); ver PENDING_FIXES.md
          sobre el origen de datos (seed → parseJsonArray → [] siempre). */}
      <JobSection
        title="Responsabilidades"
        content={job.content.responsibilities.join('\n')}
      />
      <JobSection
        title="Requisitos"
        content={job.content.requirements.join('\n')}
      />
      <JobSection title="Acerca de la empresa" content={job.content.about} />
    </div>
  );
}
