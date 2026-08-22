/**
 * ImageFileExts.ts — Extensões de arquivo aceitas como imagem em todo o
 * programa (editor, liturgia, projeção de fundo/arquivo, biblioteca de mídia,
 * ação ao término do timer etc.).
 *
 * HEIC/HEIF incluídos no aceite; observação: o Chromium não decodifica HEIC
 * nativamente — arquivos nesse formato são armazenados/serve corretamente,
 * mas podem não renderizar em <img> dependendo do ambiente.
 */

export const IMAGE_FILE_EXTS: string[] = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "webp",
  "svg",
  "heic",
  "heif",
];

export default { IMAGE_FILE_EXTS };
