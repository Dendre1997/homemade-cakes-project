import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
// import { Inter } from "next/font/google";
// const inter = Inter({ subsets: ["latin"] });
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

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
    <html lang="en" className={`${playfair.variable} ${montserrat.variable}`}>
      <body className="font-body bg-background text-text-main">
        <AuthProvider>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
