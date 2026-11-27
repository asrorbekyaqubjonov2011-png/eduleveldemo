import { NextRequest, NextResponse } from 'next/server';

/**
 * Old hostnames send their public pages to the canonical domain with a permanent redirect (path and query kept).
 * Only GET and HEAD on pages are redirected: API calls, webhooks and health checks keep working on every host.
 * Only the hosts listed here are redirected, so a redirect can never loop back to itself.
 */
const CANONICAL = 'https://edulevel.uz';
const REDIRECT_HOSTS = new Set(['edulevel-hdk8.onrender.com', 'www.edulevel.uz']);

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0];
  if (!REDIRECT_HOSTS.has(host)) return NextResponse.next();
  if (req.method !== 'GET' && req.method !== 'HEAD') return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/api/')) return NextResponse.next();
  return NextResponse.redirect(`${CANONICAL}${pathname}${search}`, 301);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|opengraph-image.png).*)']
};
