import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNotificationPermission,
  isNotificationSupported,
  notify,
  requestNotificationPermission,
} from "@/lib/browser-notifications";

class MockNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn<() => Promise<NotificationPermission>>();

  constructor(public readonly title: string, public readonly options?: NotificationOptions) {}
}

const originalNotification = window.Notification;

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
}

describe("browser notifications", () => {
  beforeEach(() => {
    vi.stubGlobal("Notification", MockNotification);
    MockNotification.permission = "default";
    MockNotification.requestPermission.mockReset();
    setVisibility("hidden");
  });

  afterEach(() => {
    if (originalNotification) vi.stubGlobal("Notification", originalNotification);
    else vi.unstubAllGlobals();
    setVisibility("visible");
  });

  it("solicita permiso solo cuando el usuario llama la función", async () => {
    MockNotification.requestPermission.mockResolvedValue("granted");

    expect(getNotificationPermission()).toBe("default");
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
    await expect(requestNotificationPermission()).resolves.toBe("granted");
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("notifica en pestaña oculta con permiso concedido", () => {
    MockNotification.permission = "granted";

    expect(notify("Nuevo mensaje", { body: "Contenido", tag: "chat-1" })).toBe(true);
    expect(isNotificationSupported()).toBe(true);
  });

  it("falla cerrado en pestaña visible o sin permiso", () => {
    MockNotification.permission = "granted";
    setVisibility("visible");
    expect(notify("No mostrar")).toBe(false);

    setVisibility("hidden");
    MockNotification.permission = "default";
    expect(notify("Tampoco mostrar")).toBe(false);
  });

  it("falla cerrado si el navegador no expone Notification", async () => {
    vi.stubGlobal("Notification", undefined);

    expect(isNotificationSupported()).toBe(false);
    expect(getNotificationPermission()).toBe("unsupported");
    expect(notify("Sin API")).toBe(false);
    await expect(requestNotificationPermission()).resolves.toBe("unsupported");
  });
});
