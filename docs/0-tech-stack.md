Tech Stack & Architecture Overview
Runtime & Framework
The application is a Next.js 16 monolith using the App Router (src/app/) and React 19. All routing, rendering, and API handling are co-located in a single deployable unit targeting the Vercel edge/serverless infrastructure. The framework is configured in 

next.config.mjs
, which sets the remotePatterns allowlist for next/image to res.cloudinary.com only, and injects Link: rel=preconnect HTTP response headers for res.cloudinary.com, identitytoolkit.googleapis.com, and securetoken.googleapis.com on every route, reducing cold-connection latency by ~300ms on mobile clients. These same origins receive a <link rel="preconnect"> tag in the RSC-rendered <head> of 

src/app/layout.tsx
, making the optimisation apply to both HTTP/2 push and browser parse-time preconnect.

The root layout declares two Google Fonts loaded via next/font/google with display: "swap" to prevent render-blocking: Playfair Display (--font-playfair, the heading font) and Montserrat (--font-montserrat, the body font). Both are injected as CSS custom properties on the <html> element and consumed by Tailwind's font-heading / font-body utility classes defined in the design system. Google Analytics (tag G-2NJ0YC4YNT) is loaded via next/script with strategy="afterInteractive", deferring execution until after hydration.

The styling layer is Tailwind CSS 3.4 with @tailwindcss/typography. The design token foundation is declared in 

src/app/globals.css
 as CSS custom properties on :root:

css
--color-primary: #231416;
--color-background: #f6dcda;
--color-subtle-background: #cea3a6;
--color-accent: #2f1b23;
--color-text: #764a4d;
--color-text-on-primary: #faded2;
--color-border: #a39e9a;
--color-card-background: #eebbbb;
A fadeIn keyframe animation is registered as a Tailwind utility (.animate-page-enter) for route-transition entrance effects.

Full Dependency Stack
Declared in 

package.json
, the production dependency surface covers the following service boundaries:

