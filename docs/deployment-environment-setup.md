Deployment & Environment Setup
The application is a Next.js 16 App Router monolith deployed to Vercel. All secrets live in .env.local for local development and are mirrored as Environment Variables in the Vercel project dashboard. Variables prefixed with NEXT_PUBLIC_ are embedded in the client bundle; all others are server-only and must never be referenced from client components.

VERCEL_URL and NODE_ENV are injected automatically by Vercel/Next.js and do not need to be set manually.

.env.local Template

# ─────────────────────────────────────────────────────────────────────────────

# MongoDB Atlas

# ─────────────────────────────────────────────────────────────────────────────

MONGODB_URI=mongodb+srv://<db-user>:<password>@<cluster-host>/<db-name>?retryWrites=true&w=majority
MONGODB_DB_NAME=homemade-cakes

# ─────────────────────────────────────────────────────────────────────────────

# Firebase — Client SDK (src/lib/firebase/client.ts)

# Single Web App config shared by storefront + admin Google OAuth surfaces

# ─────────────────────────────────────────────────────────────────────────────

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ─────────────────────────────────────────────────────────────────────────────

# Firebase — Admin SDK (src/lib/firebase/adminApp.ts)

# Service account used for verifyIdToken, createSessionCookie, generatePasswordResetLink

# ─────────────────────────────────────────────────────────────────────────────

FIREBASE_ADMIN_PROJECT_ID=<project-id>
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@<project-id>.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# ─────────────────────────────────────────────────────────────────────────────

# Cloudinary (src/lib/cloudinary.ts, src/lib/cloudinaryClient.ts, src/app/api/admin/upload/route.ts)

# ─────────────────────────────────────────────────────────────────────────────

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<unsigned-preset-name>
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz

# ─────────────────────────────────────────────────────────────────────────────

# Pusher (src/lib/pusher-server.ts, src/lib/pusher-client.ts)

# ─────────────────────────────────────────────────────────────────────────────

PUSHER_APP_ID=1234567
NEXT_PUBLIC_PUSHER_KEY=abcdef1234567890
PUSHER_SECRET=abcdef1234567890
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# ─────────────────────────────────────────────────────────────────────────────

# Resend / Email (src/lib/email.ts)

# ─────────────────────────────────────────────────────────────────────────────

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=<orders@yourdomain.com>
RESEND_FROM=<orders@yourdomain.com>
ADMIN_EMAIL=<admin@yourdomain.com>

# ─────────────────────────────────────────────────────────────────────────────

# Square (schema reservation — NOT read by any route today)

# Required when Web Payments SDK + Payments API integration is implemented

# ─────────────────────────────────────────────────────────────────────────────

SQUARE_ENVIRONMENT=sandbox
SQUARE_APPLICATION_ID=sandbox-sq0idb-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sandbox-sq0idb-xxxxxxxxxxxxxxxx
SQUARE_ACCESS_TOKEN=EAAAxxxxxxxxxxxxxxxx
SQUARE_LOCATION_ID=LXXXXXXXXXXXXX
SQUARE_WEBHOOK_SIGNATURE_KEY=xxxxxxxxxxxxxxxx

# ─────────────────────────────────────────────────────────────────────────────

# Application / Hosting

# ─────────────────────────────────────────────────────────────────────────────

