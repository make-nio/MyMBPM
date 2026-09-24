import type { Metadata } from "next";
import "./globals.css";

import { AvisoVistaPrevia } from "../src/components/layout/aviso-vista-previa";

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
      <body>
        <AvisoVistaPrevia />
        {children}
      </body>
    </html>
  );
}

