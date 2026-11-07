export interface StylePreset { id: string; name: string; description: string; worker: string }
export type Branch = 'image-a' | 'image-b' | 'captions' | `flow-${1|2|3|4|5|6|7|8}`;
export interface CaptionCue { start: number; end: number; text: string }
export interface CreationPart { status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted' | 'awaiting-input'; url?: string; model?: string; error?: string; stage?: string; cues?: CaptionCue[] }
export interface CreationJob {
  id: string; presetId: string; createdAt: string; updatedAt: string;
  brief: { theme: string; style: string; lyrics: string };
  audio: { name: string; size: number; duration: number; extension: string; url: string };
  branches: Record<string, CreationPart>;
}
export interface CreationDraft {
  id: string; audio: CreationJob['audio']; image: { url: string; name: string };
  cues: CaptionCue[];
}
export interface AudioDelivery {
  id: string;
  file: File;
  meta?: {title?: string; lyrics?: string; genre?: string; singer?: string;theme?:string};
}
export interface CreationBridge {
  importPlus?(id: string): Promise<CreationJob | null>;
  status(): Promise<{ configured: boolean; encryptionAvailable: boolean; presets: StylePreset[]; imageModel: string; captionModel: string; imageProvider?: 'flow'|'openai' }>;
  saveKey(key: string): Promise<{ configured: boolean }>;
  removeKey(): Promise<{ configured: boolean }>;
  checkKey(): Promise<{ authenticated: boolean; imageModelVisible: boolean }>;
  list(): Promise<CreationJob[]>;
  start(request: { presetId: string; brief: CreationJob['brief']; audio: Uint8Array; name: string }): Promise<CreationJob>;
  retry(id: string, branch: Branch): Promise<CreationJob>;
  resume?(id: string): Promise<CreationJob>;
  cancel(id: string): Promise<void>;
  save(id: string, branch: Branch): Promise<string | null>;
  onChange(callback: (job: CreationJob) => void): () => void;
}
