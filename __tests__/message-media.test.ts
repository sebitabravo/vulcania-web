import { describe, expect, it } from "vitest";
import {
  composeMessageWithImage,
  fileToDataUrl,
  isImageFile,
  MAX_IMAGE_BYTES,
  parseMessageMedia,
  validateImageFile,
} from "@/lib/message-media";

describe("message-media", () => {
  it("compone y parsea únicamente data URLs de imagen permitidas", () => {
    const image = "data:image/png;base64,aGVsbG8=";
    const message = composeMessageWithImage("Reporte", image);

    expect(parseMessageMedia(message)).toEqual({ text: "Reporte", imageUrl: image });
  });

  it("no renderiza URLs externas o esquemas no seguros como imagen", () => {
    const message = "[img]https://example.com/image.png[/img]";

    expect(parseMessageMedia(message)).toEqual({ text: message, imageUrl: null });
  });

  it("rechaza tipos no soportados y archivos mayores a 2 MB", () => {
    const svg = new File(["<svg />"], "mapa.svg", { type: "image/svg+xml" });
    const huge = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "foto.png", { type: "image/png" });

    expect(isImageFile(svg)).toBe(false);
    expect(validateImageFile(huge)).toEqual({ valid: false, message: "La imagen debe pesar 2 MB o menos." });
  });

  it("convierte un archivo de imagen a data URL", async () => {
    const file = new File(["x"], "foto.png", { type: "image/png" });
    const url = await fileToDataUrl(file);
    expect(url).toMatch(/^data:image\/png;base64,/);
  });
});
