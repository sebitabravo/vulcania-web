import { vi } from "vitest";

export interface ChainQuery {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  [key: string]: unknown;
}

/**
 * Cadena de query de Supabase encadenable; el método terminal resuelve el
 * resultado configurado.
 */
export function makeChainQuery(terminal: "maybeSingle" | "single" | "order" | "limit" | "update" | "insert" | "none", result: unknown): ChainQuery {
  const q = {} as ChainQuery;
  q.select = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.limit = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.neq = vi.fn(() => q);
  q.or = vi.fn(() => q);
  q.maybeSingle = vi.fn();
  q.single = vi.fn();
  q.update = vi.fn(() => q);
  q.insert = vi.fn(() => q);

  if (terminal !== "none") {
    const terminalFn = q[terminal] as ReturnType<typeof vi.fn>;
    terminalFn.mockResolvedValue(result);
  }
  return q;
}

/** Query que termina en maybeSingle, para alertas. */
export function makeSingleQuery(result: unknown): ChainQuery {
  return makeChainQuery("maybeSingle", result);
}

/** Query que termina en order (lista simple), para puntos/avisos/mensajes. */
export function makeListQuery(result: unknown): ChainQuery {
  return makeChainQuery("order", result);
}
