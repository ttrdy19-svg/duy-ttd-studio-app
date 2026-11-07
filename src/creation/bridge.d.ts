import type { CreationBridge } from './types';
declare global { interface Window { manorCreation?: CreationBridge } }
declare global { interface Window { manorFlow?: { generateLoop?(request: { image: Uint8Array; name: string; prompt: string }): Promise<{ data: Uint8Array; projectUrl?: string }> } } }
