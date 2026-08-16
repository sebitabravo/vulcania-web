import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationToggle from "@/components/notification-toggle";

class ToggleNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn<() => Promise<NotificationPermission>>();
}

describe("NotificationToggle", () => {
  beforeEach(() => {
    vi.stubGlobal("Notification", ToggleNotification);
    ToggleNotification.permission = "default";
    ToggleNotification.requestPermission.mockReset();
    ToggleNotification.requestPermission.mockImplementation(async () => {
      ToggleNotification.permission = "granted";
      return "granted";
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("expone una acción explícita y actualiza el estado después del permiso", async () => {
    const user = userEvent.setup();
    render(<NotificationToggle />);
    const button = await screen.findByRole("button", { name: "Activar notificaciones" });

    await user.click(button);
    await act(async () => {
      await Promise.resolve();
    });

    expect(ToggleNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Notificaciones activadas" })).toHaveAttribute("aria-pressed", "true");
  });
});
