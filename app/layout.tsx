import type { Metadata } from "next";
import { Gabriela } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "../components/Footer";
import CookieBanner from "../components/CookieBanner";
import { createClient } from "@/lib/supabase/server";

const gabriela = Gabriela({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gabriela",
  display: "swap",
});


export const metadata: Metadata = {
  title: "PawBit - Interactive Animal Feeding",
  description: "Connect your clicks to real kibble. Watch live video as you donate to stray animals in your city.",
  icons: {
    icon: "/logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userWithRole = user ? { ...user, role: 'user' } : null;

  if (user) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .maybeSingle();
    
    if (dbUser?.role && userWithRole) {
      userWithRole.role = dbUser.role;
    }
  }

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
        className={`${gabriela.variable} antialiased flex flex-col min-h-screen`}
      >
        <Navbar user={userWithRole} />

        <main className="flex-1">
          {children}
        </main>

        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
