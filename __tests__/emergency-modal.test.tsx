/**
 * Regresiones del único camino de emergencia en demo offline.
 *
 * @vitest-environment jsdom
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import EmergencyModal from "@/components/emergency-modal";
import { AlertProvider } from "@/contexts/alert-context";
import { setDemoAlertLevel } from "@/lib/demo-data";

describe("EmergencyModal", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("no abre una alerta verde y abre un único diálogo accesible para rojo", async () => {
    render(
      <AlertProvider>
        <EmergencyModal />
      </AlertProvider>
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    act(() => {
      setDemoAlertLevel("rojo");
    });

    const dialog = await screen.findByRole("alertdialog");
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    expect(dialog).toHaveTextContent("Alerta Roja");
    expect(dialog).toHaveTextContent("Simulación demo");
    expect(dialog).toHaveTextContent("131");
    expect(dialog).toHaveTextContent("132");
    expect(dialog).toHaveTextContent("133");
    expect(screen.getByRole("button", { name: "He leído y entiendo" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "He leído y entiendo" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("alterna el sonido de la alerta desde la modal", async () => {
    render(
      <AlertProvider>
        <EmergencyModal />
      </AlertProvider>
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    act(() => {
      setDemoAlertLevel("rojo");
    });
    await screen.findByRole("alertdialog");

    await userEvent.click(screen.getByRole("button", { name: "Silenciar alerta" }));
    expect(screen.getByRole("button", { name: "Activar sonido" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Activar sonido" }));
    expect(screen.getByRole("button", { name: "Silenciar alerta" })).toBeInTheDocument();
  });

  it("cierra con Escape y reconoce el acuse", async () => {
    render(
      <AlertProvider>
        <EmergencyModal />
      </AlertProvider>
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    act(() => {
      setDemoAlertLevel("rojo");
    });
    await screen.findByRole("alertdialog");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
