import { useState, useEffect, useCallback } from 'react';

export type PublicRoute = 
  | '/'
  | '/solutions'
  | '/features/orders'
  | '/features/inventory'
  | '/features/fulfillment'
  | '/features/finance'
  | '/pricing'
  | '/about'
  | '/contact'
  | '/demo'
  | '/login'
  | '/register'
  | '/forgot-password'
  | '/reset-password'
  | '/verify-email'
  | '/accept-invite'
  | '/onboarding';

export type AppRoute = `/app` | `/app/${string}`;

export type RoutePath = PublicRoute | AppRoute | string;

/**
 * Lightweight, URL-synced client-side router
 */
export function useRouter() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path: RoutePath, replace = false) => {
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return {
    path: currentPath,
    navigate: navigateTo,
    isApp: currentPath.startsWith('/app'),
    isOnboarding: currentPath === '/onboarding',
    isAuth: [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/accept-invite'
    ].includes(currentPath),
  };
}
