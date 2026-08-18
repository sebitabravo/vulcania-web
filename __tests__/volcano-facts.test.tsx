import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { appConfigMock, supabaseMock, queryMock } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    appConfigMock: { demoMode: true },
    supabaseMock: { from: vi.fn() },
    queryMock: query,
  };
});

vi.mock("@/lib/app-config", () => ({ APP_CONFIG: appConfigMock, hasSupabaseConfig: () => false }));
vi.mock("@/lib/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase")>("@/lib/supabase");
  return { ...actual, supabase: supabaseMock };
});

import VolcanoFacts from "@/components/volcano-facts";

describe("VolcanoFacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigMock.demoMode = true;
  });

  it("muestra ficha curada, fuente y ausencia honesta de parámetros en demo", () => {
    render(<VolcanoFacts />);
    expect(screen.getByRole("heading", { name: /Villarrica/ })).toBeInTheDocument();
    expect(screen.getByText(/2\.847/)).toBeInTheDocument();
    expect(screen.getByText(/152 periodos confirmados/)).toBeInTheDocument();
    expect(screen.getByText(/Sin datos oficiales disponibles/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir fuente/ })).toHaveAttribute("href", expect.stringContaining("volcano.si.edu"));
  });

  it("consulta la ficha completa en modo full y muestra error si falta", async () => {
    appConfigMock.demoMode = false;
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: { message: "missing" } });
    supabaseMock.from.mockReturnValue(queryMock);
    render(<VolcanoFacts />);
    await waitFor(() => expect(screen.getByText(/No pudimos cargar la ficha/)).toBeInTheDocument());
    expect(supabaseMock.from).toHaveBeenCalledWith("informacion_volcan");
  });
});
