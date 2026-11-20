import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/sign-out',
    '/api/me',
    '/api/classes(.*)',
    '/__clerk',
    '/__clerk/(.*)',
  ],
};
