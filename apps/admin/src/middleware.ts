import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for setup routes and API
  if (pathname.startsWith('/setup') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  try {
    // Check if setup is needed
    const setupCheckUrl = new URL('/api/setup/check', request.url);
    const response = await fetch(setupCheckUrl);
    const status = await response.json();

    // Redirect to setup if not installed
    if (!status.installed) {
      return NextResponse.redirect(new URL('/setup', request.url));
    }
  } catch (error) {
    // If check fails, redirect to setup
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};