import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

describe("ui/alert", () => {
  it("renderiza con rol alert y su contenido", () => {
    render(
      <Alert>
        <AlertTitle>Titulo</AlertTitle>
        <AlertDescription>Descripcion</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Titulo");
    expect(alert).toHaveTextContent("Descripcion");
  });

  it("aplica la variante destructiva", () => {
    render(<Alert variant="destructive">Peligro</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("border-destructive/50");
  });

  it("propaga className extra", () => {
    render(<Alert className="extra-clase">Mensaje</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("extra-clase");
  });
});
