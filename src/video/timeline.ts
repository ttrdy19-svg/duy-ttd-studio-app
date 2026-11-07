export type Transition = "fade" | "cut";
export type Framing = "cover" | "contain";
export interface Scene {
  id: string;
  name: string;
  url: string;
  file: File;
  seconds: number;
}
export interface VideoResult {
  url: string;
  name: string;
  size: number;
  duration: number;
  sourceName: string;
  exportId?: string;
  savedPath?: string;
}
export interface Frame {
  current: number;
  next: number;
  blend: number;
}

export const MAX_DURATION = 600;
export const MAX_SCENES = 20;
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

// The last scene absorbs rounding so the music and timeline have the same length.
export function distributeTime(count: number, duration: number): number[] {
  if (!count || !Number.isFinite(duration) || duration <= 0) return [];
  const each = Math.floor((duration / count) * 100) / 100;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? duration - each * (count - 1) : each,
  );
}

export function timelineError(
  seconds: number[],
  duration: number | null,
): string | null {
  if (!duration || !Number.isFinite(duration))
    return "Chọn bản nhạc có thời lượng đọc được trước khi xuất video.";
  if (duration > MAX_DURATION)
    return "Bản xuất trong trình duyệt hiện hỗ trợ nhạc tối đa 10 phút.";
  if (!seconds.length) return "Thêm ít nhất một ảnh bối cảnh.";
  if (seconds.some((s) => !Number.isFinite(s) || s < 0.1))
    return "Mỗi cảnh cần thời lượng ít nhất 0,1 giây.";
  if (Math.abs(seconds.reduce((a, b) => a + b, 0) - duration) > 0.15)
    return "Tổng thời lượng cảnh chưa khớp bản nhạc. Bấm “Chia đều theo nhạc” hoặc chỉnh lại thời lượng.";
  return null;
}

export function frameAt(
  seconds: number[],
  time: number,
  transition: Transition,
): Frame {
  let start = 0;
  for (let i = 0; i < seconds.length; i++) {
    const end = start + seconds[i];
    if (time < end || i === seconds.length - 1) {
      const next = Math.min(i + 1, seconds.length - 1);
      const fade = Math.min(
        0.6,
        seconds[i] / 2,
        (seconds[next] ?? seconds[i]) / 2,
      );
      return {
        current: i,
        next,
        blend:
          transition === "fade" && next !== i
            ? Math.min(1, Math.max(0, (time - (end - fade)) / fade))
            : 0,
      };
    }
    start = end;
  }
  return { current: 0, next: 0, blend: 0 };
}

export function imageRect(
  sw: number,
  sh: number,
  width: number,
  height: number,
  framing: Framing,
) {
  const scale =
    framing === "cover"
      ? Math.max(width / sw, height / sh)
      : Math.min(width / sw, height / sh);
  return {
    x: (width - sw * scale) / 2,
    y: (height - sh * scale) / 2,
    width: sw * scale,
    height: sh * scale,
  };
}

const transitionLayers = new WeakMap<
  CanvasRenderingContext2D,
  HTMLCanvasElement
>();

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  images: (ImageBitmap | HTMLImageElement)[],
  seconds: number[],
  time: number,
  transition: Transition,
  framing: Framing,
) {
  const { width, height } = ctx.canvas;
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#0b1720";
  ctx.fillRect(0, 0, width, height);
  if (!images.length) return;
  const { current, next, blend } = frameAt(seconds, time, transition);
  const draw = (
    target: CanvasRenderingContext2D,
    index: number,
    opacity: number,
  ) => {
    const image = images[index];
    if (!image) return;
    const sw = "naturalWidth" in image ? image.naturalWidth : image.width;
    const sh = "naturalHeight" in image ? image.naturalHeight : image.height;
    if (!sw || !sh) return;
    const rect = imageRect(sw, sh, width, height, framing);
    target.globalAlpha = opacity;
    target.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  };
  draw(ctx, current, 1);
  if (blend > 0) {
    // Composite the next image and its letterbox as one layer to avoid double-darkening.
    let layer = transitionLayers.get(ctx);
    if (!layer) {
      layer = document.createElement("canvas");
      transitionLayers.set(ctx, layer);
    }
    if (layer.width !== width || layer.height !== height) {
      layer.width = width;
      layer.height = height;
    }
    const layerContext = layer.getContext("2d");
    if (layerContext) {
      layerContext.globalAlpha = 1;
      layerContext.fillStyle = "#0b1720";
      layerContext.fillRect(0, 0, width, height);
      draw(layerContext, next, 1);
      ctx.globalAlpha = blend;
      ctx.drawImage(layer, 0, 0);
    }
  }
  ctx.globalAlpha = 1;
}
