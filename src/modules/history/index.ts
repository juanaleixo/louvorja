import BaseModule from "@modules/BaseModule";
import type { Module } from "@/types/Module"
import es from "./lang/es.json";
import pt from "./lang/pt.json";
import { module as manifest } from "./manifest";

export default class extends BaseModule {
  constructor() {
    const config: Module & { translations?: Record<string, unknown> } = { ...manifest, translations: { pt, es } };
    super(config);
  }
}
