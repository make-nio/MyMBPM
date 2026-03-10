import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MLM BPM",
  description: "Panel privado y operacion del sistema MLM BPM."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

