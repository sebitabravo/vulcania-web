"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, type Usuario } from "@/lib/supabase";
import { APP_CONFIG } from "@/lib/app-config";
import { DEMO_USUARIO } from "@/lib/demo-data";

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

  // Función para normalizar números de teléfono (remover espacios y normalizar formato)
  const normalizarTelefono = (telefono: string): string => {
    return telefono.replace(/\s/g, "").trim();
  };

  // Función para generar variantes de búsqueda de un número
  const generarVariantesBusqueda = (telefono: string): string[] => {
    const base = telefono.replace(/\s/g, "").trim();
    const variantes = [base];

    // Caso 1: Si el número es +569XXXXXXXX (con 9), generar +56XXXXXXXX (sin el primer 9)
    if (base.match(/^\+569\d{8,9}$/)) {
      const sinPrimerNueve = base.replace(/^\+569/, "+56");
      variantes.push(sinPrimerNueve);
    }

    // Caso 2: Si el número es +56XXXXXXX (sin 9), generar +569XXXXXXX (con 9)
    if (base.match(/^\+56\d{8,9}$/) && !base.startsWith("+569")) {
      const conNueve = base.replace(/^\+56/, "+569");
      variantes.push(conNueve);
    }

    // Caso 3: Si el número es +569XXXXXXXXX (con 9 y 9+ dígitos), puede ser +569 + 8 dígitos
    // Esto maneja casos donde el 9 está duplicado
    if (base.match(/^\+569\d{9,}$/)) {
      // Extraer los primeros 8 dígitos después del 9
      const digitosDespuesNueve = base.substring(4, 12); // +569 = 4 chars, tomar 8 dígitos
      const formatoCorto = "+569" + digitosDespuesNueve;
      const formatoSinNueve = "+56" + digitosDespuesNueve;
      variantes.push(formatoCorto);
      variantes.push(formatoSinNueve);
    }

    console.log(`🔄 Variantes para "${telefono}":`, variantes);
    return [...new Set(variantes)]; // Remover duplicados
  };

  const login = async (telefono: string): Promise<boolean> => {
    try {
      console.log("🔐 Iniciando login con teléfono:", telefono);

      // Verificar que supabase esté configurado
      if (!supabase) {
        if (APP_CONFIG.demoMode) {
          const telefonoNormalizado = normalizarTelefono(telefono);
          const isDemoUser =
            telefonoNormalizado === normalizarTelefono(APP_CONFIG.demoPhone);

          const usuarioDemo: Usuario = isDemoUser
            ? DEMO_USUARIO
            : {
                id: `demo-${telefonoNormalizado.replace(/[^\d]/g, "")}`,
                nombre: `Visitante ${telefonoNormalizado.slice(-4)}`,
                telefono: telefonoNormalizado,
                fecha_creacion: new Date().toISOString(),
              };

          setUsuario(usuarioDemo);
          if (isClient && typeof window !== "undefined") {
            localStorage.setItem("vulcania_usuario", JSON.stringify(usuarioDemo));
          }
          console.log("✅ Login demo offline exitoso");
          return true;
        }

        console.error("❌ Supabase no está configurado");
        return false;
      }

      // Normalizar el número para búsqueda (remover espacios)
      const telefonoNormalizado = normalizarTelefono(telefono);
      console.log(
        "📱 Teléfono normalizado para búsqueda:",
        telefonoNormalizado
      );

      // Primer intento: buscar usuario existente con el formato exacto
      let { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("telefono", telefono)
        .single();

      console.log("🔍 Búsqueda exacta:", {
        telefono,
        data,
        error: error?.code,
      });

      // Si no se encontró, buscar por número normalizado (sin espacios)
      if (error && error.code === "PGRST116") {
        console.log("🔍 Intentando búsqueda normalizada...");

        const { data: dataNormalizada, error: errorNormalizado } =
          await supabase
            .from("usuarios")
            .select("*")
            .eq("telefono", telefonoNormalizado)
            .single();

        console.log("🔍 Búsqueda normalizada:", {
          telefonoNormalizado,
          data: dataNormalizada,
          error: errorNormalizado?.code,
        });

        if (dataNormalizada && !errorNormalizado) {
          data = dataNormalizada;
          error = null;
        } else {
          // Si tampoco se encontró, buscar todos los usuarios y comparar con variantes
          console.log("🔍 Buscando con comparación flexible (variantes)...");

          const { data: todosUsuarios, error: errorTodos } = await supabase
            .from("usuarios")
            .select("*");

          if (todosUsuarios && !errorTodos) {
            const variantesInput = generarVariantesBusqueda(telefono);
            console.log(
              "📋 Comparando variantes con usuarios existentes:",
              todosUsuarios.map((u) => ({
                nombre: u.nombre,
                telefonoOriginal: u.telefono,
                telefonoNormalizado: normalizarTelefono(u.telefono),
              }))
            );

            const usuarioEncontrado = todosUsuarios.find((usuario) => {
              const usuarioNormalizado = normalizarTelefono(usuario.telefono);
              const variantesUsuario = generarVariantesBusqueda(
                usuario.telefono
              );

              // Buscar coincidencias entre variantes del input y variantes del usuario
              const coincide = variantesInput.some(
                (varianteInput) =>
                  variantesUsuario.includes(varianteInput) ||
                  usuarioNormalizado === varianteInput
              );

              console.log(`🔍 Comparando usuario ${usuario.nombre}:`, {
                usuarioOriginal: usuario.telefono,
                usuarioNormalizado,
                variantesUsuario,
                variantesInput,
                coincide,
              });

              return coincide;
            });

            console.log("🔍 Búsqueda flexible:", {
              usuarioEncontrado,
              totalUsuarios: todosUsuarios.length,
            });

            if (usuarioEncontrado) {
              data = usuarioEncontrado;
              error = null;
            }
          }
        }
      }

      console.log("🔍 Resultado final de búsqueda:", {
        data,
        error: error
          ? {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            }
          : null,
      });

      // Si el error es que no se encontró el usuario (PGRST116), intentar crear uno nuevo
      if (error && error.code === "PGRST116") {
        if (APP_CONFIG.demoReadOnly) {
          console.warn(
            "Modo demo activo: no se crean usuarios automáticamente."
          );
          return false;
        }

        console.log("👤 Usuario no encontrado, creando nuevo usuario...");

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

        console.log("➕ Resultado de creación de usuario:", {
          nuevoUsuario,
          errorCreacion: errorCreacion
            ? {
                message: errorCreacion.message,
                code: errorCreacion.code,
                details: errorCreacion.details,
                hint: errorCreacion.hint,
              }
            : null,
        });

        if (errorCreacion) {
          console.error("❌ Error al crear usuario:", errorCreacion);
          return false;
        }

        if (!nuevoUsuario) {
          console.error("❌ No se pudo crear el usuario (sin datos)");
          return false;
        }

        setUsuario(nuevoUsuario);
        if (isClient && typeof window !== "undefined") {
          localStorage.setItem(
            "vulcania_usuario",
            JSON.stringify(nuevoUsuario)
          );
        }
        console.log("✅ Usuario creado y guardado exitosamente");
        return true;
      }

      // Si hay otro tipo de error, reportarlo
      if (error) {
        console.error("❌ Error inesperado en búsqueda de usuario:", error);

        // Aún así, intentar continuar si es un error HTTP 406 pero tenemos datos
        const errorMessage = error.message || "";
        if (
          data &&
          (errorMessage.includes("406") ||
            errorMessage.includes("Not Acceptable"))
        ) {
          console.log(
            "⚠️ Error 406 (Not Acceptable) pero con datos válidos, continuando..."
          );
        } else {
          return false;
        }
      }

      // Si no hay datos y no hubo error PGRST116, algo está mal
      if (!data) {
        console.error(
          "❌ No se encontraron datos y no es error de 'no encontrado'"
        );
        return false;
      }

      setUsuario(data);
      if (isClient && typeof window !== "undefined") {
        localStorage.setItem("vulcania_usuario", JSON.stringify(data));
      }
      console.log("✅ Login exitoso con usuario existente");
      return true;
    } catch (error) {
      console.error("💥 Error crítico en login:", error);
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
