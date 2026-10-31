import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Pagination } from '../components/Pagination.jsx'
import { SearchFormSection } from '../components/SearchFormSection.jsx'
import { JobListings } from '../components/JobListings.jsx'
import { SearchResultsSkeleton } from '../components/SearchResultsSkeleton.jsx'
import { Skeleton } from '../components/Skeleton.jsx'
import { API_URL } from '../config.js'
import styles from './Search.module.css'

const RESULTS_PER_PAGE = 4

const useFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const readFromParams = (sp) => {
    const page = Number(sp.get('page'))
    return {
      filters: {
        technology: sp.get('technology') || '',
        location: sp.get('type') || '',
        experienceLevel: sp.get('level') || ''
      },
      text: sp.get('text') || '',
      page: Number.isInteger(page) && page > 0 ? page : 1
    }
  }

  const [filters, setFilters] = useState(() => readFromParams(searchParams).filters)

  const [textToFilter, setTextToFilter] = useState(() => readFromParams(searchParams).text)

  const [currentPage, setCurrentPage] = useState(() => readFromParams(searchParams).page)

  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true)

        const params = new URLSearchParams()
        if (textToFilter) params.append('text', textToFilter)
        if (filters.technology) params.append('technology', filters.technology)
        if (filters.location) params.append('type', filters.location)
        if (filters.experienceLevel) params.append('level', filters.experienceLevel)

        const offset = (currentPage - 1) * RESULTS_PER_PAGE
        params.append('limit', RESULTS_PER_PAGE)
        params.append('offset', offset)

        const queryParams = params.toString()
      
        const response = await fetch(
           `${API_URL}/jobs?${queryParams}`,
        );

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}))
          throw new Error(errBody.message || `Error ${response.status}`)
        }

        const json = await response.json()

        setJobs(json.data ?? [])
        setTotal(json.total ?? 0)
        setError(null)
      } catch (error) {
        setError('No se pudieron cargar los empleos. Revisá que la API esté corriendo.')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [filters, currentPage, textToFilter])

  // Atrás/adelante del navegador: la URL manda, el estado la sigue.
  // Este efecto nunca escribe la URL, solo la lee: no hay ciclo posible.
  useEffect(() => {
    const next = readFromParams(searchParams)

    setFilters((f) => (
      f.technology === next.filters.technology &&
      f.location === next.filters.location &&
      f.experienceLevel === next.filters.experienceLevel
    ) ? f : next.filters)
    setTextToFilter((t) => (t === next.text ? t : next.text))
    setCurrentPage((p) => (p === next.page ? p : next.page))
  }, [searchParams])

  // La URL solo se escribe acá (acciones del usuario), nunca en efectos.
  const writeParams = ({ text, filters, page }) => {
    const params = new URLSearchParams()
    if (text) params.set('text', text)
    if (filters.technology) params.set('technology', filters.technology)
    if (filters.location) params.set('type', filters.location)
    if (filters.experienceLevel) params.set('level', filters.experienceLevel)

    if (page > 1) params.set('page', page)

    return params
  }

  const totalPages = Math.ceil(total / RESULTS_PER_PAGE)

  const handlePageChange = (page) => {
    setSearchParams(writeParams({ text: textToFilter, filters, page }))
    // Misma ruta (?page=): el reset general no dispara, el scroll va en la acción
    window.scrollTo(0, 0)
  }

  const handleSearch = (nextFilters) => {
    setSearchParams(writeParams({ text: textToFilter, filters: nextFilters, page: 1 }))
  }

  const handleTextFilter = (newTextToFilter) => {
    // replace: tipear no llena el historial de entradas intermedias
    setSearchParams(
      writeParams({ text: newTextToFilter, filters, page: 1 }),
      { replace: true }
    )
  }

  // Mismo mecanismo que la cruz del buscador: limpia el texto vía URL
  const handleClearSearch = () => {
    handleTextFilter("")
  }

  return {
    filters,
    loading,
    error,
    jobs,
    total,
    totalPages,
    currentPage,
    textToFilter,
    handlePageChange,
    handleSearch,
    handleTextFilter,
    handleClearSearch
  }
}

export default function SearchPage() {
  const {
    filters,
    jobs,
    total,
    loading,
    error,
    totalPages,
    currentPage,
    textToFilter,
    handlePageChange,
    handleSearch,
    handleTextFilter,
    handleClearSearch
  } = useFilters()

  const title = loading
    ? `Cargando... - laburoDev`
    : `Resultados: ${total}, Página ${currentPage} - laburoDev`

  return (
    <main>
      <title>{title}</title>
      <meta name="description" content="Explora miles de oportunidades laborales en el sector tecnológico. Encontrá tu próximo empleo en laburoDev." />

      <SearchFormSection
        initialText={textToFilter}
        initialFilters={filters}
        onSearch={handleSearch}
        onTextFilter={handleTextFilter}
      />

      <section className={styles.searchResults}>
        {
          loading
            ? <>
                <Skeleton style={{ width: "12rem", height: "1rem", marginBottom: "var(--space-4)" }} />
                <SearchResultsSkeleton count={RESULTS_PER_PAGE} />
              </>
            : error
              ? <p className="error-text">{error}</p>
              : <>
                  <p className={styles.resultCount}>{total} resultado{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}</p>
                  <JobListings jobs={jobs} onClear={handleClearSearch} />
                </>
        }
        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        )}
      </section>
    </main>
  )
}
