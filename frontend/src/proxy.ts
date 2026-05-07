import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/signup', '/pending', '/dsr/submit'];

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('connect.sid');
  const { pathname } = request.nextUrl;

  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
