import type { Capability, ProductionBrief } from './contracts';
export interface ProductionStep { id: string; worker: string; type: string; dependsOn: string[]; capability?: Capability; status: 'ready' | 'waiting-connection' | 'waiting-input' }
export interface PlanOptions { audioAssetId: string; brief: ProductionBrief; images: boolean; video: boolean; subtitles: boolean; waveform: boolean; exportVideo: boolean; releaseDraft: boolean }
export function planProduction(options: PlanOptions): ProductionStep[] {
  if (!options.audioAssetId?.trim()) throw new Error('Cần nhập bản nhạc trước khi giao việc.');
  const steps: ProductionStep[] = [{ id: 'analyze', type: 'audio.analyze', worker: 'tu-am', dependsOn: [], status: 'ready' }];
  if (options.images) steps.push({ id: 'images', type: 'images.generate-two', worker: 'hoa-an', dependsOn: [], capability: 'image', status: 'waiting-connection' },
    { id: 'choose-image', type: 'images.user-selection', worker: 'minh-nhi', dependsOn: ['images'], status: 'waiting-input' });
  if (options.video) steps.push({ id: 'loop', type: 'video.generate-loop', worker: 'van-trinh', dependsOn: options.images ? ['choose-image'] : [], capability: 'video', status: options.images ? 'waiting-connection' : 'waiting-input' });
  if (options.subtitles) steps.push({ id: 'subtitles', type: 'subtitles.prepare', worker: 'tu-am', dependsOn: ['analyze'], status: 'waiting-connection' });
  if (options.waveform) steps.push({ id: 'waveform', type: 'waveform.prepare', worker: 'tu-am', dependsOn: ['analyze'], status: 'ready' });
  if (options.exportVideo) steps.push({ id: 'export', type: 'video.render', worker: 'thanh-phong',
    dependsOn: ['analyze', ...(options.video ? ['loop'] : options.images ? ['choose-image'] : []), ...(options.subtitles ? ['subtitles'] : []), ...(options.waveform ? ['waveform'] : [])], status: 'ready' });
  if (options.releaseDraft) steps.push({ id: 'release', type: 'release.prepare', worker: 'nhu-y', dependsOn: options.exportVideo ? ['export'] : ['analyze'], status: 'ready' });
  return steps;
}
export function imagePrompts(brief: ProductionBrief): [string, string] {
  if (![brief.theme, brief.style, brief.lyrics].some(value => value.trim())) throw new Error('Cần chủ đề, phong cách hoặc lời để viết yêu cầu tạo ảnh.');
  const input = JSON.stringify({ theme: brief.theme, style: brief.style, lyrics: brief.lyrics });
  return [`Tạo ảnh đại diện cho video âm nhạc từ dữ liệu sau. Không chèn chữ. Giữ khoảng trống cho phụ đề. Phương án 1: bố cục rộng, cảnh chính rõ.\n${input}`,
    `Tạo phương án ảnh đại diện thứ hai cho cùng bản nhạc. Không chèn chữ. Giữ khoảng trống cho phụ đề. Thay góc nhìn và bố cục nhưng giữ chủ đề, phong cách người dùng.\n${input}`];
}
export function loopPrompt(brief: ProductionBrief) {
  return `Dùng cùng ảnh đã chọn cho khung đầu và khung cuối. Camera cố định, chuyển động nhẹ và tuần hoàn, không chữ, không âm thanh. Tránh cắt cảnh, đổi nhân vật và thay bố cục. Chủ đề và phong cách: ${JSON.stringify({ theme: brief.theme, style: brief.style })}`;
}
