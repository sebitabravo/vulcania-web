import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import EmergencyModal from "@/components/emergency-modal";

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
        {/* CSS de Leaflet cargado dinámicamente en el componente */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
          {/* Modal de emergencia global */}
          <EmergencyModal />
        </AuthProvider>
      </body>
    </html>
  );
}
