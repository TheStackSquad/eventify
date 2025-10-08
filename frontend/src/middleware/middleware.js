// frontend/middleware.js

import { NextResponse } from "next/server";

// Step 1: Define protected routes that require authentication
const protectedRoutes = ["/dashboard"];

// Step 2: Define public routes that should redirect if already authenticated
const authRoutes = ["/login", "/signup"];

// Get the backend API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// --- Middleware Function ---
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const requestCookie = request.headers.get("cookie") || "N/A";
  console.log("--- MIDDLEWARE START ---");
  console.log(`LOG: Path: ${pathname}`);
  console.log(
    `LOG: Cookies in request: ${
      requestCookie.length > 50
        ? requestCookie.substring(0, 50) + "..."
        : requestCookie
    }`
  );

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route)); // Log the path type and skip check

  if (!isProtectedRoute && !isAuthRoute) {
    console.log("LOG: Path is public and not an auth route. Proceeding.");
    console.log("--- MIDDLEWARE END ---\n");
    return NextResponse.next();
  }
  console.log(`LOG: Is Protected Route: ${isProtectedRoute}`);
  console.log(`LOG: Is Auth Route: ${isAuthRoute}`); // --- Secure Session Check via Backend API ---

  let isAuthenticated = false;
  const authCheckEndpoint = `${API_URL}/auth/me`;

  try {
    console.log(`LOG: Checking session at: ${authCheckEndpoint}`); // CRITICAL: Forward the user's cookies to the backend.

    const apiResponse = await fetch(authCheckEndpoint, {
      method: "GET",
      headers: {
        Cookie: requestCookie, // Use the logged cookie string
      },
      cache: "no-store",
    }); // Log the backend response status

    console.log(`LOG: Backend response status: ${apiResponse.status}`);

    isAuthenticated = apiResponse.ok;
    console.log(`LOG: Authentication result: ${isAuthenticated}`);
  } catch (error) {
    console.error(
      "ERROR: Middleware failed to reach backend API for session check:",
      error.message
    );
    isAuthenticated = false;
  } // --- Redirect Logic --- // Step 7: Redirect unauthenticated users from protected routes

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    console.log(
      `LOG: Protected path accessed without auth. REDIRECTING to ${loginUrl.pathname}`
    );
    console.log("--- MIDDLEWARE END ---\n");
    return NextResponse.redirect(loginUrl);
  } // Step 8: Redirect authenticated users away from auth pages

  if (isAuthRoute && isAuthenticated) {
    console.log(
      "LOG: Auth path accessed while authenticated. REDIRECTING to /dashboard"
    );
    console.log("--- MIDDLEWARE END ---\n");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } // Step 9: Allow request to proceed if checks pass

  console.log("LOG: Access granted. Proceeding to page render.");
  console.log("--- MIDDLEWARE END ---\n");
  return NextResponse.next();
}

// --- Configuration ---
export const config = {
  matcher: [
    /* Match all request paths except static assets */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
