export enum LiturgyItemTypeEnum {
  ANOTACAO = "anotacao",
  ARQUIVO = "arquivo",
  BLOCO = "bloco",
  ITENS_AGENDADOS = "itens-agendados",
  MUSICA = "musica",
  SITE = "site",
  VIDEO_ONLINE = "video-online",
}

export namespace LiturgyItemTypeEnum {
  export function fromString(value: string): LiturgyItemTypeEnum | undefined {
    return Object.values(LiturgyItemTypeEnum).find((v) => v === value) as LiturgyItemTypeEnum;
  }
}
