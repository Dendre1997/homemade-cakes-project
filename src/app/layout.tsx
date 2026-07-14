import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import { AlertProvider } from "@/contexts/AlertContext";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { CustomAlert } from "@/components/ui/CustomAlert";
import { ConfirmationProvider } from "@/contexts/ConfirmationContext";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://d-kcreations.com"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "D&K Creations | Custom Cakes, Bento Cakes, Cupcakes & Desserts",
  description:
    "Order custom cakes, bento cakes, cupcakes, and more from D&K Creations. Handmade desserts perfect for birthdays, weddings, and special events",
  openGraph: {
    title: "D&K Creations | Custom Cakes & Desserts",
    description:
      "Order custom cakes, bento cakes, cupcakes, and more from D&K Creations.",
    url: siteUrl,
    siteName: "D&K Creations",
    images: [
      {
        url: "/DKCREATIONSBANNER.png",
        width: 1200,
        height: 630,
        alt: "D&K Creations",
      },
    ],
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&K Creations",
    description: "Order custom cakes, bento cakes, cupcakes, and more.",
    images: ["/DKCREATIONSBANNER.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${montserrat.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to critical third-party origins so TCP+TLS handshakes
            are resolved before the browser encounters image/auth requests.
            Saves ~300ms on cold mobile connections. */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="font-body bg-background text-text-main h-full min-h-screen">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2NJ0YC4YNT"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2NJ0YC4YNT');
          `}
        </Script>
        <AuthProvider>
          <AlertProvider>
            <ConfirmationProvider>
              <CustomAlert />
              {children}
            </ConfirmationProvider>
          </AlertProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
