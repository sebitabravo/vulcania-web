"use client";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";
const permissionListeners = new Set<() => void>();

export function subscribeNotificationPermission(listener: () => void): () => void {
  permissionListeners.add(listener);
  return () => permissionListeners.delete(listener);
}

function emitPermissionChange() {
  permissionListeners.forEach((listener) => listener());
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && typeof window.Notification === "function";
}

export function getNotificationPermission(): BrowserNotificationPermission {
  if (!isNotificationSupported()) return "unsupported";
  return window.Notification.permission;
}

export async function requestNotificationPermission(): Promise<BrowserNotificationPermission> {
  const current = getNotificationPermission();
  if (current === "unsupported" || current === "granted" || current === "denied") return current;
  try {
    const permission = await window.Notification.requestPermission();
    emitPermissionChange();
    return permission;
  } catch {
    return "denied";
  }
}

export function notify(title: string, options: NotificationOptions = {}): boolean {
  if (!isNotificationSupported() || document.visibilityState === "visible") return false;
  if (window.Notification.permission !== "granted") return false;

  try {
    new window.Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
