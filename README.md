# Homemade Cakes Project 🍰

A robust, full-stack E-commerce and Custom Order management platform for a boutique baking business. Built with the latest **Next.js (App Router)**, this application seamlessly integrates a dynamic client-facing storefront with a powerful admin dashboard for order processing and content management.

## 🛠 Tech Stack

**Core:**
-   **Framework:** Next.js 16 (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS, Shadcn UI, Framer Motion
-   **State Management:** Zustand

**Backend & Data:**
-   **Database:** MongoDB (Native Driver)
-   **Storage:** Cloudinary (Images & Video)
-   **Auth:** Firebase Auth
-   **Email:** React Email / Resend

## ✨ Key Features

### 🛍️ Client Side
-   **Dynamic Storefront:** Browse cakes and treats with SEO-friendly URLs (e.g., `/products/chocolate-cake`).
-   **Interactive Product Experience:**
    -   **Flavor Carousel:** Visually select cake configurations.
    -   **Video Banners:** Dynamic video backgrounds for immersive storytelling.
    -   **Custom Inscriptions:** Add personalized messages to cakes.
-   **Custom Order Wizard:** A specialized flow for requesting unique, custom-designed cakes (converts to Quote).
-   **Checkout System:**
    -   Real-time manufacturing slot availability (Delivery/Pickup logic).
    -   **Instant Delivery Toggle:** Real-time checking of delivery availability (controlled by Admin).
    -   Split-order capability for large orders exceeding daily capacity.

### ⚙️ Admin Dashboard
-   **Order Management:**
    -   Visualize orders with ease.
    -   **Conversion Pipeline:** Seamlessly convert "Custom Order" requests into production-ready Orders.
-   **Product Management:** Full CRUD for products, flavors, and allergens, featuring an advanced **Image Gallery** with preview and sorting.
-   **Global Settings:** Instantly enable or disable "Delivery" methods across the entire app via `/admin/settings`.
-   **Content Management:** Update site content, discount codes, and seasonal events.

## 🚀 Getting Started

### Prerequisites
-   Node.js 18+ (LTS recommended)
-   MongoDB Atlas Cluster
-   Cloudinary Account
-   Firebase Project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/homemade-cakes-project.git
    cd homemade-cakes-project
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add the following:

    ```env
    # Database
    MONGODB_URI=mongodb+srv://...
    MONGODB_DB_NAME=homemade_cakes

    # Image & Video Storage
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...

    # Authentication (Firebase)
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    FIREBASE_ADMIN_PRIVATE_KEY=...
    FIREBASE_ADMIN_CLIENT_EMAIL=...

    # Email
    RESEND_API_KEY=...

    # App Config
    NEXT_PUBLIC_BASE_URL=http://localhost:3000
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view the client app, or [http://localhost:3000/admin](http://localhost:3000/admin) for the dashboard.

## 📂 Project Structure

A high-level overview of the `src` directory:

```
src/
├── app/                  # Next.js App Router (Routes & Pages)
│   ├── (client)/         # Public facing routes (Home, Products, Checkout)
│   ├── admin/            # Admin dashboard routes
│   ├── api/              # API Routes (Products, Orders, Settings, etc.)
│   └── layout.tsx        # Root layout
├── components/           # React Components
│   ├── (client)/         # Client-specific components
│   ├── admin/            # Admin-specific components
│   └── ui/               # Reusable UI components (Buttons, Inputs, Modals)
├── lib/                  # Core Libraries & Utilities
│   ├── db/               # Database connection (MongoDB)
│   ├── store/            # Zustand global stores (Cart)
│   └── api/              # Backend helper functions
└── types/                # TypeScript Interfaces (Product, Order, AppSettings)
```

## 📜 Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm start`: Runs the production build.
-   `npm run lint`: Runs ESLint checks.

### Utility Scripts / API Tools
-   **Slug Migration:**
    To backfill slugs for existing products, trigger the migration endpoint (Admin only):
    `POST /api/admin/migrate-slugs`
