"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain, Phone, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function LoginScreen() {
  const [telefono, setTelefono] = useState("+56 9 "); // Siempre incluir el 9
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación usando API nativa del browser
    const form = e.target as HTMLFormElement;
    const phoneInput = form.querySelector("#telefono") as HTMLInputElement;

    if (!phoneInput.checkValidity()) {
      phoneInput.reportValidity();
      return;
    }

    // Verificar que el número tenga el formato básico chileno móvil (+56 9...)
    // Ser permisivo con espacios pero exigir el 9
    const numeroLimpio = telefono.replace(/\s/g, ""); // Remover espacios

    console.log("🔍 Debug validación teléfono (con 9 obligatorio):", {
      telefonoOriginal: telefono,
      telefonoLongitud: telefono.length,
      numeroLimpio: numeroLimpio,
      numeroLimpioLongitud: numeroLimpio.length,
    });

    // Validación básica: debe empezar con +569 (formato móvil chileno)
    if (!numeroLimpio.startsWith("+569")) {
      console.log("❌ No empieza con +569 (móvil chileno)");
      setError("Debe ser un número móvil chileno (+56 9...)");
      phoneInput.setCustomValidity(
        "Debe ser un número móvil chileno (+56 9...)"
      );
      phoneInput.reportValidity();
      return;
    }

    // Debe tener al menos 10 caracteres (+569 + algunos dígitos)
    if (numeroLimpio.length < 10) {
      console.log("❌ Número muy corto:", numeroLimpio.length, "< 10");
      setError("El número es muy corto");
      phoneInput.setCustomValidity("El número es muy corto");
      phoneInput.reportValidity();
      return;
    }

    // Validación permisiva: +56 9 seguido de números
    const formatoMovil = /^\+56\s?9\s?[\d\s]+$/.test(telefono);
    console.log("🔍 Validación móvil chileno:", {
      telefono: telefono,
      regex: "^\\+56\\s?9\\s?[\\d\\s]+$",
      valido: formatoMovil,
    });

    if (!formatoMovil) {
      console.log("❌ Formato móvil inválido");
      setError("Formato inválido. Use +56 9 seguido de números");
      phoneInput.setCustomValidity("Formato inválido");
      phoneInput.reportValidity();
      return;
    }

    console.log("✅ Validación de teléfono exitosa");

    setLoading(true);
    setError("");
    setError("");

    // Simular envío de SMS (2 segundos de delay)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const success = await login(telefono);

    if (!success) {
      setError("Error al iniciar sesión. Intenta nuevamente.");
    }

    setLoading(false);
  };
  const formatTelefono = (value: string) => {
    console.log("🔧 formatTelefono - Input:", value, "Longitud:", value.length);

    // Si el usuario está borrando, ser muy permisivo
    if (value.length < telefono.length) {
      // Solo intervenir si borra demasiado (hasta el prefijo base)
      if (value.length <= 4 || !value.startsWith("+56")) {
        return "+56 9 ";
      }

      return value; // Permitir edición libre
    }

    // Si es el mismo valor, no hacer nada (evita loops)
    if (value === telefono) {
      return value;
    }

    console.log("🔧 Procesando nuevo input...");

    // Solo formatear cuando el usuario está agregando contenido
    // Limpiar caracteres no válidos pero conservar estructura
    let cleaned = value.replace(/[^\d+\s]/g, "");
    console.log("🔧 Cleaned:", cleaned);

    // Si está completamente vacío, dar el formato base
    if (!cleaned || cleaned === "+" || cleaned === "+5" || cleaned === "+56") {
      return "+56 9 ";
    }

    // Si no empieza con +56, corregir automáticamente solo casos obvios
    if (!cleaned.startsWith("+56")) {
      if (/^\d/.test(cleaned)) {
        // Si empieza con dígitos, asumir que van después del +56 9
        cleaned = "+56 9 " + cleaned;
      } else if (cleaned.startsWith("+")) {
        cleaned = "+56 9 " + cleaned.slice(1);
      }
    }

    // Asegurar formato básico pero sin ser muy agresivo
    if (cleaned.startsWith("+56") && !cleaned.includes("9")) {
      // Si tiene +56 pero no tiene 9, agregarlo
      const afterCode = cleaned.substring(3).trim();
      cleaned = "+56 9 " + afterCode;
    }

    console.log("🔧 Cleaned final:", cleaned);

    // Aplicar formato de espacios suavemente
    if (cleaned.startsWith("+56")) {
      // Extraer solo los dígitos después de +56
      const numerosPuros = cleaned
        .replace(/^\+56\s?9?\s?/, "")
        .replace(/\s/g, "");
      console.log("🔧 Números puros extraídos:", numerosPuros);

      // Construir el formato correcto
      let result = "+56 9";

      if (numerosPuros.length > 0) {
        // Primeros 4 dígitos
        const grupo1 = numerosPuros.slice(0, 4);
        result += " " + grupo1;

        // Siguientes 4 dígitos
        if (numerosPuros.length > 4) {
          const grupo2 = numerosPuros.slice(4, 8);
          result += " " + grupo2;
        }
      }

      console.log("🔧 Resultado final:", result, "Longitud:", result.length);
      return result;
    }

    console.log("🔧 Sin cambios, devolviendo:", cleaned);
    return cleaned;
  };

  const handleDirectAccess = async () => {
    setLoading(true);
    setError("");

    // Usuario predefinido para demo
    const demoUser = "+56 9 8765 4321";

    // Simular delay breve para mostrar loading
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const success = await login(demoUser);

    if (!success) {
      setError("Error en acceso directo. Intenta nuevamente.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-black border-2 border-white rounded-full flex items-center justify-center mx-auto mb-4">
            <Mountain className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            VOLCANO <span className="text-red-500">EMERGENCIA</span>
          </h1>
          <p className="text-gray-400">Un guardián que vigila y guía</p>
        </div>

        {/* Formulario de Login */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-center">
              Acceso con SMS
            </CardTitle>
            <p className="text-gray-400 text-center text-sm">
              Ingresa tu número para recibir un código de verificación
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="telefono"
                  className="text-white text-sm font-medium"
                >
                  Número de teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    value={telefono}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      console.log(
                        "📝 onChange - Input recibido:",
                        newValue,
                        "Longitud:",
                        newValue.length
                      );
                      console.log(
                        "📝 Estado actual:",
                        telefono,
                        "Longitud:",
                        telefono.length
                      );

                      const formatted = formatTelefono(newValue);
                      console.log(
                        "📝 Después de formatear:",
                        formatted,
                        "Longitud:",
                        formatted.length
                      );

                      // Solo actualizar si realmente cambió
                      if (formatted !== telefono) {
                        console.log("📝 Actualizando estado...");
                        setTelefono(formatted);
                      } else {
                        console.log("📝 Sin cambios en el estado");
                      }

                      // Limpiar validación personalizada cuando el usuario escribe
                      const input = e.target as HTMLInputElement;
                      input.setCustomValidity("");
                    }}
                    onFocus={() => {
                      // Solo intervenir si el campo está completamente vacío
                      if (!telefono || telefono.length <= 3) {
                        setTelefono("+56 9 ");
                      }
                    }}
                    onBlur={() => {
                      // Solo intervenir si el campo está vacío o muy incompleto
                      if (!telefono || telefono.length <= 6) {
                        setTelefono("+56 9 ");
                      }
                    }}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 h-12 text-lg"
                    disabled={loading}
                    required
                    pattern="^\+56\s?9\s?[\d\s]+$"
                    title="Ingresa un número móvil chileno: +56 9 seguido de números"
                    maxLength={20}
                    minLength={10}
                    autoComplete="tel"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formato: +56 9 XXXX XXXX (móvil chileno)
                  <br />
                  <span className="text-blue-400">
                    Actual: &quot;{telefono}&quot; ({telefono.length} chars)
                  </span>
                  <br />
                  <span className="text-green-400 text-xs">
                    💡 El 9 se agrega automáticamente
                  </span>
                </p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !telefono.trim()}
                className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg font-medium"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando SMS...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Enviar código SMS</span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </Button>

              {/* Botón de Acceso Directo para Demo */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">o</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleDirectAccess}
                disabled={loading}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white h-12 text-lg font-medium bg-transparent"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span>Accediendo...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>🚀 Acceso Directo (Demo)</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <p className="text-blue-400 text-xs text-center">
                <strong>Demo:</strong> Puedes usar cualquier número válido
                chileno o el botón de acceso directo para probar la aplicación
                sin SMS real.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Al continuar, aceptas formar parte de la red comunitaria de
            emergencia volcánica
          </p>
        </div>
      </div>
    </div>
  );
}
