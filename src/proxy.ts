import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminSessionCookie = request.cookies.get("admin_session")?.value;

  const isProtectedAdminPath = 
    pathname.startsWith("/bakery-manufacturing-orders") || 
    pathname.startsWith("/api/admin");

  const isLoginPage = pathname.startsWith("/bakery-manufacturing-orders/login");
  const isAuthEndpoint = pathname.startsWith("/api/admin/auth/sessionLogin");

  // 1. Check if path is protected
  if (isProtectedAdminPath && !isLoginPage && !isAuthEndpoint) {
    
    // 2. EXCEPTION: Allow 2FA APIs to pass through (Chicken & Egg)
    if (pathname.startsWith("/api/admin/2fa")) {
        return NextResponse.next();
    }

    // 3. Check Session (Layer 1)
    if (!adminSessionCookie) {
      if (pathname.startsWith("/api/")) {
         return NextResponse.json({ error: "Unauthorized: Missing admin session." }, { status: 401 });
      }
      const loginUrl = new URL("/bakery-manufacturing-orders/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 4. Check Device Verification (Layer 3)
    const isDeviceVerified = request.cookies.get("admin_device_verified")?.value === "true";

    if (!isDeviceVerified) {
       // Stop API calls if not verified
       if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Device Verification Required" }, { status: 403 });
       }
       // Redirect pages to Verification Page
       return NextResponse.redirect(new URL("/verify-access", request.url));
    }
  }

  // Auto-skip verify page if already verified
  if (pathname === "/verify-access") {
     const isDeviceVerified = request.cookies.get("admin_device_verified")?.value === "true";
     if (adminSessionCookie && isDeviceVerified) {
        return NextResponse.redirect(new URL("/bakery-manufacturing-orders", request.url));
     }
  }

  const requestHeaders = new Headers(request.headers);
  if (isLoginPage) {
      requestHeaders.set('x-is-login-page', 'true');
  }

  return NextResponse.next({
      request: {
          headers: requestHeaders,
      }
  });
}


export const config = {
  matcher: [
    "/bakery-manufacturing-orders/:path*",
    "/api/admin/:path*",
    "/verify-access"
  ],
};
