<template>
  <div class="bgm-ribbon-settings">
    <div class="bgm-ribbon-settings-inner">
      <div class="bgm-ribbon-sliders">
        <div class="bgm-ribbon-row">
          <label class="bgm-ribbon-label">
            {{ t(LANG_PATH + ".fade_in") }}
          </label>
          <v-slider
            v-model="fadeIn"
            :min="0"
            :max="10000"
            :step="1000"
            density="compact"
            hide-details
            class="bgm-ribbon-slider"
            @update:model-value="save('fadeIn', $event)"
          />
          <span class="bgm-ribbon-value">{{ fadeIn / 1000 }}s</span>
        </div>
        <div class="bgm-ribbon-row">
          <label class="bgm-ribbon-label">
            {{ t(LANG_PATH + ".fade_out") }}
          </label>
          <v-slider
            v-model="fadeOut"
            :min="0"
            :max="10000"
            :step="1000"
            density="compact"
            hide-details
            class="bgm-ribbon-slider"
            @update:model-value="save('fadeOut', $event)"
          />
          <span class="bgm-ribbon-value">{{ fadeOut / 1000 }}s</span>
        </div>
      </div>
      <div class="bgm-ribbon-switches">
        <v-switch
          v-model="autoPause"
          density="compact"
          size="small"
          hide-details
          :true-icon="ICONS.UI.CHECK"
          :false-icon="ICONS.ACTIONS.CLOSE"
          :label="t(LANG_PATH + '.auto_pause')"
          color="primary"
          @update:model-value="save('autoPause', $event)"
        />
        <v-switch
          v-model="repeat_"
          density="compact"
          size="small"
          hide-details
          true-icon="mdi-check"
          false-icon="mdi-close"
          :label="t(LANG_PATH + '.repeat')"
          color="primary"
          @update:model-value="save('repeat', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import $userdata from "@/helpers/UserData";
import { ModulePathEnum } from "@/enums/ModuleEnum";
import { V_COLOR_PRIMARY } from "@/constants/Colors";
import { ICONS } from "@/config/Icons";

const { t } = useI18n();

const LANG_PATH = ModulePathEnum.BACKGROUND_SOUND;

const fadeIn = ref(3000);
const fadeOut = ref(3000);
const autoPause = ref(true);
const repeat_ = ref(false);

function save(key: string, value: unknown): void {
  $userdata.set(`${LANG_PATH}.${key}`, value);
}

onMounted(() => {
  fadeIn.value = $userdata.get<number>(`${LANG_PATH}.fadeIn`, 3000) ?? 3000;
  fadeOut.value = $userdata.get<number>(`${LANG_PATH}.fadeOut`, 3000) ?? 3000;
  autoPause.value = $userdata.get<boolean>(`${LANG_PATH}.autoPause`, true) ?? true;
  repeat_.value = $userdata.get<boolean>(`${LANG_PATH}.repeat`, false) ?? false;
});
</script>

<style scoped>
.bgm-ribbon-settings {
  padding: 4px 8px;
  min-width: 300px;
}
.bgm-ribbon-settings-inner {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.bgm-ribbon-sliders {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 250px;
}
.bgm-ribbon-switches {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 15px;
}
.bgm-ribbon-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bgm-ribbon-label {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;
  min-width: 50px;
}
.bgm-ribbon-value {
  font-size: 11px;
  font-weight: 500;
  min-width: 24px;
  text-align: right;
}
.bgm-ribbon-slider {
  flex: 1;
}
</style>
