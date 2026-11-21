import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Link } from '@/components/Link';
import { JOB_LEVELS } from '@/constants/levels';
import { createJob, type JobFormInput, updateJob } from '@/lib/jobsApi';
import type { Job } from '@/types/api';
import styles from './Auth.module.css';

// Estado inicial del formulario (fuente de verdad en React).
interface JobFormState {
  title: string;
  company: string;
  location: string;
  description: string;
  responsibilities: string;
  requirements: string;
  about: string;
  technology: string; // lista separada por comas
  level: string;
  modality: string;
}

const INITIAL_STATE: JobFormState = {
  title: '',
  company: '',
  location: '',
  description: '',
  responsibilities: '',
  requirements: '',
  about: '',
  technology: '',
  level: 'junior',
  modality: 'remoto',
};

// Convierte "react, node, typescript" → ["react", "node", "typescript"].
function toList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// Convierte ["react", "node"] → "react, node" (para precargar el input).
function toText(value: string[] | undefined): string {
  return (value ?? []).join(', ');
}

// Formulario único para /jobs/new (crear) y /jobs/:jobId/edit (editar).
// Controlado por estado: en edición, el GET del empleo setea el estado y
// React precarga los inputs (nada de manipulación imperativa del DOM).
export default function JobFormPage() {
  const { jobId } = useParams();
  const isEdit = Boolean(jobId);
  const navigate = useNavigate();

  const [form, setForm] = useState<JobFormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    const controller = new AbortController();

    async function loadJob() {
      try {
        // Alias same-origin: trae el userId del dueño con la sesión.
        const response = await fetch(`/api/jobs/${jobId}`, {
          signal: controller.signal,
        });
        if (response.status === 404) {
          setError('El empleo que intentás editar no existe');
          return;
        }
        if (!response.ok) {
          setError('No se pudo cargar el empleo');
          return;
        }
        const job: Job = await response.json();
        setForm({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.content.description,
          responsibilities: toText(job.content.responsibilities),
          requirements: toText(job.content.requirements),
          about: job.content.about,
          technology: toText(job.data.technology),
          level: job.data.level,
          modality: job.data.modality,
        });
      } catch {
        if (!controller.signal.aborted) {
          setError('No se pudo cargar el empleo');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadJob();
    return () => controller.abort();
  }, [jobId, isEdit]);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const technologies = toList(form.technology);
    if (technologies.length === 0) {
      setError('Agregá al menos una tecnología (separadas por coma)');
      return;
    }

    const input: JobFormInput = {
      title: form.title,
      company: form.company,
      location: form.location,
      data: {
        technology: technologies,
        mode: form.modality,
        level: form.level,
      },
      content: {
        description: form.description,
        responsibilities: toList(form.responsibilities),
        requirements: toList(form.requirements),
        about: form.about,
      },
    };

    setSubmitting(true);
    try {
      if (isEdit && jobId) {
        await updateJob(jobId, input);
        navigate(`/jobs/${jobId}`);
      } else {
        const newId = await createJob(input);
        navigate(`/jobs/${newId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.subtitle}>Cargando empleo…</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <title>{isEdit ? 'Editar empleo' : 'Publicar empleo'} · laburoDev</title>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {isEdit ? 'Editar Empleo' : 'Publicar Empleo'}
        </h1>
        <p className={styles.subtitle}>
          {isEdit
            ? 'Actualizá los datos de tu publicación'
            : 'Completá los datos de la oferta laboral'}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="job-title" className={styles.label}>
              Título
            </label>
            <input
              id="job-title"
              name="title"
              type="text"
              className={styles.input}
              placeholder="Desarrollador Full Stack"
              minLength={3}
              maxLength={100}
              required
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-company" className={styles.label}>
              Empresa
            </label>
            <input
              id="job-company"
              name="company"
              type="text"
              className={styles.input}
              placeholder="ACME Corp"
              required
              value={form.company}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-location" className={styles.label}>
              Ubicación
            </label>
            <input
              id="job-location"
              name="location"
              type="text"
              className={styles.input}
              placeholder="Argentina"
              value={form.location}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-description" className={styles.label}>
              Descripción
            </label>
            <textarea
              id="job-description"
              name="description"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Buscamos…"
              rows={5}
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-responsibilities" className={styles.label}>
              Responsabilidades (separadas por coma)
            </label>
            <textarea
              id="job-responsibilities"
              name="responsibilities"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Desarrollar features, revisar código, mentorear…"
              rows={3}
              value={form.responsibilities}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-requirements" className={styles.label}>
              Requisitos (separados por coma)
            </label>
            <textarea
              id="job-requirements"
              name="requirements"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="3 años de experiencia con React, inglés avanzado…"
              rows={3}
              value={form.requirements}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-about" className={styles.label}>
              Acerca de la empresa
            </label>
            <textarea
              id="job-about"
              name="about"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Somos una empresa…"
              rows={4}
              value={form.about}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-technology" className={styles.label}>
              Tecnologías (separadas por coma)
            </label>
            <input
              id="job-technology"
              name="technology"
              type="text"
              className={styles.input}
              placeholder="react, node, typescript"
              required
              value={form.technology}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-level" className={styles.label}>
              Nivel
            </label>
            <select
              id="job-level"
              name="level"
              className={styles.input}
              value={form.level}
              onChange={handleChange}
            >
              {Object.entries(JOB_LEVELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="job-modality" className={styles.label}>
              Modalidad
            </label>
            <select
              id="job-modality"
              name="modality"
              className={styles.input}
              value={form.modality}
              onChange={handleChange}
            >
              <option value="remoto">Remoto</option>
              <option value="presencial">Presencial</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting
              ? 'Guardando…'
              : isEdit
                ? 'Guardar cambios'
                : 'Publicar empleo'}
          </button>
        </form>

        <p className={styles.footer}>
          <Link
            href={isEdit && jobId ? `/jobs/${jobId}` : '/search'}
            className={styles.link}
          >
            Cancelar
          </Link>
        </p>
      </div>
    </div>
  );
}
