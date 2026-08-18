import Link from "next/link";
import LegalLinks from "@/components/legal-links";
import { LEGAL_REQUIREMENT_NOTICE, PRIVACY_CONTACT, TERMS_VERSION } from "@/lib/legal";

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl space-y-7">
        <header className="space-y-2">
          <Link href="/" className="text-sm text-primary hover:underline">← Volver a Vulcania</Link>
          <p className="pt-5 font-mono text-xs uppercase tracking-[0.18em] text-primary">Versión {TERMS_VERSION}</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Privacidad y datos personales</h1>
          <p className="text-muted-foreground">Esta página describe el tratamiento técnico previsto para el acceso y la coordinación comunitaria. Requiere revisión jurídica antes del lanzamiento público.</p>
        </header>

        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="font-display text-xl font-semibold text-foreground">Qué datos usamos</h2>
          <p>Para OTP se procesa el número móvil. Si lo entregas, el nombre se usa para identificarte dentro de la comunidad. Los mensajes, avisos y decisiones de consentimiento se almacenan en Supabase para prestar el servicio.</p>
          <p>El consentimiento de autenticación, visibilidad del nombre y alertas SMS se registra por separado con versión y fecha. Las alertas SMS son opcionales, revocables y requieren una baja explícita.</p>
        </section>

        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="font-display text-xl font-semibold text-foreground">Finalidad, conservación y derechos</h2>
          <p>Usamos los datos para autenticar, coordinar reportes y enviar avisos que hayas solicitado. Se conservarán mientras exista la cuenta o mientras una obligación de auditoría lo requiera; puedes solicitar acceso, rectificación, eliminación u oposición por el canal del responsable.</p>
          <p>Proveedores técnicos pueden tratar datos por cuenta del servicio, incluyendo Supabase y, si se habilita, el proveedor de SMS. No se venden datos ni se publica el teléfono en perfiles comunitarios.</p>
        </section>

        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="font-display text-xl font-semibold text-foreground">Canal de contacto</h2>
          <p>Responsable/canal ARCO: <strong className="text-foreground">{PRIVACY_CONTACT}</strong>.</p>
          <p>Si el valor aparece como pendiente, la configuración legal está incompleta y Vulcania no debe considerarse lista para producción.</p>
        </section>

        <p className="rounded-lg border border-yellow-300/25 bg-yellow-300/[0.06] p-4 text-sm leading-6 text-yellow-100">{LEGAL_REQUIREMENT_NOTICE}</p>
        <LegalLinks />
      </article>
    </main>
  );
}
