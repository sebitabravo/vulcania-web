"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Usuario {
  id: string;
  nombre: string;
  telefono: string;
  fecha_creacion: string;
}

export default function TestPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      if (!supabase) {
        setError("Supabase no está configurado");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("fecha_creacion", { ascending: false });

      if (error) {
        console.error("Error al cargar usuarios:", error);
        setError(error.message);
      } else {
        setUsuarios(data || []);
      }
    } catch (err) {
      console.error("Error crítico:", err);
      setError("Error crítico al conectar con la base de datos");
    } finally {
      setLoading(false);
    }
  };

  const testearNumero = (telefono: string) => {
    const numeroLimpio = telefono.replace(/\s/g, "");
    const formatoEstricto = /^\+56\s?9\s?\d{4}\s?\d{4}$/.test(telefono);
    const formatoPermisivo = /^\+56[\d\s]+$/.test(telefono);

    return {
      original: telefono,
      limpio: numeroLimpio,
      longitud: telefono.length,
      longitudLimpia: numeroLimpio.length,
      formatoEstricto,
      formatoPermisivo,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
        <div>Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">
        Test de Usuarios - Base de Datos
      </h1>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded mb-6">
          Error: {error}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={cargarUsuarios}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Recargar Usuarios
        </button>
      </div>

      {usuarios.length === 0 ? (
        <div className="text-gray-400">No hay usuarios en la base de datos</div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Usuarios encontrados: {usuarios.length}
          </h2>

          {usuarios.map((usuario) => {
            const test = testearNumero(usuario.telefono);
            return (
              <div
                key={usuario.id}
                className="border border-gray-700 p-4 rounded"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">{usuario.nombre}</h3>
                    <p className="text-sm text-gray-400">ID: {usuario.id}</p>
                    <p className="text-sm text-gray-400">
                      Creado:{" "}
                      {new Date(usuario.fecha_creacion).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Teléfono:</strong> &quot;{test.original}&quot;
                    </p>
                    <p>
                      <strong>Sin espacios:</strong> &quot;{test.limpio}&quot;
                    </p>
                    <p>
                      <strong>Longitud:</strong> {test.longitud} chars
                    </p>
                    <p>
                      <strong>Longitud limpia:</strong> {test.longitudLimpia}{" "}
                      chars
                    </p>
                    <p>
                      <strong>Formato estricto:</strong>
                      <span
                        className={
                          test.formatoEstricto
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {test.formatoEstricto ? " ✅ Válido" : " ❌ Inválido"}
                      </span>
                    </p>
                    <p>
                      <strong>Formato permisivo:</strong>
                      <span
                        className={
                          test.formatoPermisivo
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {test.formatoPermisivo ? " ✅ Válido" : " ❌ Inválido"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
