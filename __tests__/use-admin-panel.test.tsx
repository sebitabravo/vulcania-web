import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAdminPanel } from "@/hooks/use-admin-panel";

vi.mock("@/lib/app-config", () => ({
  APP_CONFIG: { enableAdminPanel: true },
}));

function ctrlShiftA() {
  return new KeyboardEvent("keydown", {
    key: "a",
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
  });
}

describe("use-admin-panel", () => {
  it("no abre sin permiso de administración", () => {
    const { result } = renderHook(() => useAdminPanel(false));
    act(() => window.dispatchEvent(ctrlShiftA()));
    expect(result.current.showAdminPanel).toBe(false);
  });

  it("abre con Ctrl+Shift+A y cierra con Escape", () => {
    const { result } = renderHook(() => useAdminPanel(true));
    act(() => window.dispatchEvent(ctrlShiftA()));
    expect(result.current.showAdminPanel).toBe(true);
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(result.current.showAdminPanel).toBe(false);
  });

  it("ignora el atajo mientras se escribe en un campo editable", () => {
    const { result } = renderHook(() => useAdminPanel(true));
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.dispatchEvent(ctrlShiftA());
    expect(result.current.showAdminPanel).toBe(false);
    document.body.removeChild(input);
  });

  it("expone open y close programáticos", () => {
    const { result } = renderHook(() => useAdminPanel(true));
    act(() => result.current.openAdminPanel());
    expect(result.current.showAdminPanel).toBe(true);
    act(() => result.current.closeAdminPanel());
    expect(result.current.showAdminPanel).toBe(false);
  });

  it("openAdminPanel no hace nada sin permiso", () => {
    const { result } = renderHook(() => useAdminPanel(false));
    act(() => result.current.openAdminPanel());
    expect(result.current.showAdminPanel).toBe(false);
  });
});
