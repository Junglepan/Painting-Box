export type ExifData = {
  camera: { make: string; model: string };
  lens: string;
  iso: number;
  aperture: number;
  shutterSpeed: string;
  focalLength: number;
  takenAt: string;
  gps?: { lat: number; lng: number };
  raw: Record<string, unknown>;
};

export type Photo = {
  id: string;
  path: string;
  thumbnailDataUrl: string;
  width: number;
  height: number;
  exif: ExifData;
};

export type TemplateKind =
  | "classic-bottom"
  | "polaroid"
  | "minimal-corner"
  | "magazine"
  | "custom";

export type TemplateConfig = {
  showLogo: boolean;
  showCamera: boolean;
  showLens: boolean;
  showParams: boolean;
  showDateTime: boolean;
  showGps: boolean;
};

export type WatermarkTemplate = {
  id: string;
  name: string;
  kind: TemplateKind;
  config: TemplateConfig;
};

export type Preset = {
  id: string;
  name: string;
  templateId: string;
  overrides: Partial<TemplateConfig>;
  fieldVisibility: Partial<Record<keyof ExifData, boolean>>;
  fieldOverrides: Partial<Record<keyof ExifData, string>>;
  createdAt: string;
};

export type ExportJob = {
  id: string;
  photoId: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  error?: string;
};
