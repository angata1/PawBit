import type { Metadata } from "next";
import { Geist, Geist_Mono, Gabriela } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const gabriela = Gabriela({
  variable: "--font-gabriela",
  subsets: ["latin"],
  weight: ["400"], // Gabriela only has Regular 400
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pawbit",
  description: "Интерактивна система за даряване на храна за бездомни животни",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (


    
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
            <Navbar />
       
        {children}
        </body>
    </html>
  );
}
