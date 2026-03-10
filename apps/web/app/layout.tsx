import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BPM Platform",
  description: "Frontend shell for the BPM platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

