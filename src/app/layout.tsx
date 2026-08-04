import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brandsquare CRM",
  description: "Lead management for Brandsquare",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Grammarly and similar extensions add attributes to <body> before React
    // hydrates. Without this, that mismatch makes React bail out of hydrating
    // the tree, which silently breaks client-side form handling.
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
