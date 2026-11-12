import { useLocation, useNavigate } from 'react-router';

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  function navigateTo(path: string): void {
    navigate(path);
  }

  return {
    currentPath: location.pathname,
    navigateTo,
  };
}
