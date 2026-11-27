import { NextRequest, NextResponse } from 'next/server';

/** Browsers request /favicon.ico on every page. The site's icon is app/icon.png, so send them there. */
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/icon.png', req.url), 308);
}
