export enum LiturgyItemTypeEnum {
  ANOTACAO = "anotacao",
  ARQUIVO = "arquivo",
  BLOCO = "bloco",
  ITENS_AGENDADOS = "itens-agendados",
  MEDIA_LIBRARY = "biblioteca-midia",
  MUSICA = "musica",
  SITE = "site",
  VIDEO_ONLINE = "video-online",
  BG_SOUND = "som-de-fundo",
  ANUNCIOS = "anuncios",
  OVERLAY = "overlay",
}

const LEGACY_MAP: Record<string, LiturgyItemTypeEnum> = {
  categoria: LiturgyItemTypeEnum.BLOCO,
};

export namespace LiturgyItemTypeEnum {
  export function fromString(value: string): LiturgyItemTypeEnum | undefined {
    if (LEGACY_MAP[value]) return LEGACY_MAP[value];
    return Object.values(LiturgyItemTypeEnum).find((v) => v === value) as LiturgyItemTypeEnum;
  }
}
