<template>
  <div class="opt">
    <section class="opt-section">
      <h3 class="opt-section-title">{{ $t("modules.liturgy.name") }}</h3>

      <div class="opt-actions-row">
        <div>
          <button type="button" class="opt-btn" :disabled="exporting" @click="doExport">
            <v-icon icon="mdi-download" size="14" class="mr-1" />
            {{ $t("import_export.export.action") }}
          </button>

          <input
            ref="fileInput"
            type="file"
            accept=".json,.ja"
            style="display: none"
            @change="onFileSelected"
          />
          <p class="opt-hint">{{ $t("import_export.export.hint") }}</p>
        </div>
        <div>
          <button type="button" class="opt-btn" @click="pickFile">
            <v-icon icon="mdi-upload" size="14" class="mr-1" />
            {{ $t("import_export.import.action") }}
          </button>
          <p class="opt-hint">{{ $t("import_export.import.hint") }}</p>
        </div>
      </div>

      <p v-if="exporting" class="opt-status">{{ $t("alert.wait") }}</p>
      <p v-else-if="exportDone" class="opt-status opt-status--ok">
        {{ $t("import_export.export.done") }}
      </p>
      <p v-else-if="importing" class="opt-status">{{ $t("alert.wait") }}</p>
      <p
        v-else-if="importResult"
        class="opt-status"
        :class="importResult.ok ? 'opt-status--ok' : 'opt-status--err'"
      >
        {{ importResult.msg }}
      </p>
    </section>

    <section v-if="importResult?.details" class="opt-section">
      <div class="opt-import-details">
        <div v-for="(line, i) in importResult.details" :key="i" class="opt-detail-row">
          {{ line }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import $liturgy from "@/helpers/Liturgy";
import SljaConverter from "@/helpers/SljaConverter";
import { LiturgyItem } from "@/types/Liturgy";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";

/* ---- Tipos ---- */

interface LjaSection {
  [key: string]: any;
}

interface LjaSections {
  [key: string]: LjaSection;
}

interface DayItemsMap {
  [day: number]: LiturgyItem[];
}

interface DayNotes {
  [day: number]: string;
}

interface LiturgyExportPayload {
  version: number;
  type: string;
  exported_at: string;
  data: {
    days: DayItemsMap;
    day_notes: DayNotes;
    scheduled_categories: unknown[];
    scheduled_items: unknown[];
  };
}

interface LiturgyImportPayload {
  version: number;
  type: string;
  exported_at: string;
  data: {
    days?: Record<string, LiturgyItem[]>;
    day_notes?: Record<string, string>;
    scheduled_categories?: unknown[];
    scheduled_items?: unknown[];
  };
}

interface ImportResult {
  ok: boolean;
  msg: string;
  details?: string[];
}

/* ---- Delphi color map ---- */

const DELPHI_NAMED_COLORS: Record<string, string> = {
  clBlack: "#000000",
  clMaroon: "#800000",
  clGreen: "#008000",
  clOlive: "#808000",
  clNavy: "#000080",
  clPurple: "#800080",
  clTeal: "#008080",
  clGray: "#808080",
  clSilver: "#C0C0C0",
  clRed: "#FF0000",
  clLime: "#00FF00",
  clYellow: "#FFFF00",
  clBlue: "#0000FF",
  clFuchsia: "#FF00FF",
  clAqua: "#00FFFF",
  clWhite: "#FFFFFF",
};

/* ---- Estado ---- */

const fileInput = ref<HTMLInputElement | null>(null);
const exporting = ref<boolean>(false);
const exportDone = ref<boolean>(false);
const importing = ref<boolean>(false);
const importResult = ref<ImportResult | null>(null);

/* ---- Helpers ---- */

function delphiColorToWeb(delphi: string | null | undefined): string {
  if (!delphi) return "#4F0000";
  if (delphi.startsWith("$")) {
    const hex = delphi.slice(1);
    if (hex.length === 8) {
      return "#" + hex.slice(6, 8) + hex.slice(4, 6) + hex.slice(2, 4);
    }
    return "#" + hex;
  }
  return DELPHI_NAMED_COLORS[delphi] || delphi;
}

function parseLja(text: string): DayItemsMap {
  const { parseIniWithSections } = SljaConverter;
  const sections = parseIniWithSections(text) as LjaSections;
  const geral = sections["Geral"] || {};
  const days: DayItemsMap = {};
  const seen = new Set<string>();

  for (let dayIdx = 0; dayIdx <= 6; dayIdx++) {
    const groupKey = String(dayIdx + 1);
    const keysStr = geral[groupKey];
    if (!keysStr) continue;

    const itemIds = keysStr
      .split(";")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const dayItems: LiturgyItem[] = [];

    for (const id of itemIds) {
      if (seen.has(id)) continue;
      seen.add(id);

      const raw = sections[id];
      if (!raw) continue;

      const tipo = LiturgyItemTypeEnum.fromString(raw.tipo)!!;
      const item: LiturgyItem = {
        id: Number(id.replace(/\D/g, "")).toString() || (Date.now() + dayItems.length).toString(),
        tipo,
        item: raw.item || "",
        subitem: raw.subitem || "",
        cor: delphiColorToWeb(raw.cor),
        duration: 0,
        dir: raw.dir || "",
        dir_info: raw.dir_info || "",
        url: raw.url || "",
        musica: tipo === "musica" ? Number(raw.musica) || -1 : -1,
        id_music: tipo === "musica" ? Number(raw.musica) || -1 : -1,
        escolha: raw.escolha === "1",
        subtipo: raw.subtipo || "",
        checked: raw.checked || "",
        has_instrumental_music: raw.has_instrumental_music,
      };
      dayItems.push(item);
    }

    if (dayItems.length > 0) {
      days[dayIdx] = dayItems;
    }
  }

  return days;
}

/* ---- Export ---- */

async function doExport(): Promise<void> {
  exporting.value = true;
  exportDone.value = false;
  importResult.value = null;

  try {
    const days: DayItemsMap = {};
    const dayNotes: DayNotes = {};
    for (let d = 0; d <= 6; d++) {
      const list: LiturgyItem[] = $liturgy.list(d) ?? [];
      if (list.length > 0) days[d] = list;
      const note: string = $liturgy.getDayNote(d) ?? "";
      if (note) dayNotes[d] = note;
    }

    const scheduledCategories: unknown[] = $liturgy.scheduledCategories() ?? [];
    const scheduledItems: unknown[] = $liturgy.scheduledItems() ?? [];

    const payload: LiturgyExportPayload = {
      version: 1,
      type: "louvorja-liturgy",
      exported_at: new Date().toISOString(),
      data: {
        days,
        day_notes: dayNotes,
        scheduled_categories: scheduledCategories,
        scheduled_items: scheduledItems,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `liturgia-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    exportDone.value = true;
    setTimeout(() => {
      exportDone.value = false;
    }, 3000);
  } catch (e) {
    console.error("[ImportExport] export error:", e);
  } finally {
    exporting.value = false;
  }
}

function pickFile(): void {
  fileInput.value?.click();
}

/* ---- Import ---- */

async function onFileSelected(e: Event): Promise<void> {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  importing.value = true;
  importResult.value = null;

  try {
    const buf = await file.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
      text = new TextDecoder("windows-1252").decode(buf);
    }
    const isJa =
      file.name.toLowerCase().endsWith(".ja") && !file.name.toLowerCase().endsWith(".json");

    if (isJa) {
      const days = parseLja(text);
      const totalItems = Object.values(days).reduce((sum, arr) => sum + arr.length, 0);

      if (totalItems === 0) {
        importResult.value = { ok: false, msg: "Nenhum item encontrado no arquivo." };
        return;
      }

      for (const [dayStr, dayItems] of Object.entries(days)) {
        $liturgy.set(dayItems, Number(dayStr));
      }

      importResult.value = {
        ok: true,
        msg: `Liturgia importada com sucesso! (${totalItems} itens em ${Object.keys(days).length} dias)`,
      };
      return;
    }

    const parsed: LiturgyImportPayload = JSON.parse(text);
    if (parsed?.type !== "louvorja-liturgy" || !parsed?.data) {
      importResult.value = {
        ok: false,
        msg: "Arquivo inválido. Não foi possível carregar a liturgia.",
      };
      return;
    }
    const dayData = parsed.data.days;
    if (dayData && typeof dayData === "object") {
      for (const [dayStr, dayItems] of Object.entries(dayData)) {
        if (Array.isArray(dayItems) && dayItems.length > 0) {
          $liturgy.set(dayItems, Number(dayStr));
        }
      }
    }
    const notes = parsed.data.day_notes;
    if (notes && typeof notes === "object") {
      for (const [dayStr, note] of Object.entries(notes)) {
        if (note) $liturgy.setDayNote(Number(dayStr), note);
      }
    }
    if (Array.isArray(parsed.data.scheduled_categories)) {
      $liturgy.setScheduledCategories(parsed.data.scheduled_categories);
    }
    if (Array.isArray(parsed.data.scheduled_items)) {
      $liturgy.setScheduledItems(parsed.data.scheduled_items);
    }
    importResult.value = { ok: true, msg: "Liturgia importada com sucesso!" };
  } catch (e) {
    console.error("[ImportExport] import error:", e);
    importResult.value = { ok: false, msg: "Erro ao importar arquivo." };
  } finally {
    importing.value = false;
    target.value = "";
  }
}
</script>

<style scoped>
.opt-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.opt-actions-row .opt-btn {
  width: auto;
  justify-content: center;
}
.opt-import-details {
  max-height: 200px;
  overflow-y: auto;
  background: rgba(127, 127, 127, 0.06);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.82rem;
}
.opt-detail-row {
  padding: 2px 0;
  opacity: 0.8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
