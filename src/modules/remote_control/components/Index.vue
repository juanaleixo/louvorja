<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest">
    <v-card flat>
      <v-card-text class="px-0">
        <small>{{ t("info_module") }}</small>
      </v-card-text>
      <v-card-text class="px-0">
        <v-text-field
          v-model="url"
          :disabled="loading || is_connected"
          :label="t('labels.ip')"
          density="compact"
          variant="outlined"
          prepend-icon="mdi-ip-network"
          :hint="t('messages.get_ip')"
          persistent-hint
          :loading="loading ? 'warning' : false"
        />
        <v-text-field
          v-model="token"
          :disabled="loading || is_connected"
          :label="t('labels.token')"
          class="mt-3"
          density="compact"
          variant="outlined"
          prepend-icon="mdi-code-braces"
          persistent-hint
          :loading="loading ? 'warning' : false"
        />
      </v-card-text>
      <v-card-actions class="px-0">
        <v-spacer></v-spacer>
        <v-btn color="info" :text="t('labels.test_connection')" @click="test" />
        <v-btn v-if="!is_connected" color="success" text="Conectar" @click="connect" />
        <v-btn v-else color="error" :text="t('labels.disconnect')" @click="disonnect" />
      </v-card-actions>
    </v-card>
  </ModuleContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { module as manifest } from "../manifest";
import ModuleContainer from "@/components/ModuleContainer.vue";
import $userdata from "@/helpers/UserData";
import $alert from "@/helpers/Alert";

interface PingResponse {
  status?: string;
  app?: string;
  code?: string;
}

interface TestResult {
  message: string;
  error?: string | number;
  status: boolean;
  data?: PingResponse;
  app?: string;
  invalid_url?: string;
}

const moduleContainer = ref<{ t(key: string): string } | null>(null);
const t = (key: string): string => moduleContainer.value?.t(key) || key;

const url = ref<string>("");
const token = ref<string>("");
const loading = ref<boolean>(false);

const is_connected = computed<boolean>(() => {
  return !!$userdata.get("remote.is_connected");
});

function getUrl(input: string): string {
  let u = input.trim().replace(/\s+/g, "").replace(/\\/g, "/").replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(u)) {
    u = "http://" + u;
  }

  if (u == "http://") {
    u = "";
  }

  return u;
}

async function testUrl(url: string): Promise<TestResult> {
  if (!url || url == "http://" || url == "https://") {
    return {
      message: "modules.remote_control.messages.url_not_provided",
      error: "",
      status: false,
    };
  }

  try {
    const response = await fetch(url + "/api/ping?token=" + token.value, {
      method: "GET",
      mode: "cors",
    });

    if (!response.ok) {
      return {
        message: "modules.remote_control.messages.url_not_provided",
        error: response.status,
        status: false,
      };
    }

    const data: PingResponse = await response.json();

    if (data.status != "ok") {
      return {
        message:
          data.code == "INVALID_TOKEN"
            ? "modules.remote_control.messages.invalid_token"
            : "modules.remote_control.messages.error",
        error: data.code,
        status: false,
      };
    }
    return {
      message: "modules.remote_control.messages.success",
      data: data,
      status: true,
    };
  } catch (error) {
    return {
      message: "modules.remote_control.messages.failed_to_connect",
      error: error instanceof Error ? error.message : String(error),
      status: false,
    };
  }
}

async function test(): Promise<boolean> {
  url.value = getUrl(url.value);

  loading.value = true;
  const ret = await testUrl(url.value);
  loading.value = false;

  if (!ret.status) {
    $alert.error({
      text: ret.message,
      error: ret.error,
    });
    return false;
  }

  // @ts-ignore — preserva lógica original de comparação
  if (!ret.status == "ok" && !ret.app == "LouvorJA") {
    $alert.error({
      text: ret.invalid_url,
    });
    return false;
  }

  $alert.info({
    text: "modules.remote_control.messages.success",
  });

  return true;
}

async function connect(): Promise<void> {
  $userdata.set("remote.url", getUrl(url.value));
  $userdata.set("remote.token", token.value);

  if (!(await test())) {
    return;
  }

  $userdata.set("remote.is_connected", true);
}

function disonnect(): void {
  $userdata.set("remote.is_connected", false);
}

onMounted(() => {
  url.value = $userdata.get("remote.url") as string;
  token.value = $userdata.get("remote.token") as string;
});
</script>
