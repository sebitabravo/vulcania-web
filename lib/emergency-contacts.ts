export interface EmergencyContact {
  number: string;
  label: string;
  href: string;
}

/**
 * Verificado contra el directorio de números de emergencia de SENAPRED.
 * Fuente: https://dev.senapred.cl/
 */
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { number: "131", label: "Ambulancia / SAMU", href: "tel:131" },
  { number: "132", label: "Bomberos", href: "tel:132" },
  { number: "133", label: "Carabineros", href: "tel:133" },
];

export const EMERGENCY_CONTACTS_SOURCE = "SENAPRED";
