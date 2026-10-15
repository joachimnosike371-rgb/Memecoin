import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zero Capital Farm",
  description: "A test-first, multi-chain token operations dashboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
