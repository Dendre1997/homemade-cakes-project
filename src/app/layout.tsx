import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import { AlertProvider } from "@/contexts/AlertContext";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { getCategories } from "@/lib/data";
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
  title: "Homemade Cakes",
  description: "Custom handcrafted cakes for any occasion",
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
