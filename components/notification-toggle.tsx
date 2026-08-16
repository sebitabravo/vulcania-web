"use client";

import { useSyncExternalStore } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  subscribeNotificationPermission,
  type BrowserNotificationPermission,
} from "@/lib/browser-notifications";

export default function NotificationToggle() {
  const supported = useSyncExternalStore(subscribeNotificationPermission, isNotificationSupported, () => false);
  const permission = useSyncExternalStore<BrowserNotificationPermission>(
    subscribeNotificationPermission,
    getNotificationPermission,
    () => "unsupported"
  );

  if (!supported || !isNotificationSupported()) return null;

  const enabled = permission === "granted";
  const blocked = permission === "denied";
  const label = enabled
    ? "Notificaciones activadas"
    : blocked
      ? "Notificaciones bloqueadas en el navegador"
      : "Activar notificaciones";

  const handleClick = async () => {
    if (blocked) return;
    await requestNotificationPermission();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => void handleClick()}
      disabled={blocked}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      className="text-muted-foreground hover:text-foreground"
    >
      {blocked ? <BellOff aria-hidden="true" /> : <Bell aria-hidden="true" />}
    </Button>
  );
}