NEXT_PUBLIC_API_URL=<https://your-production-domain.com>
NEXT_PUBLIC_APP_URL=<https://your-production-domain.com>
NEXT_PUBLIC_BAKERY_DM_HANDLE_INSTAGRAM=yourbakery
NEXT_PUBLIC_BAKERY_DM_HANDLE_FACEBOOK=yourbakerypage
NEXT_PUBLIC_BAKERY_DM_HANDLE=yourbakery
Variable Consumed by Notes
CLOUDINARY_CLOUD_NAME
src/app/api/admin/upload/route.ts
Signed upload preset flow; set equal to NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
EMAIL_FROM / RESEND_FROM
src/lib/email.ts
EMAIL_FROM takes precedence; both resolve DEFAULT_FROM sender identity
ADMIN_EMAIL
src/app/api/orders/route.ts, src/app/api/contact/route.ts
Recipient for admin notification emails, not the From address
NEXT_PUBLIC_API_URL
Email templates, password reset, RSC fetch base URLs
Primary canonical origin; falls back to https://${VERCEL_URL} then localhost:3000
NEXT_PUBLIC_APP_URL
src/app/sitemap.ts
Sitemap absolute URLs only
Square vars
—
PaymentDetails.method: 'square' exists in types; no Square SDK in package.json; checkout UI is placeholder
Vercel Deployment
Import the Git repository into a new Vercel project. Framework preset: Next.js. Root directory: repository root. Build command: npm run build. Output: default (.next).
Environment variables — copy every key from the template above into Project → Settings → Environment Variables. Scope each variable to Production, Preview, and Development as appropriate. Server-only keys (FIREBASE_ADMIN_*, MONGODB_URI, PUSHER_SECRET, CLOUDINARY_API_SECRET, RESEND_API_KEY, SQUARE_ACCESS_TOKEN) must never be prefixed with NEXT_PUBLIC_.
Canonical URL — set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_URL to the production custom domain (e.g. <https://shop.example.com>). Password-reset links, order confirmation CTAs, and React Email baseUrl resolution depend on this. Without it, emails fall back to the ephemeral VERCEL_URL preview hostname.
FIREBASE_ADMIN_PRIVATE_KEY on Vercel — paste the PEM as a single line with literal \n escape sequences between lines, wrapped in double quotes. The Admin SDK normalizes via .replace(/\\n/g, "\n") in adminApp.ts.
Serverless constraints — API routes and RSC layouts run as Vercel Functions. MongoDB connections are pooled via clientPromise in src/lib/db/index.ts to survive warm-instance reuse. Cold starts incur ~200–500 ms latency on first DB hit.
Image CDN — next.config.mjs whitelists only res.cloudinary.com in images.remotePatterns. No additional image hostnames will resolve through next/image without a config change.
Admin route protection — src/proxy.ts middleware matcher covers /bakery-manufacturing-orders/* and /api/admin/*. Layer-1 gate checks admin_session cookie presence only; cryptographic verification happens in RSC (verifyAdmin) and API handlers (verifyAdminAPI).
Preview deployments — add each *.vercel.app hostname to Firebase Authorized domains. Add the preview origin to MongoDB Atlas IP allowlist (or use 0.0.0.0/0 for serverless).
MongoDB Atlas
Create a M0+ cluster in a region geographically close to the Vercel deployment region (e.g. us-east-1 ↔ US East).
Database user — create a user with readWrite on the target database. Construct MONGODB_URI in SRV format: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority.
Network access — Vercel serverless egress IPs are dynamic. For development/production on Vercel, allow 0.0.0.0/0 (restrict in production with Vercel Secure Compute static IPs if on Enterprise). For local dev, add your current public IP.
Database name — set MONGODB_DB_NAME to the logical database namespace (e.g. homemade-cakes). Every route calls client.db(process.env.MONGODB_DB_NAME) — the URI path segment is not used for db selection.
Seed — run npx tsx seed.ts locally (requires MONGODB_URI in .env.local) to populate catalog fixtures. Collections are created implicitly on first write.
Indexes — ensure compound indexes on high-traffic query paths (users.firebaseUid, orders.userId, orders.status, chats.userId) in Atlas or via migration scripts before production traffic.
Firebase Project Configuration
The storefront (src/app/(client)/*) and admin dashboard (src/app/bakery-manufacturing-orders/*) are two isolated authentication surfaces, not two Firebase projects. Both share:

One Firebase project
One Web App registration (the NEXT_PUBLIC_FIREBASE_*block)
One Admin SDK service account (FIREBASE_ADMIN_*)
One firebase-admin instance (src/lib/firebase/adminApp.ts)
Isolation is enforced at the session cookie layer, not the Firebase client config layer:

Surface Cookie Set by sameSite Authorization
Storefront
session
POST /api/auth/sessionLogin
lax
MongoDB User.role on write ops; self-healing upsert on first login
Admin
admin_session
POST /api/admin/auth/sessionLogin
strict
MongoDB role === 'admin' and Firebase custom claim admin: true
Console setup steps:

Authentication → Sign-in method — enable Google provider. Add support email.
Authentication → Settings → Authorized domains — add localhost, production domain, and Vercel preview domains.
Project settings → General → Your apps — register one Web app. Copy the firebaseConfig object fields into the six NEXT_PUBLIC_FIREBASE_* variables.
Project settings → Service accounts — generate a new private key (JSON). Map project_id → FIREBASE_ADMIN_PROJECT_ID, client_email → FIREBASE_ADMIN_CLIENT_EMAIL, private_key → FIREBASE_ADMIN_PRIVATE_KEY.
Admin user bootstrap (one-time per operator):
Operator signs in via Google on the storefront (creates users document with role: "customer").
In MongoDB: db.users.updateOne({ email: "..." }, { $set: { role: "admin" } }).
Via Admin SDK script or Firebase console Cloud Functions: adminAuth.setCustomUserClaims(uid, { admin: true }).
Operator must sign out and sign in again at /bakery-manufacturing-orders/login so the ID token carries the refreshed claim. verifyAdmin() reads decodedToken.admin === true; MongoDB role alone is insufficient for RSC layout access.
Password reset — Firebase generates oobCode links server-side (adminAuth.generatePasswordResetLink), but the app rewrites them to ${NEXT_PUBLIC_API_URL}/reset-password?oobCode=... and delivers via Resend. Disable or ignore Firebase's default email templates.
Firebase Storage (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) is present in client config but not used for uploads — all media flows through Cloudinary.

Cloudinary
Create a Cloudinary account. Note the Cloud name, API Key, and API Secret from the dashboard.
Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and CLOUDINARY_CLOUD_NAME to the same value. src/lib/cloudinary.ts reads the public name; src/app/api/admin/upload/route.ts reads CLOUDINARY_CLOUD_NAME for signed preset generation.
Unsigned upload preset (client-direct uploads from admin forms and custom-order wizard):
Settings → Upload → Upload presets → Add preset.
Signing mode: Unsigned.
Folder: e.g. homemade-cakes/ (organize by environment: homemade-cakes/dev/, homemade-cakes/prod/).
Allowed formats: jpg, png, webp, gif, mp4 (video banner).
Copy preset name to NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.
Signed uploads — admin routes that call POST /api/admin/upload require CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET for cloudinary.utils.api_sign_request.
Delivery — assets are served from res.cloudinary.com. next/image and next.config.mjs preconnect headers target this origin. Server-side deletes use the Cloudinary Admin API via src/lib/cloudinary.ts.
Pusher Channels
Create a Channels app in the Pusher dashboard. Note app_id, key, secret, and cluster.

Map to env: PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER. Server (src/lib/pusher-server.ts) and client (src/lib/pusher-client.ts) must use the same key/cluster pair.

Client auth endpoint — both client instances point to authEndpoint: "/api/pusher/auth". No additional Pusher dashboard configuration is required; authorization is application-managed.

Private channel namespace:

Channel Subscribers Events Authorization rule (/api/pusher/auth)
private-admin-inbox
Admin UI only
inbox-update
user.role === 'admin'
private-chat-{chatId}
Customer + admin
new-message, typing-update
Customer: chat.userId === user._id; Admin: bypass ownership check
Server triggers — src/app/api/chat/message/route.ts fires new-message on the chat channel and inbox-update on the admin inbox. src/app/api/chat/typing/route.ts fires typing-update.

Enable client events — not required; all events are server-triggered via pusherServer.trigger.

TLS — useTLS: true is hardcoded in the server SDK config.

Square Developer Account
Square integration is not implemented in the current codebase: no Square SDK in package.json, checkout PaymentForm is a UI placeholder, and custom-order conversion returns a mock payment URL. The PaymentDetails.method union includes 'square' as a schema reservation for future admin-recorded payments.

When integrating, provision a Square Developer account and configure:

Application — create an app at developer.squareup.com. Obtain Application ID and Access Token for Sandbox; repeat for Production after OAuth review.
Location — create or select a Square location; copy Location ID (SQUARE_LOCATION_ID). All payment requests are location-scoped.
Environment — set SQUARE_ENVIRONMENT=sandbox for non-production. Sandbox Application ID is prefixed sandbox-sq0idb-; production omits the prefix.
Client SDK — expose Application ID to the browser as NEXT_PUBLIC_SQUARE_APPLICATION_ID for Web Payments SDK initialization. Keep SQUARE_ACCESS_TOKEN server-only for Payments API (CreatePayment, CreatePaymentLink).
Webhooks — register a webhook subscription pointing to https://<domain>/api/webhooks/square (route does not exist yet). Store the signature key as SQUARE_WEBHOOK_SIGNATURE_KEY for HMAC verification of x-square-hmacsha256-signature.
Custom-order payment links — POST /api/admin/custom-orders/[id]/convert currently returns <https://mock-payment-gateway.com/checkout/{id}>. Replace with Square Payment Links API or Checkout API when wiring live payments.
PCI scope — use Square Web Payments SDK for card tokenization in the browser; never pass raw card data through Next.js API routes.
