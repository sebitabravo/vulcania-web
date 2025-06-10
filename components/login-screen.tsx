"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mountain, Phone, ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function LoginScreen() {
  const [telefono, setTelefono] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!telefono.trim()) {
      setError("Por favor ingresa tu número de teléfono")
      return
    }

    setLoading(true)
    setError("")

    // Simular envío de SMS (2 segundos de delay)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const success = await login(telefono)

    if (!success) {
      setError("Error al iniciar sesión. Intenta nuevamente.")
    }

    setLoading(false)
  }

  const formatTelefono = (value: string) => {
    // Remover caracteres no numéricos excepto +
    const cleaned = value.replace(/[^\d+]/g, "")

    // Si no empieza con +56, agregarlo
    if (cleaned && !cleaned.startsWith("+56")) {
      if (cleaned.startsWith("56")) {
        return "+" + cleaned
      } else if (cleaned.startsWith("9")) {
        return "+56" + cleaned
      } else {
        return "+569" + cleaned
      }
    }

    return cleaned
  }

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
            <CardTitle className="text-white text-center">Acceso con SMS</CardTitle>
            <p className="text-gray-400 text-center text-sm">
              Ingresa tu número para recibir un código de verificación
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="telefono" className="text-white text-sm font-medium">
                  Número de teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    value={telefono}
                    onChange={(e) => setTelefono(formatTelefono(e.target.value))}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 h-12 text-lg"
                    disabled={loading}
                  />
                </div>
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
            </form>

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <p className="text-blue-400 text-xs text-center">
                <strong>Demo:</strong> El SMS es simulado. Cualquier número válido te permitirá acceder.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Al continuar, aceptas formar parte de la red comunitaria de emergencia volcánica
          </p>
        </div>
      </div>
    </div>
  )
}
