/**
 * @category helper-puro — Seleção de arquivos de imagem com retorno de URL persistente.
 *
 * Desktop (Electron): usa Platform.api.storage.chooseImage()
 *   → retorna "louvorja://local/..." (processado pelo protocolo customizado)
 *
 * Web/PWA: cria input file + FileReader.readAsDataURL()
 *   → retorna "data:image/...;base64,..." (auto-contido, sobrevive a reload)
 */

import Platform from "@/helpers/Platform";
import $path from "@/helpers/Path";

type ImagePicker = { storage?: { chooseImage?: () => Promise<string | string[] | null> } };

/**
 * Abre o seletor de imagens e retorna uma URL persistente para o arquivo escolhido.
 * Retorna null se o usuário cancelar.
 */
export async function pickImage(): Promise<string | null> {
  const api = (Platform.api as ImagePicker) || null;

  if (Platform.isDesktop && api?.storage?.chooseImage) {
    try {
      const result = await api.storage.chooseImage();
      if (!result) return null;
      const filePath = Array.isArray(result) ? result[0] : result;
      return $path.local(filePath);
    } catch (e) {
      console.warn("[FilePicker] chooseImage falhou, fallback web:", e);
    }
  }

  // Web fallback
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

/**
 * Abre o seletor de imagens e retorna o ArrayBuffer + MIME do arquivo selecionado.
 * Útil para armazenar a imagem no IndexedDB via SettingsStorage.
 */
export async function pickImageData(): Promise<{ data: ArrayBuffer; mime: string } | null> {
  const api = (Platform.api as ImagePicker) || null;

  if (Platform.isDesktop && api?.storage?.chooseImage) {
    try {
      const result = await api.storage.chooseImage();
      if (!result) return null;
      const filePath = Array.isArray(result) ? result[0] : result;
      const res = await fetch($path.local(filePath));
      return { data: await res.arrayBuffer(), mime: res.headers.get("content-type") || "image/png" };
    } catch (e) {
      console.warn("[FilePicker] chooseImage falhou, fallback web:", e);
    }
  }

  // Web fallback
  const file = await pickFileViaInput();
  if (!file) return null;
  return { data: await file.arrayBuffer(), mime: file.type || "image/png" };
}

async function pickFileViaInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

/**
 * Lê um arquivo File como Data URL (base64) — útil para drag-and-drop ou
 * quando o File já existe sem precisar abrir o seletor.
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
