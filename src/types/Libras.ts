export interface LibrasCacheEntry {
  id: string;
  type: "music" | "bible";
  ref_id: string;
  lang: string;
  original_text: string;
  gloss: string;
  tokens: string[];
  bundles_cached: boolean;
  bundles_size: number;
  created_at: string;
  updated_at: string;
}

export interface LibrasCacheStats {
  total_entries: number;
  music_count: number;
  bible_count: number;
  total_gloss_bytes: number;
  total_bundles_bytes: number;
  total_bytes: number;
}
