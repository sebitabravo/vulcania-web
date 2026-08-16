"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  LogOut,
  Map,
  MessageCircle,
  Mountain,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useAdminPanel } from "@/hooks/use-admin-panel";
import LoginScreen from "@/components/login-screen";
import VolcanoStatusHeader from "@/components/volcano-status-header";
import ThemeToggle from "@/components/theme-toggle";
import { APP_CONFIG } from "@/lib/app-config";

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => <PanelLoading label="Cargando cartografía…" />,
});
const CommunityPanel = dynamic(() => import("@/components/community-panel"), {
  ssr: false,
  loading: () => <PanelLoading label="Cargando reportes…" />,
});
const ChatComponent = dynamic(() => import("@/components/chat-component"), {
  ssr: false,
  loading: () => <PanelLoading label="Cargando coordinación…" />,
});
const AdminPanel = dynamic(() => import("@/components/admin-panel"), {
  ssr: false,
});

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-xl border border-border/70 bg-card/50 p-8 text-sm text-muted-foreground" role="status">
      {label}
    </div>
  );
}

export default function VulcaniaApp() {
  const { usuario, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("mapa");
  const canManage = Boolean(
    APP_CONFIG.enableAdminPanel &&
      usuario &&
      (usuario.rol === "operator" || usuario.rol === "admin")
  );
  const { showAdminPanel, openAdminPanel, closeAdminPanel } = useAdminPanel(canManage);

  const userInitials = useMemo(
    () =>
      usuario?.nombre
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "V",
    [usuario?.nombre]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <VolcanoStatusHeader />
        <main className="flex min-h-[calc(100vh-13rem)] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              <Mountain className="size-6" aria-hidden="true" />
            </div>
            <p className="mt-4 font-display text-lg font-semibold">Cargando Vulcania</p>
            <p className="mt-1 text-sm text-muted-foreground">Restaurando tu sesión; el estado público permanece disponible.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!usuario) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
              <Mountain className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold tracking-tight">Vulcania</span>
                <span className="hidden rounded-full border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground sm:inline-flex">Monitor</span>
              </div>
              <p className="truncate text-xs text-muted-foreground">Red comunitaria · Volcán Villarrica</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {canManage ? (
              <Button type="button" variant="outline" size="sm" onClick={openAdminPanel} className="hidden sm:inline-flex">
                <Settings2 aria-hidden="true" /> Operador
              </Button>
            ) : null}
            <ThemeToggle />
            <div className="hidden items-center gap-2 border-l border-border/70 pl-3 sm:flex">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">{userInitials}</div>
              <span className="max-w-28 truncate text-sm text-muted-foreground">{usuario.nombre}</span>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => void logout()} aria-label="Cerrar sesión" className="text-muted-foreground hover:text-foreground">
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <VolcanoStatusHeader />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Panel de situación</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Tu red, en un solo lugar.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Consulta puntos de encuentro, reportes vecinales y conversaciones de coordinación sin perder el contexto técnico.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              [Activity, "Monitoreo", "24/7", "text-emerald-300"],
              [ShieldCheck, "Fuente", "Visible", "text-primary"],
              [Users, "Comunidad", "Local", "text-orange-200"],
            ].map(([Icon, label, value, color]) => {
              const IconComponent = Icon as typeof Activity;
              return (
                <div key={label as string} className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 sm:min-w-28">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`size-3.5 ${color as string}`} aria-hidden="true" />
                    <span className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">{label as string}</span>
                  </div>
                  <p className="mt-1 font-mono text-sm text-foreground">{value as string}</p>
                </div>
              );
            })}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/70 bg-card/70 p-1.5 sm:max-w-xl">
            <TabsTrigger value="mapa" className="min-h-11 gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Map aria-hidden="true" /> <span>Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="comunidad" className="min-h-11 gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users aria-hidden="true" /> <span>Comunidad</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="min-h-11 gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageCircle aria-hidden="true" /> <span>Chat</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="mapa" className="mt-0"><MapComponent /></TabsContent>
            <TabsContent value="comunidad" className="mt-0"><CommunityPanel /></TabsContent>
            <TabsContent value="chat" className="mt-0"><ChatComponent /></TabsContent>
          </div>
        </Tabs>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>{APP_CONFIG.demoMode ? "Vulcania · simulación comunitaria para portfolio" : "Vulcania · monitor comunitario"}</span>
          <span>Contrasta siempre con SERNAGEOMIN y SENAPRED.</span>
        </div>
      </footer>

      {showAdminPanel ? (
        <AdminPanel onClose={closeAdminPanel} />
      ) : null}
    </div>
  );
}
