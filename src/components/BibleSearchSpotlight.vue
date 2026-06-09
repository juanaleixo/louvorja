<template>
  <v-dialog
    v-model="model"
    max-width="600"
    content-class="bible-search-spotlight"
    @keydown.esc="model = false"
  >
    <v-card>
      <v-card-text class="pa-4">
        <v-text-field
          v-model="searchQuery"
          :label="t('components.inputs.search') + ' (ex: João 3:16)'"
          prepend-inner-icon="mdi-book-search"
          clearable
          hide-details
          autofocus
          variant="outlined"
          density="comfortable"
          @update:model-value="onSearch"
          @keydown.enter="onEnter"
        />

        <div v-if="loading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <v-list v-else-if="results.length > 0" class="mt-2 search-results" max-height="400">
          <v-list-item
            v-for="(res, i) in results"
            :key="i"
            :title="res.reference"
            :subtitle="truncate(res.text, 100)"
            hover
            @click="selectResult(res)"
          >
            <template #prepend>
              <v-icon icon="mdi-book-open-variant" color="primary" class="mr-2" />
            </template>
          </v-list-item>
        </v-list>

        <div v-else-if="searchQuery && !loading" class="text-center pa-8 text-medium-emphasis">
          {{ t("options.module.bible.empty_search") }}
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Database from "@/helpers/Database";
import UserData from "@/helpers/UserData";
import Modules from "@/helpers/Modules";
import ProjectionWindows from "@/helpers/ProjectionWindows";
import Broadcast, { BROADCAST_TYPE } from "@/helpers/Broadcast";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "select"]);

const { t, locale } = useI18n();
const moduleId = "bible";

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const searchQuery = ref("");
const results = ref([]);
const loading = ref(false);
const books = ref([]);
let searchTimeout = null;

async function loadBooks() {
  const lang = locale.value === "es" ? "es" : "pt";
  // Evitar carregar livros se já estiver carregando ou se já tiver livros e não mudou o idioma
  const cacheKey = `bible_books_${lang}`;
  if (books.value && books.value._lang === lang) return;

  try {
    const data = await Database.get(`${lang}_bible_book`);
    if (data) {
      data._lang = lang;
      books.value = data;
    }
  } catch (e) {
    console.error("[BibleSearchSpotlight] Erro ao carregar livros:", e);
  }
}

async function onSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  if (!searchQuery.value) {
    results.value = [];
    return;
  }

  // Se a busca for curta (1-2 letras), não fazemos nada ou limpamos
  if (searchQuery.value.trim().length < 2) {
    results.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    loading.value = true;
    try {
      const savedVersion = UserData.get(`modules.${moduleId}.id_bible_version`);
      await performSearch(savedVersion);
    } finally {
      loading.value = false;
    }
  }, 500); // Aumentado para 500ms para ser mais conservador
}

