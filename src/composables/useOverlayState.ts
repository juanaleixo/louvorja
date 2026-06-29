import { ref, computed, onMounted, reactive, type Ref, type ComputedRef } from "vue";
import { useBroadcastListener } from "@/composables/useBroadcastListener";
import $broadcast from "@/helpers/Broadcast";
import { BROADCAST_TYPE } from "@/helpers/BroadcastTypes";
import $userdata from "@/helpers/UserData";
import { getImage, resolveImageUrl } from "@/helpers/OverlayImages";
import {
  OVERLAY_CONFIG_DEFAULTS,
  buildAnchorStyle,
  type OverlaySlot,
  type OverlayConfig,
} from "@/types/Overlay";

interface OverlayStateReturn {
  globalEnabled: Ref<boolean>;
  slots: Ref<OverlaySlot[]>;
  activeSlots: ComputedRef<OverlaySlot[]>;
  moduleValues: Record<string, string>;
  slotImage: (_slot: OverlaySlot) => Promise<string>;
  slotStyle: (_slot: OverlaySlot) => Record<string, string>;
  imageStyle: (_slot: OverlaySlot) => Record<string, string>;
  textStyle: (_slot: OverlaySlot) => Record<string, string>;
  animationClass: (_slot: OverlaySlot) => string;
  animationExitClass: (_slot: OverlaySlot) => string;
}

export function useOverlayState(): OverlayStateReturn {
  const globalEnabled = ref(false);
  const slots = ref<OverlaySlot[]>([]);
  const moduleValues = reactive<Record<string, string>>({});

  function refresh() {
    const data = $userdata.get<OverlayConfig>("modules.overlay", OVERLAY_CONFIG_DEFAULTS) ?? OVERLAY_CONFIG_DEFAULTS;
    globalEnabled.value = !!data.global_enabled;
    slots.value = data.slots ?? [];
  }

  refresh();

  useBroadcastListener(BROADCAST_TYPE.USERDATA_PATCH, (payload) => {
    const p = payload as { path?: string; value?: unknown };
    if (p.path && p.path.startsWith("modules.overlay")) {
      refresh();
    }
  });

  useBroadcastListener(BROADCAST_TYPE.MODULE_PROJECTION_VALUE, (payload) => {
    const p = payload as { module?: string; text?: string; reference?: string };
    if (p.module) {
      moduleValues[p.module] = p.text || p.reference || "";
    }
  });

  useBroadcastListener(BROADCAST_TYPE.REQUEST_OVERLAY_STATE, () => {
    refresh();
  });

  onMounted(() => {
    $broadcast.send(BROADCAST_TYPE.REQUEST_OVERLAY_STATE);
  });

  const activeSlots = computed(() => {
    if (!globalEnabled.value) return [];
    return slots.value
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order);
  });

  const _imageCache = new Map<string, string>();

  async function slotImage(slot: OverlaySlot): Promise<string> {
    if (!slot.file_id) return slot.content || "";
    const cached = _imageCache.get(slot.id);
    if (cached) return cached;
    const record = await getImage(slot.file_id);
    const url = resolveImageUrl(record);
    _imageCache.set(slot.id, url);
    return url;
  }

  function slotStyle(slot: OverlaySlot): Record<string, string> {
    const s = slot.style;

    const dur = `${(s.animation_duration || 300) / 1000}s`;
    const out: Record<string, string> = {
      position: "absolute",
      ...buildAnchorStyle(slot.position),
      pointerEvents: "none",
      zIndex: String(slot.order + 1),
      opacity: String((s.opacity ?? 100) / 100),
      transition: `opacity ${dur} ease, transform ${dur} ease`,
      padding: s.padding || "8px 16px",
      animationDuration: dur,
      borderRadius: s.border_radius || "4px",
      border: s.border || "",
      width: s.width || "auto",
      height: s.height || "auto",
    };

    if (s.background && s.background !== "transparent") {
      out.background = s.background;
      if (s.background_opacity !== undefined && s.background_opacity < 100) {
        out.background = undefined!;
        out.backgroundColor = s.background;
        out.opacity = String(((s.opacity ?? 100) / 100) * ((s.background_opacity ?? 100) / 100));
      }
    }

    if (s.box_shadow) {
      out.boxShadow = "0 4px 16px rgba(0,0,0,0.45)";
    }

    return out;
  }

  function imageStyle(slot: OverlaySlot): Record<string, string> {
    const s = slot.style;
    return {
      width: s.width || "auto",
      height: s.height || "auto",
      maxWidth: s.max_width || "40vw",
      maxHeight: s.max_height || "30vh",
      objectFit: s.object_fit || "contain",
      display: "block",
    };
  }

  function textStyle(slot: OverlaySlot): Record<string, string> {
    const s = slot.style;
    return {
      fontFamily: s.font || "Arial, sans-serif",
      fontSize: `clamp(14px, ${s.font_size || 5}vh, 80px)`,
      color: s.color || "#FFFFFF",
      textAlign: s.text_align || "center",
      lineHeight: "1.3",
      fontWeight: "600",
      letterSpacing: "0.02em",
      ...(s.text_shadow ? { textShadow: "0 2px 8px rgba(0,0,0,0.8)" } : {}),
    };
  }

  const ANIM_CLASSES: Record<string, string> = {
    fade: "overlay-anim--fade",
    "slide-up": "overlay-anim--slide-up",
    "slide-down": "overlay-anim--slide-down",
    "slide-left": "overlay-anim--slide-left",
    "slide-right": "overlay-anim--slide-right",
    "zoom-in": "overlay-anim--zoom-in",
    "zoom-out": "overlay-anim--zoom-out",
    bounce: "overlay-anim--bounce",
    flip: "overlay-anim--flip",
    none: "",
  };

  function animationClass(slot: OverlaySlot): string {
    return ANIM_CLASSES[slot.style.animation] || "";
  }

  function animationExitClass(slot: OverlaySlot): string {
    return ANIM_CLASSES[slot.style.animation_exit]
      ? ANIM_CLASSES[slot.style.animation_exit] + "--exit"
      : "";
  }

  return {
    globalEnabled,
    slots,
    activeSlots,
    moduleValues,
    slotImage,
    slotStyle,
    imageStyle,
    textStyle,
    animationClass,
    animationExitClass,
  };
}
