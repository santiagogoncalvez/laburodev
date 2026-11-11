import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { Building2, Heart, MapPin, Signal } from "lucide-react"
import { JobDetailSkeleton } from "../components/JobDetailSkeleton"
import { formatJobLevel } from "../constants/levels"
import { API_URL } from "../config"
import { Link } from "../components/Link"
import snarkdown from 'snarkdown'
import styles from './Detail.module.css'
import { useFavoritesStore } from "../store/favoritesStore"
import { AISummary } from "../components/AISummary"
import type { Job } from "../types/api"

interface JobSectionProps {
  title: string
  content: string
}

function JobSection ({ title, content }: JobSectionProps) {
  const html = snarkdown(content)

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {title}
      </h2>

      <div
        className={`${styles.sectionContent} prose`}
        dangerouslySetInnerHTML={{
          __html: html
        }}
      />

    </section>
  )
}

interface DetailPageBreadCrumbProps {
  job: Job
}

function DetailPageBreadCrumb ({ job }: DetailPageBreadCrumbProps) {
  return (
    <nav className={styles.breadcrumb}>
      <Link
        href="/search"
        className={styles.breadcrumbButton}
      >
        Empleos
      </Link>
      <span className={styles.breadcrumbSeparator}>/</span>
      <span className={styles.breadcrumbCurrent}>{job.title}</span>
    </nav>
  )
}

interface DetailPageHeaderProps {
  job: Job
}

function DetailPageHeader ({ job }: DetailPageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          {job.title}
        </h1>
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
          <Signal size={14} aria-hidden="true" />
          {formatJobLevel(job.data.level)}
        </span>
      </div>
    </header>
  )
}

interface DetailFavoriteButtonProps {
  jobId: string
}

function DetailFavoriteButton ({ jobId }: DetailFavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore()
  const fav = isFavorite(jobId)

  return (
    <button
      className={`icon-btn${fav ? " is-active" : ""}`}
      onClick={() => toggleFavorite(jobId)}
      aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={fav}
    >
      <Heart size={18} fill={fav ? "currentColor" : "none"} />
    </button>
  )
}

export default function JobDetail () {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/jobs/${jobId}`)
       .then((response) => {
          if (!response.ok) {
             navigate("/not-found");
          }

          return response.json();
       })
       .then((json: Job) => {
          setJob(json);
       })
       .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : String(err));
       })
       .finally(() => {
          setLoading(false);
       });
  }, [jobId])

  if (loading) {
    return (
      <div className={styles.container} role="status" aria-label="Cargando empleo">
        <JobDetailSkeleton />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        <title>Oferta no encontrada · laburoDev</title>
        <div className={styles.error}>
          <h2 className={styles.errorTitle}>
            Oferta no encontrada
          </h2>
          <button
            onClick={() => navigate('/')}
            className={styles.errorButton}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <title>{job.title} · laburoDev</title>
      <DetailPageBreadCrumb job={job} />
      <DetailPageHeader job={job} />
      <AISummary jobId={job.id} />

      <JobSection title="Descripción del puesto" content={job.content.description} />
      {/* La API devuelve string[] (join → markdown líneas); ver PENDING_FIXES.md
          sobre el origen de datos (seed → parseJsonArray → [] siempre). */}
      <JobSection title="Responsabilidades" content={job.content.responsibilities.join("\n")} />
      <JobSection title="Requisitios" content={job.content.requirements.join("\n")} />
      <JobSection title="Acerca de la empresa" content={job.content.about} />
    </div>
  )
}
