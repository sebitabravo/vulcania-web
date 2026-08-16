import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emite debug e info a la consola en desarrollo", () => {
    logger.debug("depurar", 1);
    expect(console.log).toHaveBeenCalledWith("depurar", 1);
    logger.info("info");
    expect(console.log).toHaveBeenCalledWith("info");
  });

  it("emite warn y error a sus canales", () => {
    logger.warn("cuidado");
    expect(console.warn).toHaveBeenCalledWith("cuidado");
    logger.error("falló");
    expect(console.error).toHaveBeenCalledWith("falló");
  });
});
