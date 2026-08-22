/** @category deve-virar-composable — Usa AppData (Pinia) e watch() Vue; requer renderer. */
import { watch } from "vue";
import $dev from "@/helpers/Dev";
import $appdata from "@/helpers/AppData";
import { useAppStore } from "@/stores/appStore";

export default {
  show(data, callback = function () {}) {
    data = this.getData(data);

    $dev.write("dialog", data, typeof data, Array.isArray(data));

    $appdata.set("alert.value", "");
    $appdata.set("alert.show", true);
    $appdata.set("alert.title", data.title || null);
    $appdata.set("alert.text", data.text || null);
    $appdata.set("alert.error", data.error || null);
    $appdata.set("alert.color", data.color || "");
    $appdata.set(
      "alert.translate",
      data.translate == null || data.translate == undefined ? true : data.translate
    );
    $appdata.set(
      "alert.buttons",
      data.buttons || [{ text: "alert.close", color: "error", value: "close" }]
    );

    // unwatch() é chamado quando show → false, devolvendo o valor ao callback.
    const store = useAppStore();
    const unwatch = watch(
      () => store.alert.show,
      (show) => {
        if (!show) {
          unwatch();
          callback($appdata.get("alert.value"));
        }
      }
    );
  },

  yesno(data, callback = function () {}) {
    data = this.getData(data);

    this.show(
      {
        ...data,
        buttons: [
          { text: "alert.no", color: "error", value: "no" },
          { text: "alert.yes", color: "info", value: "yes" },
        ],
      },
      (resp, ret) => {
        callback(resp, ret);
      }
    );
  },

  /**
   * Prompt com campo de texto. Substitui window.prompt (não suportado no
   * Electron). O callback recebe a string digitada ou null se cancelado.
   *
   * @param {object|string} data         { title, text, input_default, input_placeholder }
   * @param {function} callback          (value|null) => void
   */
  prompt(data, callback = function () {}) {
    data = this.getData(data);

    $appdata.set("alert.prompt", true);
    $appdata.set("alert.input_value", data.input_default || "");
    $appdata.set("alert.input_default", data.input_default || "");
    $appdata.set("alert.input_placeholder", data.input_placeholder || "");

    this.show(
      {
        ...data,
        buttons: [
          { text: "alert.cancel", color: "error", value: "cancel" },
          { text: "alert.ok", color: "info", value: "ok" },
        ],
      },
      (resp, ret) => {
        $appdata.set("alert.prompt", false);
        $appdata.set("alert.input_value", "");
        $appdata.set("alert.input_default", "");
        $appdata.set("alert.input_placeholder", "");
        callback(resp, ret);
      }
    );
  },

  info(data, callback = function () {}) {
    data = this.getData(data);

    this.show(
      {
        ...data,
        buttons: [{ text: "alert.close", color: "error", value: "close" }],
      },
      (resp, ret) => {
        callback(resp, ret);
      }
    );
  },

  error(data, callback = function () {}) {
    data = this.getData(data);

    this.show(
      {
        ...data,
        buttons: [{ text: "alert.close", color: "error", value: "close" }],
      },
      (resp, ret) => {
        callback(resp, ret);
      }
    );
  },

  getData(data) {
    if (typeof data == "string") {
      data = { text: data };
    } else if (Array.isArray(data)) {
      data = {
        title: data[0] ?? null,
        text: data[1] ?? null,
      };
    }

    return data;
  },
};
