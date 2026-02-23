import type { Metadata } from "next";
import { Gabriela, Libre_Baskerville, Space_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";
import Footer from "../components/Footer";
import { createClient } from "@/lib/supabase/server";

const gabriela = Gabriela({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gabriela",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700", "400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PawBit - Interactive Animal Feeding",
  description: "Connect your clicks to real kibble. Watch live video as you donate to stray animals in your city.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
          async
        ></script>
      </head>
      <body
        className={`${gabriela.variable} ${libreBaskerville.variable} ${spaceMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Navbar user={user} />

        <main className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
