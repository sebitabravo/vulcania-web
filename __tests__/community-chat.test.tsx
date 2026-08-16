/**
 * Smoke de las acciones demo desde la UI, sin Supabase ni red.
 *
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatComponent from "@/components/chat-component";
import CommunityPanel from "@/components/community-panel";

const demoUser = vi.hoisted(() => ({
  id: "demo-user",
  nombre: "Persona demo",
  telefono: "+56 9 8765 4321",
  rol: "user" as const,
  fecha_creacion: "2026-08-16T12:00:00.000Z",
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ usuario: demoUser }),
}));

vi.mock("@/lib/app-config", () => ({
  APP_CONFIG: {
    demoMode: true,
    demoReadOnly: false,
    demoPhone: "+56 9 8765 4321",
    appName: "Vulcania",
    defaultVolcanoName: "Villarrica",
    enableAdminPanel: false,
  },
}));

describe("demo community and chat actions", () => {
  it("publica un reporte comunitario desde el composer", async () => {
    const user = userEvent.setup();
    const message = `Reporte UI ${Date.now()}`;
    render(<CommunityPanel />);

    const composer = await screen.findByRole("textbox", { name: "Texto del reporte comunitario" });
    await user.type(composer, message);
    await user.click(screen.getByRole("button", { name: /Publicar reporte/i }));

    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
  });

  it("envía un mensaje de chat con Enter", async () => {
    const user = userEvent.setup();
    const message = `Mensaje UI ${Date.now()}`;
    render(<ChatComponent />);

    const conversation = await screen.findByRole("button", { name: /María González/i });
    await user.click(conversation);

    const composer = await screen.findByRole("textbox", { name: "Nuevo mensaje" });
    await user.type(composer, message);
    await user.keyboard("{Enter}");

    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
  });
});
