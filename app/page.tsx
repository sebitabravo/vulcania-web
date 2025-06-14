"use client";

import { useState } from "react";
import { Mountain, Map, Users, MessageCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useAdminPanel } from "@/hooks/use-admin-panel";
import LoginScreen from "@/components/login-screen";
import VolcanoStatusHeader from "@/components/volcano-status-header";
import MapComponent from "@/components/map-component";
import CommunityPanel from "@/components/community-panel";
import ChatComponent from "@/components/chat-component";
import AdminPanel from "@/components/admin-panel";

export default function VulcaniaApp() {
  const { usuario, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("mapa");
  const { showAdminPanel, closeAdminPanel } = useAdminPanel();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAlertChange = () => {
    // Forzar re-render de componentes que dependen de alertas
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Cargando Vulcania...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black border-2 border-white rounded-full flex items-center justify-center">
                <Mountain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  VOLCANO <span className="text-red-500">EMERGENCIA</span>
                </h1>
                <p className="text-gray-400 text-sm">
                  Bienvenido, {usuario.nombre}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={logout}
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Estado del volcán */}
      <VolcanoStatusHeader key={`status-${refreshKey}`} />

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900 border border-gray-800 h-14">
            <TabsTrigger
              value="mapa"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-400 text-base font-medium"
            >
              <Map className="h-5 w-5 mr-2" />
              Mapa
            </TabsTrigger>
            <TabsTrigger
              value="comunidad"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 text-base font-medium"
            >
              <Users className="h-5 w-5 mr-2" />
              Comunidad
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-400 text-base font-medium"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Chat
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="mapa" className="space-y-6">
              <MapComponent key={`map-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="comunidad" className="space-y-6">
              <CommunityPanel key={`community-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="chat" className="space-y-6">
              <ChatComponent />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Panel de Administración */}
      {showAdminPanel && (
        <AdminPanel
          onClose={closeAdminPanel}
          onAlertChange={handleAlertChange}
        />
      )}
    </div>
  );
}
