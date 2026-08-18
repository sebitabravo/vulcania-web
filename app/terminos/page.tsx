import Link from "next/link";
import LegalLinks from "@/components/legal-links";
import { LEGAL_REQUIREMENT_NOTICE, TERMS_VERSION } from "@/lib/legal";

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl space-y-7">
        <header className="space-y-2">
          <Link href="/" className="text-sm text-primary hover:underline">← Volver a Vulcania</Link>
          <p className="pt-5 font-mono text-xs uppercase tracking-[0.18em] text-primary">Versión {TERMS_VERSION}</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Términos de uso</h1>
          <p className="text-muted-foreground">Vulcania es una herramienta informativa y comunitaria. No reemplaza a las autoridades ni emite alertas oficiales.</p>
        </header>

        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="font-display text-xl font-semibold text-foreground">Alcance y fuentes</h2>
          <p>Los estados, fichas, mapas y avisos pueden tener retraso, estar en revisión o quedar sin datos. Cada registro debe mostrar su fuente y fecha; si no existe verificación vigente, debes consultar los canales oficiales.</p>
          <p>Para una emergencia, sigue siempre las instrucciones de SERNAGEOMIN, SENAPRED, el Sistema de Alerta de Emergencia (SAE), Carabineros, Bomberos, SAMU y la autoridad local.</p>
        </section>

        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="font-display text-xl font-semibold text-foreground">Uso responsable</h2>
          <p>La comunidad no debe publicar datos personales, rumores, instrucciones de evacuación no verificadas ni ubicaciones que puedan poner a alguien en riesgo. Los reportes pueden ser moderados, ocultados o eliminados.</p>
          <p>El registro está destinado a personas de 18 años o más. No ingreses datos de niñas, niños o adolescentes.</p>
        </section>

        <p className="rounded-lg border border-yellow-300/25 bg-yellow-300/[0.06] p-4 text-sm leading-6 text-yellow-100">{LEGAL_REQUIREMENT_NOTICE}</p>
        <LegalLinks />
      </article>
    </main>
  );
}
