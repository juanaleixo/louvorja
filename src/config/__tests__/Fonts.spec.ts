import { describe, expect, it } from "vitest";
import {
  FONT,
  resolveDefaultFont,
  resolveFont,
} from "@/config/Fonts";

describe("Fonts", () => {
  it("mantém famílias CSS concretas", () => {
    expect(resolveFont("RobotoVariable", FONT.PROJECTION.FALLBACK)).toBe("RobotoVariable");
    expect(resolveDefaultFont("OpenSans", FONT.UI.FALLBACK)).toBe("OpenSans");
  });

  it("resolve Padrão da Interface pela variável global", () => {
    expect(resolveFont(FONT.UI.INHERIT, FONT.PROJECTION.FALLBACK)).toBe(
      `var(${FONT.UI.CSS_VAR}, ${FONT.UI.FALLBACK})`,
    );
    expect(resolveFont("__UI_FONT__", FONT.PROJECTION.FALLBACK)).toBe(
      `var(${FONT.UI.CSS_VAR}, ${FONT.UI.FALLBACK})`,
    );
  });

  it("resolve Padrão da Projecão pela variável global", () => {
    expect(resolveFont(FONT.PROJECTION.INHERIT, FONT.UI.FALLBACK)).toBe(
      `var(${FONT.PROJECTION.CSS_VAR}, ${FONT.PROJECTION.FALLBACK})`,
    );
  });

  it("resolve Padrão local pelo default informado", () => {
    expect(resolveFont(FONT.DEFAULT, "fallback", "LocalDefault")).toBe("LocalDefault");
  });

  it("não permite marcadores contextuais nos padrões de Geral", () => {
    expect(resolveDefaultFont(FONT.DEFAULT, FONT.UI.FALLBACK)).toBe(FONT.UI.FALLBACK);
    expect(resolveDefaultFont(FONT.UI.INHERIT, FONT.UI.FALLBACK)).toBe(FONT.UI.FALLBACK);
    expect(resolveDefaultFont(FONT.PROJECTION.INHERIT, FONT.PROJECTION.FALLBACK)).toBe(
      FONT.PROJECTION.FALLBACK,
    );
  });
});
