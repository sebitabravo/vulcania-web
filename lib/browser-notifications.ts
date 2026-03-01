export async function ensureNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported"
  }

  if (Notification.permission === "default") {
    return Notification.requestPermission()
  }

  return Notification.permission
}

export function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  if (document.visibilityState === "visible") return

  try {
    new Notification(title, { body })
  } catch {
    // no-op
  }
}
