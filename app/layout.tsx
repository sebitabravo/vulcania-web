import type React from "react";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { AlertProvider } from "@/contexts/alert-context";
import EmergencyModal from "@/components/emergency-modal";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vulcania · Centro de monitoreo volcánico",
  description: "Estado volcánico, puntos de encuentro y coordinación comunitaria para Villarrica.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} font-body`}>
        <AlertProvider>
          <AuthProvider>
            {children}
            <EmergencyModal />
          </AuthProvider>
        </AlertProvider>
      </body>
    </html>
  );
}
