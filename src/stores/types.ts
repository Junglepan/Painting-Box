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
  showDateTime: boolean;
  showGps: boolean;
};

export type FrameBackground = "white" | "black" | "blur" | "custom";
export type LogoColor = "original" | "black" | "white";
export type TextAlign = "left" | "center" | "right";
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
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  letterSpacing: number;
  lineHeight: number;
  textColor: string;
  textAlign: TextAlign;

  // Logo
  logoSize: number;
  logoColor: LogoColor;
  logoGap: number;

  // Divider
  dividerShow: boolean;
  dividerColor: string;

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
