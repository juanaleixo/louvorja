export interface BibleVersion {
  id_bible_version: number;
  title: string;
}

export interface BibleBook {
  id_bible_book: number;
  name: string;
  chapters: number;
}

export interface ActiveBibleState {
  active: boolean;
  reference: string;
  bookId: number | null;
  chapter: number | null;
  verse: number | null;
  chapterVerses: string[];
  versionId: number | null;
}
