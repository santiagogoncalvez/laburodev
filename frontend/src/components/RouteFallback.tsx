import { useLocation } from 'react-router';
import { HomePageSkeleton } from './HomePageSkeleton';
import { JobDetailPageSkeleton } from './JobDetailPageSkeleton';
import { PageSkeleton } from './PageSkeleton';
import { SearchPageSkeleton } from './SearchPageSkeleton';

export function RouteFallback() {
  const { pathname } = useLocation();

  if (pathname === '/') return <HomePageSkeleton />;
  if (pathname === '/search') return <SearchPageSkeleton />;
  if (pathname.startsWith('/jobs/')) return <JobDetailPageSkeleton />;
  return <PageSkeleton />;
}
