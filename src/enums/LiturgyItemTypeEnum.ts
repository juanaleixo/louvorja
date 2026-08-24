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
}

export namespace LiturgyItemTypeEnum {
  export function fromString(value: string): LiturgyItemTypeEnum | undefined {
    return Object.values(LiturgyItemTypeEnum).find((v) => v === value) as LiturgyItemTypeEnum;
  }
}
