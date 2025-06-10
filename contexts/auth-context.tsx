"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, type Usuario } from "@/lib/supabase";

interface AuthContextType {
  usuario: Usuario | null;
  login: (telefono: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

// Crear el contexto con un valor inicial definido
const AuthContext = createContext<AuthContextType>({
  usuario: null,
  login: async () => false,
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Asegurar que estamos en el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Verificar si hay un usuario guardado en localStorage solo después de hidratación
    if (isClient && typeof window !== "undefined") {
      const usuarioGuardado = localStorage.getItem("vulcania_usuario");
      if (usuarioGuardado) {
        try {
          setUsuario(JSON.parse(usuarioGuardado));
        } catch (e) {
          console.error("Error parsing stored user:", e);
          localStorage.removeItem("vulcania_usuario");
        }
      }
      setLoading(false);
    } else if (!isClient) {
      // Si no estamos en el cliente, mantener loading false para SSR
      setLoading(false);
    }
  }, [isClient]);

  const login = async (telefono: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("telefono", telefono)
        .single();

      if (error || !data) {
        // Si no existe el usuario, crearlo
        const { data: nuevoUsuario, error: errorCreacion } = await supabase
          .from("usuarios")
          .insert([
            {
              nombre: `Usuario ${telefono.slice(-4)}`,
              telefono,
            },
          ])
          .select()
          .single();

        if (errorCreacion || !nuevoUsuario) {
          return false;
        }

        setUsuario(nuevoUsuario);
        if (isClient && typeof window !== "undefined") {
          localStorage.setItem(
            "vulcania_usuario",
            JSON.stringify(nuevoUsuario)
          );
        }
        return true;
      }

      setUsuario(data);
      if (isClient && typeof window !== "undefined") {
        localStorage.setItem("vulcania_usuario", JSON.stringify(data));
      }
      return true;
    } catch (error) {
      console.error("Error en login:", error);
      return false;
    }
  };

  const logout = () => {
    setUsuario(null);
    if (isClient && typeof window !== "undefined") {
      localStorage.removeItem("vulcania_usuario");
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
