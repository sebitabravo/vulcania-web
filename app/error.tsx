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
      digest: error?.digest,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground" role="alert">
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-xl">
        <h2 className="font-display text-2xl font-semibold">Ocurrió un error inesperado</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Puedes reintentar ahora. Si se repite, ejecuta <code>pnpm run doctor</code> para validar el entorno.
        </p>
        <Button type="button" onClick={reset}>Reintentar</Button>
      </div>
    </main>
  );
}
