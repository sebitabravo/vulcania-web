import { beforeEach, describe, expect, it } from "vitest";
import {
  addDemoCommunity,
  addDemoMessage,
  getDemoAlert,
  getDemoCommunity,
  getDemoMessages,
  markDemoConversationRead,
  setDemoAlertLevel,
} from "@/lib/demo-data";

describe("demo-data", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("persiste el nivel demo en la sesión y lo comunica", () => {
    expect(getDemoAlert().nivel_alerta).toBe("verde");
    setDemoAlertLevel("amarillo");
    expect(getDemoAlert().nivel_alerta).toBe("amarillo");
    expect(getDemoAlert().es_simulacion).toBe(true);
  });

  it("conserva avisos y mensajes al cambiar de panel", () => {
    const avisoId = `test-aviso-${Date.now()}`;
    addDemoCommunity({
      id: avisoId,
      usuario_id: "demo-user",
      autor_nombre: "Test",
      mensaje: "Aviso de prueba",
      fecha_creacion: new Date().toISOString(),
      estado: "activo",
    });
    expect(getDemoCommunity()[0]?.id).toBe(avisoId);

    const messageId = `test-message-${Date.now()}`;
    addDemoMessage({
      id: messageId,
      emisor_id: "demo-maria",
      receptor_id: "demo-user",
      mensaje: "Mensaje de prueba",
      fecha_envio: new Date().toISOString(),
      leido: false,
    });
    expect(getDemoMessages().at(-1)?.id).toBe(messageId);
    expect(markDemoConversationRead("demo-user", "demo-maria").at(-1)?.leido).toBe(true);
  });
});
