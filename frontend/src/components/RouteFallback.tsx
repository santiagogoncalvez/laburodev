import { useLocation } from "react-router";
import { HomePageSkeleton } from "./HomePageSkeleton";
import { SearchPageSkeleton } from "./SearchPageSkeleton";
import { JobDetailPageSkeleton } from "./JobDetailPageSkeleton";
import { PageSkeleton } from "./PageSkeleton";

export function RouteFallback() {
   const { pathname } = useLocation();

   if (pathname === "/") return <HomePageSkeleton />;
   if (pathname === "/search") return <SearchPageSkeleton />;
   if (pathname.startsWith("/jobs/")) return <JobDetailPageSkeleton />;
   return <PageSkeleton />;
}
