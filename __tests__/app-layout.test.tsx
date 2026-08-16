import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";

vi.mock("next/font/google", () => ({
  IBM_Plex_Mono: () => ({ variable: "--font-mono" }),
  IBM_Plex_Sans: () => ({ variable: "--font-body" }),
  Space_Grotesk: () => ({ variable: "--font-display" }),
}));

vi.mock("@/contexts/alert-context", () => ({
  AlertProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-provider">{children}</div>
  ),
}));

vi.mock("@/contexts/auth-context", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

vi.mock("@/components/emergency-modal", () => ({
  default: () => <div data-testid="emergency-modal" />,
}));

describe("app/layout", () => {
  it("envuelve el contenido en providers y monta la modal de emergencia", () => {
    render(<RootLayout>contenido</RootLayout>);

    expect(document.documentElement.lang).toBe("es");
    const alertProvider = screen.getByTestId("alert-provider");
    const authProvider = screen.getByTestId("auth-provider");
    expect(alertProvider).toContainElement(authProvider);
    expect(authProvider).toHaveTextContent("contenido");
    expect(screen.getByTestId("emergency-modal")).toBeInTheDocument();
  });

  it("declara metadata del centro de monitoreo", async () => {
    const { metadata } = await import("@/app/layout");
    expect(metadata.title).toContain("Vulcania");
    expect(metadata.description).toContain("Villarrica");
  });
});
