export const TERMS_VERSION = "2026-08-16";

export interface LoginConsent {
  auth: true;
  communityName: boolean;
  smsAlerts: boolean;
  adult: true;
  termsVersion: string;
}

export const PRIVACY_CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT?.trim() || "contacto pendiente de configurar";

export const LEGAL_REQUIREMENT_NOTICE =
  "Configura el canal de contacto del responsable antes de publicar el servicio en producción.";
