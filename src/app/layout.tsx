import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import Navbar from "@/components/Navbar"; // Import the Navbar
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Providers from "./providers"; // Import the Providers component

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pokémon Fantasy League",
  description: "Pokémon Fantasy League",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={pressStart2P.className}>
        <Providers>
          <Navbar /> {/* Add the Navbar here */}
          <main>{children}</main> {/* Wrap children in main for semantics */}
        </Providers>
      </body>
    </html>
  );
}
