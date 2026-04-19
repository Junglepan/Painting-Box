export type ExifData = {
  camera: { make: string; model: string };
  lens: string;
  iso: number;
  aperture: number;
  shutterSpeed: string;
  focalLength: number;
  takenAt: string;
  gps?: { lat: number; lng: number };
};

export const EMPTY_EXIF: ExifData = {
  camera: { make: "", model: "" },
  lens: "",
  iso: 0,
  aperture: 0,
  shutterSpeed: "",
  focalLength: 0,
  takenAt: "",
};

export type PhotoExifStatus = "idle" | "loading" | "ready" | "error";
export type PhotoPreviewStatus = "idle" | "loading" | "ready" | "error";

export type Photo = {
  id: string;
  path: string;
  thumbnailDataUrl?: string;
  width?: number;
  height?: number;
  previewStatus: PhotoPreviewStatus;
  previewError?: string;
  exif?: ExifData;
  exifStatus: PhotoExifStatus;
  exifError?: string;
};

export type ImportedPhoto = {
  id: string;
  path: string;
};

export type PhotoPreviewData = {
  thumbnailDataUrl: string;
  width: number;
  height: number;
};

export type PhotoImportError = {
  path: string;
  message: string;
};

export type LoadPhotosResponse = {
  photos: ImportedPhoto[];
  errors: PhotoImportError[];
};

export type TemplateKind =
  | "classic-bottom"
  | "polaroid"
  | "minimal-corner"
  | "magazine"
  | "film-strip"
  | "full-frame"
  | "leica"
  | "poster"
  | "square-social"
  | "xpan"
  | "minimal-blank"
  | "custom";

export type TemplateConfig = {
  showLogo: boolean;
  showCamera: boolean;
  showLens: boolean;
  showParams: boolean;
};

export type CanvasRatio =
  | "auto"
  | "1:1"
  | "4:5"
  | "3:2"
  | "4:3"
  | "5:4"
  | "16:10"
  | "16:9"
  | "20:9"
  | "2.35:1"
  | "2.39:1"
  | "21:9";
export type FrameBackground = "white" | "black" | "blur" | "custom";
export type LogoColor = "original" | "black" | "white";
export type LogoVariant = string;
export type WatermarkFontFamily = "pingfang-sc" | "arial";
export type InfoPosition =
  | "bottom"
  | "top"
  | "bottom-left"
  | "bottom-right";

export type FrameParams = {
  // Layout
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingLocked: boolean;
  outerRadius: number;
  innerRadius: number;
  infoBarHeight: number;
  mainImageWidthRatio: number;
  minTopBottomMargin: number;
  textMargin: number;
  watermarkTopPadding: number;
  watermarkBottomPadding: number;

  // Background
  background: FrameBackground;
  bgColor: string;
  blurRadius: number;

  // Shadow
  shadow: boolean;
  shadowBlur: number;
  shadowOffsetY: number;
  shadowOpacity: number;

  // Photo
  photoScale: number;
  photoBorder: number;

  // Typography
  fontFamily: WatermarkFontFamily;
  fontSize: number;
  textColor: string;

  // Logo
  logoKey: string;
  logoVariant: LogoVariant;
  logoSize: number;
  logoColor: LogoColor;
  logoGap: number;

  // Divider
  dividerShow: boolean;
  dividerColor: string;

  // Canvas ratio
  canvasRatio: CanvasRatio;

  // Info position
  infoPosition: InfoPosition;
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
  kind: TemplateKind;
  frameParams: FrameParams;
  config: TemplateConfig;
  createdAt: string;
};

export const PRESET_NAME_MAX = 12;

export type ExportJob = {
  id: string;
  photoId: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  error?: string;
};

export type ExportSinglePhotoRequest = {
  photoPath: string;
  outputPath: string;
  frameParams: FrameParams;
  exif?: ExifData;
  config: TemplateConfig;
  exportQuality: number;
};

export type ExportSinglePhotoResult = {
  outputPath: string;
};
