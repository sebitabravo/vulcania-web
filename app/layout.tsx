import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VULCANIA - Demo",
  description:
    "Tecnología para la prevención y evacuación ante el volcán Villarrica",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Precargar recursos de Leaflet */}
        <link
          rel="preload"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          as="style"
        />
        <link
          rel="preload"
          href="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png"
          as="image"
        />
        <link
          rel="preload"
          href="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png"
          as="image"
        />
        <link
          rel="preload"
          href="https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
          as="image"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
