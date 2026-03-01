"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Unhandled app error", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Ocurrió un error inesperado</h2>
        <p className="text-gray-300 text-sm">
          La aplicación encontró un problema. Puedes reintentar ahora y, si se repite,
          revisar la configuración con <code>pnpm doctor</code>.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset} className="bg-red-600 hover:bg-red-700">
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
