import { describe, expect, it } from 'vitest';
import { defaultWaveStyle, sampleAudio, validateWaveStyle } from './waveform';
import { wavePaths } from '../../desktop/production/wave-geometry.mjs';
import { planProduction, imagePrompts } from './planning';
import { prepareRelease } from './publishing';
const analysis = { schemaVersion: 1 as const, duration: 1, fps: 2, frames: [{ peak: 0, rms: 0, bands: Array(8).fill(0) }, { peak: 1, rms: 0.5, bands: Array(8).fill(0.5) }] };
describe('Các mô-đun sản xuất độc lập', () => {
  it('sóng nội suy theo thời gian, im khi ngoài bài hát và có ba kiểu hình học', () => {
    expect(sampleAudio(analysis, 0.25).peak).toBe(0.5); expect(sampleAudio(analysis, 1).rms).toBe(0);
    for (const mode of ['bars', 'line', 'circle'] as const) {
      const paths = wavePaths(analysis, 0.5, { ...defaultWaveStyle, mode }, 3840, 2160);
      expect(paths.length).toBeGreaterThan(0); expect(paths.flat(2).every(Number.isFinite)).toBe(true);
    }
    expect(() => validateWaveStyle({ ...defaultWaveStyle, color: 'red;evil' })).toThrow();
  });
  it('kế hoạch có chỗ duyệt ảnh, phụ thuộc đủ ba nhánh và không tự nhận đã kết nối', () => {
    const steps = planProduction({ audioAssetId: 'song', brief: { theme: '', style: '', lyrics: '' }, images: true, video: true, subtitles: true, waveform: true, exportVideo: true, releaseDraft: true });
    expect(steps.find(step => step.id === 'choose-image')?.status).toBe('waiting-input');
    expect(steps.find(step => step.id === 'export')?.dependsOn).toEqual(['analyze', 'loop', 'subtitles', 'waveform']);
    expect(steps.find(step => step.id === 'images')?.status).toBe('waiting-connection');
    expect(() => imagePrompts({ theme: '', style: '', lyrics: '' })).toThrow();
  });
  it('chuẩn bị nội dung phát hành từ dữ liệu thật, không tự công khai hoặc bịa credit', () => {
    const release = prepareRelease({ title: 'Bài hát', artist: 'Chú Lạ', theme: '', style: '', credits: '', lyrics: '', links: [], tags: ['nhạc', 'nhạc'] });
    expect(release.title).toBe('Bài hát — Chú Lạ'); expect(release.description).toBe(''); expect(release.tags).toEqual(['nhạc']);
    expect(release.privacyStatus).toBe('private'); expect(release.madeForKids).toBeNull();
  });
});
