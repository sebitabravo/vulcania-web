import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TerminosPage from "@/app/terminos/page";
import PrivacidadPage from "@/app/privacidad/page";

describe("páginas legales", () => {
  it("expone términos, disclaimer y restricción de edad", () => {
    render(<TerminosPage />);
    expect(screen.getByRole("heading", { name: "Términos de uso" })).toBeInTheDocument();
    expect(screen.getByText(/no reemplaza a las autoridades/i)).toBeInTheDocument();
    expect(screen.getByText(/18 años o más/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacidad y datos" })).toHaveAttribute("href", "/privacidad");
  });

  it("expone finalidades, ARCO, proveedores y canal pendiente", () => {
    render(<PrivacidadPage />);
    expect(screen.getByRole("heading", { name: /Privacidad/ })).toBeInTheDocument();
    expect(screen.getByText(/acceso, rectificación, eliminación u oposición/i)).toBeInTheDocument();
    expect(screen.getByText(/Supabase y, si se habilita, el proveedor de SMS/i)).toBeInTheDocument();
    expect(screen.getByText(/contacto pendiente de configurar/i)).toBeInTheDocument();
  });
});
