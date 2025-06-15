"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain, Phone, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function LoginScreen() {
  const [telefono, setTelefono] = useState("+56 9 "); // Número por defecto
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

    // Verificar que el número esté completo (+56 9 XXXX XXXX = 17 caracteres)
    if (telefono.length < 17) {
      setError("El número debe tener 8 dígitos después del 9");
      phoneInput.setCustomValidity(
        "El número debe tener 8 dígitos después del 9"
      );
      phoneInput.reportValidity();
      return;
    }

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
    // Remover todos los caracteres no numéricos excepto +
    const cleaned = value.replace(/[^\d+]/g, "");

    // Si está vacío, usar el valor por defecto
    if (!cleaned || cleaned === "+") {
      return "+56 9 ";
    }

    // Si no empieza con +56, agregarlo automáticamente
    let formatted = cleaned;
    if (!formatted.startsWith("+56")) {
      if (formatted.startsWith("56")) {
        formatted = "+" + formatted;
      } else if (formatted.startsWith("9")) {
        formatted = "+56" + formatted;
      } else if (formatted.startsWith("+")) {
        formatted = "+56" + formatted.slice(1);
      } else {
        formatted = "+569" + formatted;
      }
    }

    // Extraer las partes del número
    let phoneBody = formatted.replace("+56", "");

    // Asegurar que empiece con 9 (números móviles en Chile)
    if (!phoneBody.startsWith("9")) {
      phoneBody = "9" + phoneBody.replace(/^9*/, "");
    }

    // Limitar a máximo 9 dígitos (9 + 8 dígitos)
    phoneBody = phoneBody.slice(0, 9);

    // Solo números que empiecen con 9 seguidos de 8 dígitos
    const digitsAfter9 = phoneBody.slice(1);
    if (digitsAfter9.length > 8) {
      phoneBody = "9" + digitsAfter9.slice(0, 8);
    }

    // Formatear con espacios: +56 9 XXXX XXXX
    let result = "+56";
    if (phoneBody.length > 0) {
      result += " " + phoneBody[0]; // El 9
      if (phoneBody.length > 1) {
        const remaining = phoneBody.slice(1);
        if (remaining.length <= 4) {
          result += " " + remaining;
        } else {
          result += " " + remaining.slice(0, 4) + " " + remaining.slice(4, 8);
        }
      }
    }

    return result;
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
                      const formatted = formatTelefono(e.target.value);
                      setTelefono(formatted);
                      // Limpiar validación personalizada cuando el usuario escribe
                      const input = e.target as HTMLInputElement;
                      input.setCustomValidity("");
                    }}
                    onFocus={() => {
                      // Si el campo está vacío o solo tiene el prefijo, asegurar que tenga el formato base
                      if (telefono.length <= 6) {
                        setTelefono("+56 9 ");
                      }
                    }}
                    onBlur={() => {
                      // Si el usuario sale del campo y solo tiene el prefijo, mantenerlo
                      if (telefono === "+56 9 " || telefono.length < 8) {
                        setTelefono("+56 9 ");
                      }
                    }}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 h-12 text-lg"
                    disabled={loading}
                    required
                    pattern="^\+56 9 \d{4} \d{4}$"
                    title="Ingresa un número chileno válido: +56 9 XXXX XXXX"
                    maxLength={17}
                    minLength={17}
                    autoComplete="tel"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formato: +56 9 XXXX XXXX (8 dígitos después del 9)
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
