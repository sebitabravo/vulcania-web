import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { appConfigMock, authMock, queryMock, supabaseMock } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(),
  };
  for (const method of ["select", "eq", "order", "limit"]) query[method as keyof typeof query].mockReturnValue(query);
  return {
    appConfigMock: { demoMode: false, smsAlertsEnabled: true },
    authMock: { usuario: { id: "u1", nombre: "Operador" } },
    queryMock: query,
    supabaseMock: { from: vi.fn(() => query) },
  };
});

vi.mock("@/lib/app-config", () => ({ APP_CONFIG: appConfigMock }));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => authMock }));
vi.mock("@/lib/supabase", () => ({ supabase: supabaseMock }));

import SmsAlertConsent from "@/components/sms-alert-consent";

describe("SmsAlertConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMock.maybeSingle.mockResolvedValue({ data: { aceptado: false }, error: null });
    queryMock.upsert.mockResolvedValue({ data: null, error: null });
  });

  it("carga la preferencia y registra la activación opcional", async () => {
    const user = userEvent.setup();
    render(<SmsAlertConsent />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Activar" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Activar" }));
    await waitFor(() => expect(queryMock.upsert).toHaveBeenCalledWith(expect.objectContaining({ tipo: "alertas_sms", aceptado: true }), expect.any(Object)));
    expect(screen.getByRole("status")).toHaveTextContent(/activadas/i);
  });

  it("queda oculto en demo", async () => {
    appConfigMock.demoMode = true;
    render(<SmsAlertConsent />);
    expect(screen.queryByText(/SMS/)).not.toBeInTheDocument();
  });
});
