import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CSSProperties, MouseEvent } from 'react';
import { getVisiblePages } from '@/lib/pagination';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage = 1,
  totalPages = 10,
  onPageChange,
}: PaginationProps) {
  const pages = getVisiblePages(currentPage, totalPages);

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const stylePrevButton: CSSProperties = isFirstPage
    ? { pointerEvents: 'none', opacity: 0.5 }
    : {};
  const styleNextButton: CSSProperties = isLastPage
    ? { pointerEvents: 'none', opacity: 0.5 }
    : {};

  const handlePrevClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (isFirstPage === false) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (isLastPage === false) {
      onPageChange(currentPage + 1);
    }
  };

  const handleChangePage = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const page = Number(event.currentTarget.dataset.page);

    if (page !== currentPage) {
      onPageChange(page);
    }
  };

  const buildPageUrl = (page: number): string => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(page));
    return `${url.pathname}?${url.searchParams.toString()}`;
  };

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <a
        href={buildPageUrl(currentPage - 1)}
        style={stylePrevButton}
        onClick={handlePrevClick}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />
      </a>

      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          // biome-ignore-start lint/suspicious/noArrayIndexKey: los ellipsis son estaticos; el array se reconstruye en cada render
          <span
            key={`ellipsis-${index}`}
            className={styles.ellipsis}
            aria-hidden="true"
          >
            …
          </span>
          // biome-ignore-end lint/suspicious/noArrayIndexKey: los ellipsis son estaticos; el array se reconstruye en cada render
        ) : (
          <a
            key={page}
            data-page={page}
            href={buildPageUrl(page)}
            className={currentPage === page ? styles.isActive : ''}
            aria-current={currentPage === page ? 'page' : undefined}
            onClick={handleChangePage}
          >
            {page}
          </a>
        ),
      )}

      <a
        href={buildPageUrl(currentPage + 1)}
        style={styleNextButton}
        onClick={handleNextClick}
        aria-label="Página siguiente"
      >
        <ChevronRight size={16} />
      </a>
    </nav>
  );
}
