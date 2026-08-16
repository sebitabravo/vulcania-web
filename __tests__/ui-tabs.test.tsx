import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

describe("ui/tabs", () => {
  it("muestra el contenido de la pestaña activa", () => {
    render(
      <Tabs defaultValue="mapa">
        <TabsList>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="mapa">Contenido mapa</TabsContent>
        <TabsContent value="chat">Contenido chat</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Contenido mapa")).toBeInTheDocument();
    expect(screen.queryByText("Contenido chat")).not.toBeInTheDocument();
  });

  it("cambia de pestaña al hacer click", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="mapa">
        <TabsList>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="mapa">Contenido mapa</TabsContent>
        <TabsContent value="chat">Contenido chat</TabsContent>
      </Tabs>
    );
    await user.click(screen.getByRole("tab", { name: "Chat" }));
    expect(screen.getByText("Contenido chat")).toBeInTheDocument();
    expect(screen.queryByText("Contenido mapa")).not.toBeInTheDocument();
  });

  it("respeta el value controlado", () => {
    render(
      <Tabs value="chat">
        <TabsContent value="chat">Solo chat</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Solo chat")).toBeInTheDocument();
  });
});
