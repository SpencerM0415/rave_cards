import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { Footer, Navbar } from "@/components";

const jost = Jost({
    variable: '--font-jost',
    subsets: ['latin'],
})

export const metadata: Metadata = {
  title: "Rave Cards",
  description: "E-Commerce Platform for Festival Trading Cards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jost.className} antialiased`}
      >
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
