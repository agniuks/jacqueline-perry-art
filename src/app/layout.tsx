import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jacqueline Perry Art",
  description:
    "Original artwork by Jacqueline Perry. Browse the full collection of paintings and prints.",
  openGraph: {
    title: "Jacqueline Perry Art",
    description:
      "Original artwork by Jacqueline Perry. Browse the full collection of paintings and prints.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="mx-auto max-w-7xl px-6">
          <Header />
          <main className="min-h-[70vh] pb-16">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
