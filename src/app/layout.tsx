import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import { AlertProvider } from "@/contexts/AlertContext";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { CustomAlert } from "@/components/ui/CustomAlert";
import { ConfirmationProvider } from "@/contexts/ConfirmationContext";

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

export const metadata: Metadata = {
  title: "Sweet Creations",
  description: "Handcrafted cakes for your sweetest moments",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" }, // Залишаємо SVG для нескінченної чіткості
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
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
      <body className="font-body bg-background text-text-main h-full min-h-screen">
        <AuthProvider>
          <AlertProvider>
            <ConfirmationProvider>
            <CustomAlert />
            <main>{children}</main>
            </ConfirmationProvider>
          </AlertProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
