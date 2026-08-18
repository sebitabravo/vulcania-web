import Link from "next/link";

export default function LegalLinks() {
  return (
    <nav aria-label="Información legal" className="flex flex-wrap gap-x-4 gap-y-1">
      <Link href="/terminos" className="hover:text-foreground hover:underline">Términos de uso</Link>
      <Link href="/privacidad" className="hover:text-foreground hover:underline">Privacidad y datos</Link>
    </nav>
  );
}
