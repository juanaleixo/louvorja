/** @category deve-virar-composable — Usa UserData + AppData (Pinia); requer renderer. */
import $userdata from "@/helpers/UserData";
import $dev from "@/helpers/Dev";
import ScheduledStore from "@/helpers/ScheduledStore";
import { KEYS } from "@/constants/UserDataKeys";
import { LiturgyItemTypeEnum } from "@/enums/LiturgyItemTypeEnum";
import type { LiturgyItem, ScheduledCategory, ScheduledItem } from "@/types/Liturgy";

const DEFAULT_COLOR = "#4F0000";

function uid(prefix = "item_"): string {
  const d = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  const stamp =
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    pad(d.getMilliseconds(), 3);
  return prefix + stamp + Math.floor(Math.random() * 1000);
}

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function todayDayIndex(): number {
  return new Date().getDay();
}

function clampDay(i: number): number {
  const n = Number(i);
  if (!Number.isFinite(n)) return todayDayIndex();
  return Math.max(0, Math.min(6, Math.floor(n)));
}

function _dayKey(day: number): string {
  return `${KEYS.MODULES.LITURGY.DAYS}.${clampDay(day)}`;
}

export default {
  getActiveDay(): number {
    const stored = $userdata.get<number>(KEYS.MODULES.LITURGY.ACTIVE_DAY, null);
    if (stored == null) return todayDayIndex();
    return clampDay(stored);
  },

  /** Data (Date) do dia ativo na semana vigente. Ex.: se hoje é dom e o dia
   *  ativo é sáb, retorna a data do sábado desta semana. */
  getActiveDate(): Date {
    const today = new Date();
    const todayDow = today.getDay();
    const activeDow = this.getActiveDay();
    const diff = activeDow - todayDow;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    return target;
  },

  setActiveDay(day: number): void {
    $userdata.set(KEYS.MODULES.LITURGY.ACTIVE_DAY, clampDay(day));
  },

  async migrate(): Promise<boolean> {
    let migrated = false;

    const legacyItems = $userdata.get<unknown>(KEYS.MODULES.LITURGY.LEGACY_ITEMS, null);
    if (Array.isArray(legacyItems) && legacyItems.length > 0) {
      await new Promise((r) => setTimeout(r, 0));
      const today = todayDayIndex();
      const existing = $userdata.get<LiturgyItem[] | null>(_dayKey(today), null);
      if (!existing || existing.length === 0) {
        $userdata.set(_dayKey(today), legacyItems as LiturgyItem[]);
        $dev.write("liturgy:migrate legacy items → day", today);
      }
      $userdata.set(KEYS.MODULES.LITURGY.LEGACY_ITEMS, []);
      migrated = true;
    }

    const weeks = $userdata.get<Record<string, LiturgyItem[]> | null>(KEYS.MODULES.LITURGY.LEGACY_WEEKS, null);
    if (weeks && typeof weeks === "object") {
      const keys = Object.keys(weeks);
      if (keys.length > 0) {
        await new Promise((r) => setTimeout(r, 0));
        const activeWeek = $userdata.get<string | null>(KEYS.MODULES.LITURGY.LEGACY_ACTIVE_WEEK, null) || keys[0];
        const items = weeks[activeWeek];
        if (Array.isArray(items) && items.length > 0) {
          const today = todayDayIndex();
          const existing = $userdata.get<LiturgyItem[] | null>(_dayKey(today), null);
          if (!existing || existing.length === 0) {
            $userdata.set(_dayKey(today), items);
            $dev.write(`liturgy:migrate week ${activeWeek} → day`, today, `(${items.length} itens)`);
          }
        }
        $userdata.set(KEYS.MODULES.LITURGY.LEGACY_WEEKS, {});
        $userdata.set(KEYS.MODULES.LITURGY.LEGACY_ACTIVE_WEEK, null);
        $userdata.set(KEYS.MODULES.LITURGY.LEGACY_WEEKDAY_NOTES, {});
        migrated = true;
      }
    }

    for (let d = 0; d <= 6; d++) {
      const dayItems = $userdata.get<LiturgyItem[] | null>(_dayKey(d), null);
      if (!Array.isArray(dayItems) || dayItems.length === 0) continue;
      let dirty = false;
      const repaired = dayItems.map((it) => {
        if (it && (it.id == null || it.id === "")) {
          dirty = true;
          return { ...it, id: uid() };
        }
        return it;
      });
      if (dirty) {
        $userdata.set(_dayKey(d), repaired);
        $dev.write(`liturgy:repair-ids day ${d}`, repaired.length);
        migrated = true;
      }
    }

    for (let d = 0; d <= 6; d++) {
      const dayItems = $userdata.get<LiturgyItem[] | null>(_dayKey(d), null);
      if (!Array.isArray(dayItems) || dayItems.length === 0) continue;
      let dirty = false;
      const converted = dayItems.map((it) => {
        if (it && (it.tipo as string) === "categoria") {
          dirty = true;
          return { ...it, tipo: LiturgyItemTypeEnum.BLOCO };
        }
        return it;
      });
      if (dirty) {
        $userdata.set(_dayKey(d), converted);
        $dev.write(`liturgy:migrate categoria→bloco day ${d}`, converted.length);
        migrated = true;
      }
    }

    return migrated;
  },

  list(day?: number): LiturgyItem[] {
    const d = day == null ? this.getActiveDay() : clampDay(day);
    return $userdata.get<LiturgyItem[]>(_dayKey(d), []) as LiturgyItem[];
  },

  set(items: LiturgyItem[], day?: number): void {
    const d = day == null ? this.getActiveDay() : clampDay(day);
    $userdata.set(_dayKey(d), items);
  },

  get(id: string, day?: number): LiturgyItem | null {
    return this.list(day).find((i) => i.id === id) || null;
  },

  add(item: Partial<LiturgyItem>, day?: number): LiturgyItem {
    const items = this.list(day);
    const merged: LiturgyItem = {
      id: uid(),
      tipo: LiturgyItemTypeEnum.ANOTACAO,
      subtipo: "",
      item: "",
      subitem: "",
      cor: DEFAULT_COLOR,
      checked: "",
      duration: 0,
      musica: 0,
      dir: "",
      dir_info: "",
      url: "",
      escolha: false,
      has_instrumental_music: false,
      ...item,
    };
    if (!merged.id) merged.id = uid();
    items.push(merged);
    this.set(items, day);
    $dev.write("liturgy:add", merged.item || merged.tipo);
    return merged;
  },

  insert(item: Partial<LiturgyItem>, day: number, index: number): LiturgyItem {
    const items = [...this.list(day)];

    const merged: LiturgyItem = {
      id: uid(),
      tipo: LiturgyItemTypeEnum.ANOTACAO,
      subtipo: "",
      item: "",
      subitem: "",
      cor: DEFAULT_COLOR,
      checked: "",
      duration: 0,
      musica: 0,
      dir: "",
      dir_info: "",
      url: "",
      escolha: false,
      has_instrumental_music: false,
      ...item,
    };
    if (!merged.id) merged.id = uid();

    const targetIndex = Math.max(0, Math.min(index, items.length));
    items.splice(targetIndex, 0, merged);
    this.set(items, day);

    $dev.write("liturgy:insert", merged.item || merged.tipo, `index=${targetIndex}`);

    return merged;
  },

  update(id: string, patch: Partial<LiturgyItem>, day?: number): void {
    this.set(
      this.list(day).map((i) => (i.id === id ? { ...i, ...patch } : i)),
      day
    );
  },

  remove(id: string, day?: number): void {
    this.set(
      this.list(day).filter((i) => i.id !== id),
      day
    );
  },

  reorder(items: LiturgyItem[], day?: number): void {
    this.set([...items], day);
  },

  clear(day?: number): void {
    this.set([], day);
  },

  toggleChecked(id: string, day?: number): void {
    const item = this.get(id, day);
    if (!item) return;
    const today = todayStamp();
    this.update(id, { checked: item.checked === today ? "" : today }, day);
  },

  isCheckedToday(item: LiturgyItem): boolean {
    return !!(item?.checked && item.checked === todayStamp());
  },

  getDayNote(day: number): string {
    return $userdata.get<string>(`${KEYS.MODULES.LITURGY.DAY_NOTES}.${clampDay(day)}`, "") as string;
  },

  setDayNote(day: number, html: string): void {
    $userdata.set(`${KEYS.MODULES.LITURGY.DAY_NOTES}.${clampDay(day)}`, html ?? "");
  },

  addAnnotation(title: string, text: string, cor = DEFAULT_COLOR, day?: number): LiturgyItem {
    return this.add({ tipo: LiturgyItemTypeEnum.ANOTACAO, item: title, subitem: text || "", cor }, day);
  },

  addBloco(name: string, cor = DEFAULT_COLOR, day?: number): LiturgyItem {
    return this.add({ tipo: LiturgyItemTypeEnum.BLOCO, item: name, cor }, day);
  },

  addFile(title: string, dir: string, dirInfo = "E", cor = DEFAULT_COLOR, day?: number): LiturgyItem {
    const isFolder = dir.endsWith("/") || dir.endsWith("\\");
    return this.add(
      {
        tipo: LiturgyItemTypeEnum.ARQUIVO,
        item: title,
        subitem: (isFolder ? "Pasta " : "Arquivo ") + dir,
        subtipo: isFolder ? "dir" : "arq",
        dir,
        dir_info: dirInfo,
        cor,
      },
      day
    );
  },

  addSite(title: string, url: string, cor = DEFAULT_COLOR, day?: number): LiturgyItem {
    const validUrl = this.validateUrl(url);
    return this.add(
      { tipo: LiturgyItemTypeEnum.SITE, item: title, subitem: "Site " + validUrl, url: validUrl, cor },
      day
    );
  },

  addMusic(
    id_music: number,
    name: string,
    has_instrumental_music = false,
    cor = DEFAULT_COLOR,
    day?: number
  ): LiturgyItem {
    return this.add(
      {
        tipo: LiturgyItemTypeEnum.MUSICA,
        item: name || `Música ${id_music}`,
        subitem: "Música " + (name || `#${id_music}`),
        musica: id_music,
        escolha: false,
        subtipo: has_instrumental_music ? "ja" : "div",
        has_instrumental_music: !!has_instrumental_music,
        id_music,
        cor,
      } as Partial<LiturgyItem>,
      day
    );
  },

  addMusicChoice(cor = DEFAULT_COLOR, day?: number): LiturgyItem {
    return this.add(
      {
        tipo: LiturgyItemTypeEnum.MUSICA,
        item: "Clique para escolher a música",
        subitem: "Clique para escolher a música",
        musica: -1,
        escolha: true,
        subtipo: "escolha",
        cor,
      } as Partial<LiturgyItem>,
      day
    );
  },

  addScheduledItem(categoriaId: string, categoriaNome: string, cor = DEFAULT_COLOR, day?: number): LiturgyItem {
    return this.add(
      {
        tipo: LiturgyItemTypeEnum.ITENS_AGENDADOS,
        item: categoriaNome,
        subitem: "",
        id: categoriaId,
        cor,
      } as Partial<LiturgyItem>,
      day
    );
  },

  validateUrl(url: string): string {
    if (!url) return "";
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("ftp://")) {
      return "http://" + url;
    }
    return url;
  },

  // ── Itens agendados: persistidos no IndexedDB via ScheduledStore ──

  scheduledCategories(): ScheduledCategory[] {
    return ScheduledStore.categories();
  },

  setScheduledCategories(list: ScheduledCategory[]): void {
    // Substituição completa (usada pela importação/exportação).
    void Promise.all([
      ...ScheduledStore.items().map((i) => ScheduledStore.deleteItem(i.id as string)),
    ]).then(async () => {
      for (const c of list) await ScheduledStore.saveCategory(c);
      const cur = new Set(list.map((c) => String(c.id)));
      for (const i of this.scheduledItems()) {
        if (!cur.has(String(i.categoria))) continue;
      }
    });
  },

  addScheduledCategory(nome: string): string {
    const id = uid("cat_");
    void ScheduledStore.saveCategory({ id, nome } as ScheduledCategory);
    return id;
  },

  updateScheduledCategory(id: string | number, patch: Partial<ScheduledCategory>): void {
    const cat = this.scheduledCategories().find(
      (c) => String(c.id) === String(id)
    );
    if (cat) void ScheduledStore.saveCategory({ ...cat, ...patch });
  },

  removeScheduledCategory(id: string | number): void {
    void ScheduledStore.deleteCategory(id);
  },

  scheduledItems(): ScheduledItem[] {
    return ScheduledStore.items();
  },

  setScheduledItems(list: ScheduledItem[]): void {
    void Promise.all([
      ...this.scheduledItems().map((i) => ScheduledStore.deleteItem(i.id as string)),
    ]).then(async () => {
      for (const i of list) await ScheduledStore.saveItem(i);
    });
  },

  addScheduledItemEntry(
    categoria: string,
    data: string,
    nome: string,
    arquivo: string,
    arquivoInfo = "E",
    duracao?: number
  ): string {
    const id = uid("sch_");
    const entry: ScheduledItem = {
      id,
      categoria,
      data,
      nome:
        nome ||
        (arquivo
          ? arquivo
              .split(/[\\/]/)
              .pop()
              ?.replace(/\.[^.]+$/, "") || ""
          : ""),
      arquivo: arquivo || "",
      arquivo_info: arquivoInfo,
      ...(duracao != null ? { duracao } : {}),
    };
    void ScheduledStore.saveItem(entry);
    return id;
  },

  updateScheduledItemEntry(id: string | number, patch: Partial<ScheduledItem>): void {
    const cur = this.scheduledItems().find((i) => String(i.id) === String(id));
    if (cur) void ScheduledStore.saveItem({ ...cur, ...patch });
  },

  removeScheduledItemEntry(id: string | number): void {
    void ScheduledStore.deleteItem(id);
  },

  findScheduledForToday(categoriaId: string | number, date = new Date()): ScheduledItem | undefined {
    const iso = date.toISOString().slice(0, 10);
    const catStr = String(categoriaId);
    const all = this.scheduledItems().filter((i) => String(i.categoria) === catStr);
    return all.find((i) => i.data === iso);
  },

  getCurrentLiturgyId(): string | null {
    return $userdata.get<string>(KEYS.MODULES.LITURGY.CURRENT_LITURGY_ID, null);
  },

  setCurrentLiturgyId(id: string | null): void {
    $userdata.set(KEYS.MODULES.LITURGY.CURRENT_LITURGY_ID, id);
  },

  getDayLiturgyId(day: number): string | null {
    const map = $userdata.get<Record<number, string>>(KEYS.MODULES.LITURGY.DAY_LITURGIES, {}) as Record<number, string>;
    return map[clampDay(day)] ?? null;
  },

  setDayLiturgyId(day: number, id: string | null): void {
    const map = $userdata.get<Record<number, string>>(KEYS.MODULES.LITURGY.DAY_LITURGIES, {}) as Record<number, string>;
    if (id) {
      map[clampDay(day)] = id;
    } else {
      delete map[clampDay(day)];
    }
    $userdata.set(KEYS.MODULES.LITURGY.DAY_LITURGIES, map);
  },

  isDecimoTerceiroSabado(date: Date): boolean {
    if (date.getDay() !== 6) return false;

    const year = date.getFullYear();
    const month = date.getMonth();
    const quarterEndMonth = Math.floor(month / 3) * 3 + 2;

    const lastDay = new Date(year, quarterEndMonth + 1, 0);
    while (lastDay.getDay() !== 6) {
      lastDay.setDate(lastDay.getDate() - 1);
    }

    return (
      date.getFullYear() === lastDay.getFullYear() &&
      date.getMonth() === lastDay.getMonth() &&
      date.getDate() === lastDay.getDate()
    );
  },
}
