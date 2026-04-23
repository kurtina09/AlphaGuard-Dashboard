import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlphaGuard — Anti-Cheat Portal",
  description: "SF Alpha anti-cheat dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
