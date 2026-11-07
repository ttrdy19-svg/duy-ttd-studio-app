interface DesktopRenderRequest {
  id: string;
  audio: Uint8Array;
  scenes: { data: Uint8Array; seconds: number }[];
  duration: number;
  transition: 'fade' | 'cut';
  framing: 'cover' | 'contain';
  resolution: '720' | '1080' | '2160';
  portrait: boolean;
  originalAudio: boolean;
  loopVideo?: Uint8Array;
  cutFrames?: number | null;
  subtitleCues?: { start: number; end: number; text: string }[];
  subtitleStyle?:import('./video/visuals').CaptionStyle;
  waveform?:import('./video/visuals').WaveSettings;
}
interface Window {
  manorDesktop?: {
    library: { document(): Promise<string>; request(operation: string, args: unknown): Promise<unknown> };
    render(request: DesktopRenderRequest): Promise<{
      url: string; path: string; size: number; exportId: string; duration: number; mimeType: string; extension: string;
      encoder: string; renderSeconds: number;
      cutFrames?: number;
    }>;
    cancel(id: string): Promise<void>;
    save(id: string, name: string): Promise<string | null>;
    onProgress(callback: (progress: { id: string; seconds: number }) => void): () => void;
    getSubtitleStatus(): Promise<{ configured: boolean; model: string }>;
    saveGeminiApiKey(key: string): Promise<{ configured: boolean }>;
    removeGeminiApiKey(): Promise<{ configured: boolean }>;
    transcribeSubtitles(request: {
      id: string;
      audio: Uint8Array;
      mimeType: 'audio/mpeg' | 'audio/wav';
      duration: number;
    }): Promise<{
      cues: { start: number; end: number; text: string }[];
      model: string;
      cleanupWarning: string | null;
    }>;
    cancelTranscription(id: string): Promise<void>;
    gchat: {
      getState(): Promise<GChatState>;
      saveApiProvider(provider: { id?: string; label: string; baseURL: string; model: string; apiKey: string }): Promise<GChatProvider>;
      saveCliProvider(provider: { id?: string; label: string; cli: 'codex' | 'gemini' | 'copilot' }): Promise<GChatProvider>;
      startCliLogin(cli: 'codex' | 'gemini'): Promise<{ started: boolean }>;
      removeProvider(id: string): Promise<GChatState>;
      discoverModels(request: { baseURL: string; apiKey: string; providerId?: string }): Promise<{ id: string }[]>;
      selectWorkspace(): Promise<string | null>;
      send(request: {
        roomId: string;
        providerIds: string[];
        mode: 'free' | 'task';
        leadProviderId?: string;
        text: string;
      }): Promise<GChatRoom>;
      cancel(roomId: string): Promise<void>;
      onAgentProgress(callback: (progress: GChatAgentProgress) => void): () => void;
    };
  };
}

interface GChatAgentProgress {
  roomId: string;
  providerId: string;
  providerName: string;
  status: 'waiting' | 'running' | 'done' | 'error' | 'cancelled';
  content?: string;
  model?: string;
  error?: string;
}

interface GChatProvider {
  id: string;
  label: string;
  type: 'api' | 'cli';
  baseURL?: string;
  model?: string;
  cli?: 'codex' | 'gemini' | 'copilot';
  configured: boolean;
  status?: 'ready' | 'limited' | 'error';
  lastCheckedAt?: number;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; [key: string]: number | undefined };
}

interface GChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  createdAt?: number;
  model?: string;
  providerId?: string;
  providerName?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; [key: string]: number | undefined };
}

interface GChatRoom {
  id: string;
  title: string;
  providerId?: string;
  messages: GChatMessage[];
  updatedAt: number;
}

interface GChatState {
  providers: GChatProvider[];
  rooms: GChatRoom[];
  workspace: string;
  encryptionAvailable: boolean;
}
