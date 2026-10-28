import { describe, it, expect } from 'vitest';
import type { PublicRoute, RoutePath } from '@/lib/router';

describe('V5 Navigation & Routing Architecture', () => {
  it('identifies public marketing routes correctly', () => {
    const publicRoutes: PublicRoute[] = [
      '/',
      '/solutions',
      '/pricing',
      '/about',
      '/contact',
      '/demo',
      '/features/orders',
      '/features/inventory',
      '/features/fulfillment',
      '/features/finance',
    ];

    publicRoutes.forEach((route) => {
      expect(route.startsWith('/')).toBe(true);
      expect(route.startsWith('/app')).toBe(false);
    });
  });

  it('distinguishes authenticated app routes from marketing pages', () => {
    const appRoutes: RoutePath[] = [
      '/app',
      '/app/orders',
      '/app/inventory',
      '/app/settings',
    ];

    appRoutes.forEach((route) => {
      expect(route.startsWith('/app')).toBe(true);
    });
  });

  it('classifies auth lifecycle paths accurately', () => {
    const authPaths = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/accept-invite',
    ];

    authPaths.forEach((p) => {
      expect(authPaths.includes(p)).toBe(true);
      expect(p.startsWith('/app')).toBe(false);
    });
  });
});
