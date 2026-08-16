export function formatLocalDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(date);
}

export function formatFreshness(value: string, now = Date.now()): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Antigüedad no disponible";

  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "Actualizado hace menos de 1 min";
  if (elapsedMinutes < 60) return `Actualizado hace ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Actualizado hace ${elapsedHours} h`;

  return `Actualizado hace ${Math.floor(elapsedHours / 24)} d`;
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(date);
}

export function isStale(value: string, maxAgeMinutes = 30): boolean {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) || Date.now() - timestamp > maxAgeMinutes * 60_000;
}
