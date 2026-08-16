import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GlobalError from "@/app/error";

describe("app/error", () => {
  it("muestra el mensaje de error global y su acción de reintento", () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error("boom")} reset={reset} />);

    expect(screen.getByText("Ocurrió un error inesperado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("no expone el mensaje de error crudo en la UI", () => {
    render(<GlobalError error={new Error("detalle secreto")} reset={vi.fn()} />);
    expect(screen.queryByText("detalle secreto")).not.toBeInTheDocument();
  });

  it("usa role alert para anunciar el fallo", () => {
    render(<GlobalError error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