Layer	Package(s)	Version
Framework	next, react, react-dom	16 / 19
Database	mongodb	^6.18.0
Auth (Client)	firebase	^12.1.0
Auth (Server)	firebase-admin	^13.4.0
Media CDN	cloudinary	^2.7.0
Real-time	pusher (server), pusher-js (client)	^5.3.3 / ^8.4.3
Email	resend, react-email, @react-email/components, @react-email/render	^6.1.2 / ^4.3.0
State management	zustand	^5.0.7
Forms	react-hook-form, @hookform/resolvers, zod	^7.69 / ^4.2.1
UI primitives	@radix-ui/* (checkbox, dialog, label, popover, select, slot, switch, tabs)	^1–2
Rich text	@tiptap/react, @tiptap/starter-kit, @tiptap/extension-image	^3.13
Charts	recharts	^3.6.0
Animation	framer-motion, lottie-react	^12 / ^2.4
Drag & drop	@dnd-kit/core, @dnd-kit/sortable	^6 / ^10
Date utilities	date-fns	^4.1.0
Carousel	embla-carousel-react	^8.6.0
Image crop	react-easy-crop	^5.5.6
Testing	cypress	^15.10.0
There is no Square SDK package in package.json. Payment processing infrastructure is not currently present in the dependency graph.

Two-Panel Architecture
The application is divided into two completely isolated route surfaces that share a MongoDB database and Firebase project but run on separate authentication credential stacks and separate UI shells:

Public Storefront — src/app/(client)/
The storefront is the customer-facing e-commerce surface. It is a Next.js route group wrapped in a shared storefront layout. Public pages (product catalog, collections, seasonal events, blog) are rendered as React Server Components and are statically or dynamically rendered depending on their data requirements. Pages requiring authentication (account profile, order history, checkout) are gated at the component level using the Zustand authStore. The storefront session is maintained via the session HTTP-only cookie, which is verified on demand by API routes rather than at the layout level.

Client-side interactivity is managed through three Zustand stores:

authStore — holds the current User profile fetched from /api/auth/profile after login
cartStore — manages the in-memory shopping cart (items, quantities, inscriptions, discounts, pricing)
settingsStore — caches the global AppSettings document (store open/closed state, delivery configuration, live chat toggle)
Admin Dashboard — src/app/bakery-manufacturing-orders/
The admin panel is a separate route tree accessed exclusively at /bakery-manufacturing-orders/*. Its root 

layout.tsx
 calls verifyAdmin() (from src/lib/auth/adminOnly.ts) as an awaited async operation on every render, making the route protection synchronous at the RSC layer — no client-side redirect logic is involved. The login page at /bakery-manufacturing-orders/login is exempted via an x-is-login-page header injected by Next.js middleware. The admin UI shell (AdminLayoutClient) is a dedicated client component providing a sidebar navigation, notification feeds, and context providers scoped exclusively to the admin surface.

High-Level Data Flow
Browser (Client SDK: firebase@12, pusher-js@8, zustand@5)
    │
    │  1. Google OAuth popup → Firebase ID token (JWT, 1-hr TTL)
    ▼
Next.js API Route (Vercel Serverless Function)
    │
    │  2. adminAuth.verifyIdToken(idToken, checkRevoked=true)
    │  3. MongoDB lookup → User document (role assertion)
    │  4. adminAuth.createSessionCookie() → HttpOnly cookie set
    ▼
Subsequent Requests (cookie attached automatically by browser)
    │
    │  5. RSC layout calls verifyAdmin() / verifyAdminAPI()
    │     → adminAuth.verifySessionCookie(cookie, checkRevoked=true)
    │     → decodedToken.admin custom claim checked
    ▼
MongoDB Atlas (Native Driver, connection-pool via clientPromise)
    │
    │  6. Business logic reads/writes: orders, products, users,
    │     custom-orders, schedule-settings, app-settings, chats
    ▼
Side Effects (dispatched from API route handlers)
    ├── Cloudinary SDK → image upload/delete (server-side, signed)
    ├── Resend API → transactional email (React Email templates)
    └── Pusher Server SDK → WebSocket event trigger (chat, notifications)
Image assets sourced from Cloudinary are served via the res.cloudinary.com CDN and rendered through next/image with automatic format negotiation (WebP/AVIF). The next.config.mjs remotePatterns entry enforces that no other external image hostname can be used.

Environment Variables Reference
All secrets are stored in .env.local (local development) and injected as Vercel Environment Variables in production. Variables prefixed with NEXT_PUBLIC_ are bundled into the client-side JavaScript; all others are server-only.

Firebase — Client SDK (src/lib/firebase/client.ts)
Variable	Purpose
NEXT_PUBLIC_FIREBASE_API_KEY	Initializes the Firebase client app; used for all client-side auth operations
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN	OAuth redirect domain; set to <project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID	Project identifier; used in Firebase SDK config and Admin SDK assertions
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET	Firebase Storage bucket (present in config; not actively used for uploads — Cloudinary is used instead)
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID	Required by Firebase SDK initialization
NEXT_PUBLIC_FIREBASE_APP_ID	Required by Firebase SDK initialization
Firebase — Admin SDK (src/lib/firebase/adminApp.ts)
Variable	Purpose
FIREBASE_ADMIN_PROJECT_ID	Identifies the Firebase project for the Admin SDK service account
FIREBASE_ADMIN_CLIENT_EMAIL	Service account email; used to sign Admin SDK requests
FIREBASE_ADMIN_PRIVATE_KEY	RSA private key for the service account (PEM format; \n escape sequences must be preserved). Used by verifyIdToken, verifySessionCookie, createSessionCookie, and generatePasswordResetLink
MongoDB (src/lib/db/index.ts)
Variable	Purpose
MONGODB_URI	Atlas connection string (SRV format). The native driver uses this to establish the connection pool via clientPromise
MONGODB_DB_NAME	Database name passed to client.db() on every query; isolates the data namespace from other databases in the same Atlas cluster
Cloudinary (src/lib/cloudinary.ts, src/lib/cloudinaryClient.ts)
Variable	Purpose
CLOUDINARY_CLOUD_NAME	Server-side: used by the cloudinary Node SDK for signed upload and delete operations
CLOUDINARY_API_KEY	Server-side: authenticates signed upload/delete API calls
CLOUDINARY_API_SECRET	Server-side: signs Cloudinary API requests — must never be exposed to the client
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME	Client-side: used by cloudinaryClient.ts to construct unsigned upload URLs via the Cloudinary Upload API
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET	Client-side: the unsigned upload preset name configured in the Cloudinary dashboard, scoped to a specific folder and transformation policy
Pusher (src/lib/pusher-server.ts, src/lib/pusher-client.ts)
Variable	Purpose
PUSHER_APP_ID	Server-side app identifier; required by the Pusher server SDK to target the correct channel namespace
PUSHER_SECRET	Server-side secret; used to sign event triggers and authenticate private channel requests
NEXT_PUBLIC_PUSHER_KEY	Client-side app key; used to initialize PusherClient in the browser
NEXT_PUBLIC_PUSHER_CLUSTER	Geographic cluster (e.g. us3); used by both server and client SDK to route WebSocket connections
Resend / Email (src/lib/email.ts)
Variable	Purpose
RESEND_API_KEY	Authenticates all outbound email API calls to Resend
ADMIN_EMAIL	The "from" address used as the sender identity for transactional emails (order confirmations, password resets, custom order notifications)
Application (src/app/api/auth/reset-password/route.ts, storefront)
Variable	Purpose
NEXT_PUBLIC_API_URL	Base URL for constructing branded password reset links and other internal absolute URLs; falls back to VERCEL_URL then http://localhost:3000
NEXT_PUBLIC_BAKERY_DM_HANDLE_INSTAGRAM	Public Instagram handle displayed in social links and custom order DM prompts
NEXT_PUBLIC_BAKERY_DM_HANDLE_FACEBOOK	Public Facebook page URL displayed in social links