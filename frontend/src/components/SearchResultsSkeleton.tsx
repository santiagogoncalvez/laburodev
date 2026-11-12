import { JobCardSkeleton } from './JobCardSkeleton';
import { Skeleton } from './Skeleton';

interface SearchResultsSkeletonProps {
  count?: number;
}

export function SearchResultsSkeleton({
  count = 4,
}: SearchResultsSkeletonProps) {
  return (
    <>
      <div
        className="jobs-listings"
        role="status"
        aria-label="Cargando empleos"
      >
        {Array.from({ length: count }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders estaticos; nunca se reordenan
          <JobCardSkeleton key={i} />
        ))}
      </div>
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          marginTop: 'var(--space-5)',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--r-full)',
            }}
          />
        ))}
      </div>
    </>
  );
}
