// Keeps /admin and /preview behind the admin password. Everyone else is sent to the coming soon page.
import { next } from '@vercel/functions';
import { isAdmin } from './lib/auth.js';

export const config = { matcher: ['/admin', '/admin/:path*', '/preview', '/preview/:path*'] };

export default async function middleware(request) {
  if (await isAdmin(request)) return next({ headers: { 'cache-control': 'private, no-store' } });
  return Response.redirect(new URL('/?login=1', request.url), 302);
}
