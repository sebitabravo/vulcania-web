import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ThemeToggle from "@/components/theme-toggle";

const THEME_KEY = "vulcania-theme";

function mockSystemTheme(dark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: dark });
}

describe("theme-toggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    mockSystemTheme(false);
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("arranca claro cuando el sistema prefiere claro", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Cambiar a tema oscuro" })).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("arranca oscuro cuando el sistema prefiere oscuro", () => {
    mockSystemTheme(true);
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Cambiar a tema claro" })).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("alterna a oscuro y persiste la preferencia", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar a tema oscuro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Cambiar a tema claro" })).toBeInTheDocument();
  });

  it("respeta la preferencia guardada por encima del sistema", () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    mockSystemTheme(false);
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("vuelve a claro y persiste", () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar a tema claro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });
});
