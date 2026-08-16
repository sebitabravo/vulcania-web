import { describe, expect, it } from "vitest";
import {
  EMERGENCY_CONTACTS,
  EMERGENCY_CONTACTS_SOURCE,
} from "@/lib/emergency-contacts";

describe("emergency-contacts", () => {
  it("lista los tres números oficiales chilenos", () => {
    expect(EMERGENCY_CONTACTS.map((c) => c.number)).toEqual(["131", "132", "133"]);
  });

  it("mapea cada número al servicio correcto", () => {
    const byNumber = Object.fromEntries(EMERGENCY_CONTACTS.map((c) => [c.number, c.label]));
    expect(byNumber["131"]).toContain("SAMU");
    expect(byNumber["132"]).toBe("Bomberos");
    expect(byNumber["133"]).toBe("Carabineros");
  });

  it("genera hrefs tel: válidos y declara la fuente", () => {
    for (const contact of EMERGENCY_CONTACTS) {
      expect(contact.href).toBe(`tel:${contact.number}`);
    }
    expect(EMERGENCY_CONTACTS_SOURCE).toBe("SENAPRED");
  });
});
