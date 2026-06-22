export interface Bible {
  versions: BibleVersion[]
  books: BibleBook[]
  chapters: number[]
  verses: number[]
}

export interface BibleVersion {
  id_bible_version: number
  name: string
  abbreviation: string
}

export interface BibleBook {
  id_bible_book: number
  name: string
  abbreviation?: string
  chapters: number
}

export interface BibleVerse {
  version: number | null
  book: number | null
  chapter: number | null
  verse: number | null
}

export interface BibleVersePayload {
  text: string
  reference: string
  bookId: number
  chapter: number
  verses: number[]
  active: boolean
}

export interface BibleSearchResult {
  id_bible_book: number
  id_bible_version: number
  book: string
  chapter: number
  verse: number
  reference: string
  text: string
  bookId?: number
}

export interface ActiveBibleState {
  active: boolean
  reference: string
  bookId: number | null
  chapter: number | null
  verse: number | null
  chapterVerses: string[]
  versionId: number | null
}
