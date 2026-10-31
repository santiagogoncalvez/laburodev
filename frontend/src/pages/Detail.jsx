import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { Building2, Heart, MapPin, Signal } from "lucide-react"
import { JobDetailSkeleton } from "../components/JobDetailSkeleton"
import { formatJobLevel } from "../constants/levels.js"
import { API_URL } from "../config.js"
import { Link } from "../components/Link"
import snarkdown from 'snarkdown'
import styles from './Detail.module.css'
import { useFavoritesStore } from "../store/favoritesStore"
import { AISummary } from "../components/AISummary"

function JobSection ({ title, content }) {
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

function DetailPageBreadCrumb ({ job }) {
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

function DetailPageHeader ({ job }) {
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

function DetailFavoriteButton ({ jobId }) {
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

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/jobs/${jobId}`)
       .then((response) => {
          if (!response.ok) {
             navigate("/not-found");
          }

          return response.json();
       })
       .then((json) => {
          setJob(json);
       })
       .catch((err) => {
          setError(err.message);
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
      <DetailPageBreadCrumb job={job} />
      <DetailPageHeader job={job} />
      <AISummary jobId={job.id} />

      <JobSection title="Descripción del puesto" content={job.content.description} />
      <JobSection title="Responsabilidades" content={job.content.responsibilities} />
      <JobSection title="Requisitios" content={job.content.requirements} />
      <JobSection title="Acerca de la empresa" content={job.content.about} />
    </div>
  )
}