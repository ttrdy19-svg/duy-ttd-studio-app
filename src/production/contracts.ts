import type { WaveStyle } from './waveform';
export interface ProductionBrief { theme: string; style: string; lyrics: string }
export type Capability = 'image' | 'video' | 'chat' | 'transcription' | 'alignment' | 'youtube';
export interface ProviderProfile {
  id: string; label: string; provider: string; capabilities: Capability[];
  connectionState: 'not-connected' | 'ready' | 'needs-login'; enabled: boolean;
  maxConcurrent: number; lastUsed?: number; quotaLimit?: number; quotaUsed?: number; quotaDay?: string; cooldownUntil?: number;
}
export interface AssetReference { id: string; kind: 'audio' | 'image' | 'video' | 'analysis' | 'document'; name: string; relativePath: string; fingerprint: string; size: number }
export interface RenderSpecification {
  audioFile: string; outputDirectory: string;
  background: { kind: 'image' | 'video' | 'color'; file?: string; color?: string; cutFrames?: number };
  width: number; height: number; fps: 30; originalAudio: boolean;
  waveform?: { enabled: boolean; style: WaveStyle };
}
export const moduleAvailability = {
  audioAnalysis: 'local', waveformPreview: 'local', waveformExport: 'local', projects: 'local', jobQueue: 'local', profileRotation: 'local', releaseDraft: 'local',
  imageGeneration: 'requires-provider', flowVideo: 'requires-browser-connection', conversation: 'requires-provider', youtubeUpload: 'requires-oauth',
  subtitleIntegration: 'awaiting-subtitle-module', manorIntegration: 'deferred',
} as const;
