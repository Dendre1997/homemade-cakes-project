# D&K Creations — Bakery E-Commerce & ERP Platform

# 1. Project Title & Overview

D&K Creations is a full-stack bakery e-commerce and manufacturing operations platform built as a Next.js monolith. It unifies a public-facing storefront with a secure administrative ERP dashboard, sharing a single MongoDB database and Firebase identity project while enforcing strict isolation between customer and operator session surfaces. The system is designed for high-complexity bakery workflows: configurable catalog products (cakes, sets, combos), server-authoritative pricing with promotions, manufacturing capacity constraints, and bespoke custom-order intake that converts into production orders.

The architecture is organized as a dual-panel application. The **client storefront** (`src/app/(client)/`) delivers catalog browsing, cart management, split-order checkout, account profiles, and live support chat. The **admin dashboard** (`src/app/bakery-manufacturing-orders/`) provides catalog CRUD, schedule configuration, order fulfilment, analytics, content management, and real-time customer support — protected at the RSC layout layer via Firebase session cookies and custom admin claims. Business logic that cannot be trusted to the browser (pricing, discount validation, capacity allocation, order persistence) executes exclusively in API routes and server actions.

The live production deployment is available at **[https://d-kcreations.com](https://d-kcreations.com)**.

# 2. Tech Stack Overview

- **Next.js 16 App Router** — React Server Components, co-located API routes, Vercel serverless deployment
- **React 19** — Client interactivity for cart, checkout, admin dashboards, and real-time widgets
- **TypeScript** — Strict typing across types, API contracts, and UI components
- **MongoDB Native Driver** — Direct collection access, aggregation pipelines, connection pooling for serverless
- **Firebase Authentication** — Google OAuth on the client; Admin SDK for session cookies and token verification
- **Zustand** — Persistent cart, auth, and settings stores on the storefront
- **Tailwind CSS** — Design-token-driven styling with Radix UI primitives and Framer Motion
- **Cloudinary** — Image and video upload, CDN delivery, signed admin uploads, asset deletion
- **Pusher** — Private WebSocket channels for support chat and admin inbox notifications
- **Resend** — Transactional email delivery via React Email JSX templates
- **React Hook Form + Zod** — Validated forms across checkout and admin surfaces
- **Recharts** — Admin analytics visualizations

# 3. Highlighted Technical Features

- **Algorithmic Capacity & Split-Order Scheduling** — Daily manufacturing minutes are computed from category-level bake times and `ScheduleSettings`; when a cart exceeds single-day capacity, checkout expands items into `UniqueCartItem` units and requires per-date slot assignment before order submission.
- **Custom Order State Machine (Drafts to Production)** — Multi-step client intake creates `CustomOrder` documents; admins price, annotate, and convert requests into `Order` records via a relational resolution pipeline with status transitions from `pending_review` through `converted`.
- **Real-time Support Chat (Pusher WebSockets)** — Bot-guided intake escalates to human operators over `private-chat-{chatId}` channels with tenant-isolated authorization at `/api/pusher/auth` and a global `private-admin-inbox` stream for operators.
- **Native MongoDB `$facet` Aggregation for Analytics** — The admin analytics API executes a single multi-branch aggregation to return KPI totals, time-series revenue, status distributions, and top-product rankings in one round trip.
- **Dual-layer Authentication (Client vs. Admin Claims)** — Storefront sessions (`session` cookie, self-healing MongoDB upsert) and admin sessions (`admin_session` cookie, `sameSite: strict`) share one Firebase Web App but require both MongoDB `role: "admin"` and Firebase custom claim `admin: true` for dashboard access.

# 4. Quick Start & Deployment

**Prerequisites:** Node.js 18+, MongoDB Atlas cluster, Firebase project with service account, Cloudinary account, Pusher Channels app, and Resend API key.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.local` variables from the deployment guide before exercising auth, database, or third-party integrations.

Full deployment instructions, infrastructure provisioning (Vercel, Atlas, Firebase, Cloudinary, Pusher, Square schema reservation), and the complete environment variable template are documented in **[docs/deployment-environment-setup.md](docs/deployment-environment-setup.md)**.

# 5. Comprehensive Documentation (Table of Contents)

### Architecture & Setup

- [Tech Stack & Architecture](docs/0-tech-stack.md) — Runtime framework, dependency surface, two-panel route architecture, data-flow diagram, and environment variable reference.
- [Authentication & Role Architecture](docs/0.5-authentication-role-architecture.md) — Firebase identity vs. MongoDB authorization, storefront self-healing upsert, admin hardened login, and dual cookie isolation.
- [Deployment & Environment Setup](docs/deployment-environment-setup.md) — `.env.local` template grouped by service, Vercel deployment steps, and third-party console configuration.
- [Data Models Reference](docs/data-models-reference.md) — Exhaustive type catalog from `src/types/index.ts` grouped by Catalog, Order, User, Discount, Chat, and Content domains.

### Core E-Commerce Features

- [Cart & Checkout](docs/4-cart-checkout.md) — Zustand cart identity keys, `UniqueCartItem` split scheduling, server-side `calculateOrderPricing`, and order submission anti-tamper flow.
- [Discount & Promotions Engine](docs/4.1-discount-promotions-engine.md) — `Discount`, `DiscountType`, `DiscountTrigger`, and `DiscountTargetType` rule evaluation with admin CRUD and checkout validation.
- [Capacity & Scheduling Engine](docs/3-capacity-scheduling-engine.md) — `ScheduleSettings` configuration, `/api/availability` capacity oracle, calendar blocks, and admin schedule overrides.
- [Custom Order Pipeline](docs/2-custom-order-pipeline.md) — Client intake wizard, `CustomOrder` lifecycle, admin pricing, and conversion to production `Order` documents.
- [Customer Journey](docs/customer-jorney.md) — End-to-end prose walkthrough from catalog discovery through checkout, thank-you receipt, profile visibility, and the bespoke custom-order alternative path.

### Admin & ERP Capabilities

- [Dynamic Catalog Management](docs/1-dynamic-catalog-managment.md) — Hub-and-spoke MongoDB catalog graph, `$lookup` hydration, and admin CRUD for categories, products, flavors, diameters, and add-ons.
- [Order Management & Fulfillment](docs/5-order-managment-fulfilment.md) — `OrderStatus` lifecycle, dashboard filtering, dual status mutation paths, admin notes, and production print views.
- [Admin Analytics & Reporting](docs/5.1-admin-analytics-reporting.md) — Date-range KPI dashboard powered by a single `$facet` aggregation pipeline with Recharts and CSV export.
- [Real-time Support Chat](docs/6-real-time-support-chat.md) — `IChat`/`IMessage` persistence, Pusher channel auth, bot-to-admin handoff, and typing indicators.
- [Content & Marketing](docs/7-content-marketing.md) — Admin CRUD for blogs, hero slides, gallery images, seasonal events, and homepage video banner content.
