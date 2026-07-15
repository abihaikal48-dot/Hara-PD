import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hara Chicken - People Development System Pro",
  description: "Sistem People Development Multi-Outlet — Hara Chicken",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
