/**
 * NextAuth.js Middleware
 * Protects routes that require authentication
 *
 * Currently configured to be permissive (no protected routes by default)
 * Uncomment the matcher to protect specific routes
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // Allow all requests by default
  // The app works without authentication in development

  // To protect routes, uncomment and customize:
  // const isLoggedIn = !!req.auth;
  // const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
  //                    req.nextUrl.pathname.startsWith('/register');
  //
  // if (!isLoggedIn && !isAuthPage) {
  //   const signInUrl = new URL('/login', req.nextUrl.origin);
  //   signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
  //   return NextResponse.redirect(signInUrl);
  // }

  return NextResponse.next();
});

export const config = {
  // Skip middleware for static files and API routes (except auth routes)
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