async function performSearch(preferredVersionId = null) {
  const lang = locale.value === "es" ? "es" : "pt";
  if (!books.value || books.value._lang !== lang) await loadBooks();
  if (!books.value) {
    results.value = [];
    return;
  }

  const query = searchQuery.value.trim();

  // Normalizar para busca (sem acentos, lowercase)
  const normalize = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const queryNorm = normalize(query);

  // 1. Tentar parser de referência (Ex: João 3:16 ou Joao 3 16 ou 1 Jo 2 3)
  const refMatch = query.match(/^(\d?\s*[a-zA-Z\s]+?)\s+(\d+)(?:[\s:]+(\d+))?$/);
  if (refMatch) {
    const bookSearch = normalize(refMatch[1].replace(/\s+/g, ""));
    const chapter = parseInt(refMatch[2], 10);
    const verse = refMatch[3] ? parseInt(refMatch[3], 10) : null;

    const book = books.value.find((b) => {
      const bName = normalize(b.name).replace(/\s+/g, "");
      const bAbbr = normalize(b.abbreviation).replace(/\s+/g, "");
      return bName.includes(bookSearch) || bAbbr === bookSearch;
    });

    if (book) {
      // Tentar carregar a versão preferida primeiro, senão a versão 1
      let versionId = preferredVersionId || 1;
      let bibleFile = `bible_${versionId}_${book.id_bible_book}_${chapter}`;
      let verses = await Database.get(bibleFile, { silent: true });

      if (!verses && versionId != 1) {
        versionId = 1;
        bibleFile = `bible_${versionId}_${book.id_bible_book}_${chapter}`;
        verses = await Database.get(bibleFile, { silent: true });
      }

      if (!verses) {
        // Se ainda não encontrou, tenta carregar o índice de versões e pega a primeira disponível
        try {
          const versions = await Database.get(`${lang}_bible_version`, { silent: true });
          if (versions && versions.length > 0) {
            versionId = versions[0].id_bible_version;
            bibleFile = `bible_${versionId}_${book.id_bible_book}_${chapter}`;
            verses = await Database.get(bibleFile, { silent: true });
          }
        } catch (e) {
          console.error("[BibleSearchSpotlight] Erro ao carregar versões:", e);
        }
      }

      if (verses) {
        if (verse && verses[verse]) {
          // Versículo específico
          results.value = [
            {
              id_bible_book: book.id_bible_book,
              id_bible_version: versionId,
              book: book.name,
              chapter,
              verse,
              reference: `${book.name} ${chapter}:${verse}`,
              text: verses[verse],
            },
          ];
          return;
        } else if (!verse) {
          // Mostrar o primeiro versículo do capítulo se não houver versículo específico
          results.value = [
            {
              id_bible_book: book.id_bible_book,
              id_bible_version: versionId,
              book: book.name,
              chapter,
              verse: 1,
              reference: `${book.name} ${chapter}`,
              text: verses[1] || "",
            },
          ];
          return;
        }
      }
    }
  }

  // 2. Busca por nome do livro apenas
  const bookOnlySearch = queryNorm.replace(/\s+/g, "");
  const bookOnly = (books.value || []).find((b) => {
    const bName = normalize(b.name).replace(/\s+/g, "");
    const bAbbr = normalize(b.abbreviation).replace(/\s+/g, "");
    return bName === bookOnlySearch || bAbbr === bookOnlySearch;
  });

  if (bookOnly) {
    let versionId = preferredVersionId || 1;
    let bibleFile = `bible_${versionId}_${bookOnly.id_bible_book}_1`;
    let verses = await Database.get(bibleFile, { silent: true });

    if (!verses && versionId != 1) {
      versionId = 1;
      bibleFile = `bible_${versionId}_${bookOnly.id_bible_book}_1`;
      verses = await Database.get(bibleFile, { silent: true });
    }

    if (!verses) {
      try {
        const versions = await Database.get(`${lang}_bible_version`, { silent: true });
        if (versions && versions.length > 0) {
          versionId = versions[0].id_bible_version;
          bibleFile = `bible_${versionId}_${bookOnly.id_bible_book}_1`;
          verses = await Database.get(bibleFile, { silent: true });
        }
      } catch (e) {
        console.error("[BibleSearchSpotlight] Erro ao carregar versões:", e);
      }
    }

    results.value = [
      {
        id_bible_book: bookOnly.id_bible_book,
        id_bible_version: versionId,
        book: bookOnly.name,
        chapter: 1,
        verse: 1,
        reference: `${bookOnly.name} 1`,
        text: verses ? verses[1] : "",
      },
    ];
    return;
  }

  results.value = [];
}

function onEnter() {
  if (results.value.length > 0) {
    selectResult(results.value[0]);
  }
}

async function selectResult(res) {
  if (res && res.text && res.reference) {
    const payload = {
      text: res.text,
      reference: res.reference,
      bookId: res.id_bible_book,
      chapter: res.chapter,
      verses: [res.verse],
      active: true,
    };
    // 1. Garante que a janela de projeção esteja aberta ou em abertura
    await ProjectionWindows.openBibleWindow();

    // 2. Envia o versículo.
    Broadcast.send(BROADCAST_TYPE.BIBLE_VERSE, payload);

    // 3. Torna o módulo bíblia ativo para que a tela mude para ele
    Modules.open("bible");

    // 4. Força a Ribbon a selecionar a aba "Configurar Bíblia" (ctx_bible)
    Broadcast.send(BROADCAST_TYPE.RIBBON_SELECT_PAGE, { pageId: "ctx_bible" });
  }
  emit("select", res);
  model.value = false;
}

function truncate(text, n) {
  if (!text) return "";
  const clean = String(text).replace(/<[^>]+>/g, "");
  return clean.length > n ? clean.slice(0, n).trim() + "…" : clean;
}

watch(model, (val) => {
  if (val) {
    searchQuery.value = "";
    results.value = [];
    loadBooks();
  }
});
</script>

<style scoped>
.search-results {
  overflow-y: auto;
}
</style>
