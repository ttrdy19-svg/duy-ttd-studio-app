import { wavePaths } from '../../desktop/production/wave-geometry.mjs';
export { defaultWaveStyle, validateWaveStyle, sampleAudio } from '../../desktop/production/wave-geometry.mjs';
export interface AudioFrame { peak: number; rms: number; bands: number[] }
export interface AudioAnalysis { schemaVersion: 1; duration: number; fps: number; frames: AudioFrame[] }
export interface WaveStyle {
  mode: 'bars' | 'line' | 'circle'; color: string; opacity: number;
  x: number; y: number; width: number; height: number; thickness: number; sensitivity: number;
}
// Shared polygons with the native exporter: styling and geometry stay identical.
export function drawWaveform(ctx: CanvasRenderingContext2D, analysis: AudioAnalysis, seconds: number, style: WaveStyle, width = ctx.canvas.width, height = ctx.canvas.height) {
  const paths = wavePaths(analysis, seconds, style, width, height);
  ctx.save(); ctx.globalAlpha = style.opacity; ctx.fillStyle = style.color;
  for (const points of paths) {
    ctx.beginPath(); points.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
