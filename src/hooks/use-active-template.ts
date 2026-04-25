import { useCallback } from "react";
import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import {
  applyTemplateConfigConstraints,
  applyTemplateFrameConstraints,
} from "@/lib/template-capabilities";
import type { FrameParams, Preset, TemplateConfig } from "@/stores/types";

/**
 * Returns the effective template config + frame params for the current UI state:
 * - When a photo is selected, reads/writes that photo's own config (falling back to
 *   the global template store when the photo has no overrides yet).
 * - When no photo is selected, reads/writes the global template store directly.
 *
 * This lets every photo carry its own visual settings while the template store acts
 * as the default for new or unmodified photos.
 */
export function useActiveTemplate() {
  const selectedId = usePhotoStore((s) => s.selectedId);
  const selectedPhoto = usePhotoStore(
    (s) => s.photos.find((p) => p.id === s.selectedId) ?? null,
  );
  const setPhotoConfig = usePhotoStore((s) => s.setPhotoConfig);
  const setPhotoFrameParams = usePhotoStore((s) => s.setPhotoFrameParams);

  const globalConfig = useTemplateStore((s) => s.config);
  const globalFrameParams = useTemplateStore((s) => s.frameParams);
  const globalSetConfig = useTemplateStore((s) => s.setConfig);
  const globalSetFrameParams = useTemplateStore((s) => s.setFrameParams);
  const globalResetFrameParams = useTemplateStore((s) => s.resetFrameParams);
  const globalApplyPreset = useTemplateStore((s) => s.applyPreset);
  const currentKind = useTemplateStore((s) => s.currentKind);

  const config: TemplateConfig = selectedPhoto?.config ?? globalConfig;
  const frameParams: FrameParams = selectedPhoto?.frameParams ?? globalFrameParams;

  const setConfig = useCallback(
    (partial: Partial<TemplateConfig>) => {
      if (selectedId && selectedPhoto) {
        const current = selectedPhoto.config ?? globalConfig;
        setPhotoConfig(
          selectedId,
          applyTemplateConfigConstraints(currentKind, { ...current, ...partial }),
        );
      } else {
        globalSetConfig(partial);
      }
    },
    [selectedId, selectedPhoto, globalConfig, currentKind, setPhotoConfig, globalSetConfig],
  );

  const setFrameParams = useCallback(
    (partial: Partial<FrameParams>) => {
      if (selectedId && selectedPhoto) {
        const current = selectedPhoto.frameParams ?? globalFrameParams;
        let merged = { ...current, ...partial };
        if (
          current.paddingLocked &&
          (partial.paddingTop !== undefined ||
            partial.paddingRight !== undefined ||
            partial.paddingBottom !== undefined ||
            partial.paddingLeft !== undefined)
        ) {
          const v =
            partial.paddingTop ??
            partial.paddingRight ??
            partial.paddingBottom ??
            partial.paddingLeft ??
            0;
          merged = {
            ...merged,
            paddingTop: v,
            paddingRight: v,
            paddingBottom: v,
            paddingLeft: v,
            ...partial,
          };
        }
        setPhotoFrameParams(selectedId, applyTemplateFrameConstraints(merged));
      } else {
        globalSetFrameParams(partial);
      }
    },
    [selectedId, selectedPhoto, globalFrameParams, setPhotoFrameParams, globalSetFrameParams],
  );

  // Reset: clear this photo's overrides (inherit global again), or reset global to template base.
  const resetFrameParams = useCallback(() => {
    if (selectedId) {
      setPhotoFrameParams(selectedId, null);
    } else {
      globalResetFrameParams();
    }
  }, [selectedId, setPhotoFrameParams, globalResetFrameParams]);

  // Apply preset: to this photo if selected, else globally.
  const applyPreset = useCallback(
    (preset: Pick<Preset, "kind" | "frameParams" | "config">) => {
      if (selectedId && selectedPhoto) {
        setPhotoConfig(
          selectedId,
          applyTemplateConfigConstraints(preset.kind, { ...preset.config }),
        );
        setPhotoFrameParams(
          selectedId,
          applyTemplateFrameConstraints({ ...preset.frameParams }),
        );
      } else {
        globalApplyPreset(preset);
      }
    },
    [selectedId, selectedPhoto, setPhotoConfig, setPhotoFrameParams, globalApplyPreset],
  );

  return {
    config,
    frameParams,
    setConfig,
    setFrameParams,
    resetFrameParams,
    currentKind,
    applyPreset,
  };
}
