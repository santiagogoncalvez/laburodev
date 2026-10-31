import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getVisiblePages } from '../lib/pagination.js'
import styles from './Pagination.module.css'

export function Pagination ({ currentPage = 1, totalPages = 10, onPageChange }) {
  const pages = getVisiblePages(currentPage, totalPages)

  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages

  const stylePrevButton = isFirstPage ? { pointerEvents: 'none', opacity: 0.5 } : {}
  const styleNextButton = isLastPage ? { pointerEvents: 'none', opacity: 0.5 } : {}

  const handlePrevClick = (event) => {
    event.preventDefault()
    if (isFirstPage === false) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextClick = (event) => {
    event.preventDefault()
    if (isLastPage === false) {
      onPageChange(currentPage + 1)
    }
  }

  const handleChangePage = (event) => {
    event.preventDefault()
    const page = Number(event.currentTarget.dataset.page)

    if (page !== currentPage) {
      onPageChange(page)
    }
  }

  const buildPageUrl = (page) => {
    const url = new URL(window.location)
    url.searchParams.set('page', page)
    return `${url.pathname}?${url.searchParams.toString()}`
  }

  return (
    <nav className={styles.pagination} aria-label="Paginación">

      <a href={buildPageUrl(currentPage - 1)} style={stylePrevButton} onClick={handlePrevClick} aria-label="Página anterior">
        <ChevronLeft size={16} />
      </a>


      {pages.map((page, index) => (
        page === 'ellipsis'
          ? <span key={`ellipsis-${index}`} className={styles.ellipsis} aria-hidden="true">…</span>
          : <a
              key={page}
              data-page={page}
              href={buildPageUrl(page)}
              className={currentPage === page ? styles.isActive : ''}
              aria-current={currentPage === page ? 'page' : undefined}
              onClick={handleChangePage}
            >
              {page}
            </a>
      ))}

      <a href={buildPageUrl(currentPage + 1)} style={styleNextButton} onClick={handleNextClick} aria-label="Página siguiente">
        <ChevronRight size={16} />
      </a>


    </nav>
  )
}
