import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anglerfish",
  description: "AI agents that bait scammers back.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
