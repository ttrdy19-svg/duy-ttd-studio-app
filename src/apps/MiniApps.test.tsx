import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MiniApps from './MiniApps';
import type { AppsBridge, ImageState, Project } from './types';

const project: Project = {
  id: '11111111-1111-4111-8111-111111111111', sourceKey: 'catalog:s1:audio3_master', title: 'đêm trăng (Ballad)', singer: 'Ca', genre: 'Ballad', themes: [], languages: ['Việt'], lyricsSource: 'catalog', lyrics: 'Đêm nay trăng sáng',
  audio: { path: 'D:/k/a.wav', name: 'a.wav', duration: 200, size: 1 }, source: { kind: 'catalog', songId: 's1', stage: 'audio3_master' },
  createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z', approved: null, words: true, captions: false, candidates: 0, chosen: null, thumbs: 0, transcribing: false,
};
const emptyImages: ImageState = { candidates: [], chosen: null, folder: 'x', thumbs: null, run: null };

function bridge(overrides: Partial<AppsBridge> = {}) {
  const value = {
    catalog: vi.fn(async () => ({ root: 'D:/k', name: 'k', songs: [
      { id: 's1', title: 'đêm trăng (Ballad)', singer: 'Ca', genre: 'Ballad', themes: ['Trăng'], languages: [], lyrics: 'Đêm nay trăng sáng', audio: [{ stage: 'audio3_master', label: 'Master', fileName: 'a.wav', size: 1, path: 'D:/k/a.wav' }] },
      { id: 's2', title: 'Bài khác', singer: 'B', genre: 'Rock', themes: [], languages: [], lyrics: '', audio: [] },
    ] })),
    pickCatalog: vi.fn(), projects: vi.fn(async () => []), project: vi.fn(),
    openCatalogSong: vi.fn(async () => project), openFile: vi.fn(async () => null),
    updateProject: vi.fn(async () => project), transcribe: vi.fn(async () => project), cancelTranscribe: vi.fn(),
    openFolder: vi.fn(), audioUrl: vi.fn(async () => 'file:///a.wav'),
    subtitles: vi.fn(async () => ({ cues: [{ start: 1, end: 2.5, text: 'Đêm nay trăng sáng' }], mode: 'lyrics' as const, coverage: 0.92, duration: 200 })),
    saveSubtitles: vi.fn(async () => ({ ...project, captions: true })), approveSubtitles: vi.fn(async () => ({ ...project, captions: true, approved: { version: 1, approvedAt: '2026-10-29T00:00:00Z' } })),
    srtLibrary: vi.fn(async () => []), retryThumbnail: vi.fn(async () => emptyImages), exportSubtitles: vi.fn(async () => 'D:/k/a.srt'),
    imageProviders: vi.fn(async () => [{ id: 'flow', name: 'Google Flow', ok: true, detail: '' }]), imageFonts: vi.fn(async () => ['Arial', 'Segoe UI']), imagePresets: vi.fn(async () => []),
    images: vi.fn(async () => emptyImages),
    generateImages: vi.fn(async () => ({ ...emptyImages, run: { kind: 'candidates' as const, stage: 'Flow · ảnh 1/5' } })),
    importImages: vi.fn(), chooseImage: vi.fn(), removeImage: vi.fn(), cancelImages: vi.fn(),
    makeThumbnails: vi.fn(async () => emptyImages), retitleThumbnails: vi.fn(), exportThumbnails: vi.fn(),
    imageKeyStatus: vi.fn(), saveImageKey: vi.fn(), removeImageKey: vi.fn(),
    onProject: vi.fn(() => () => {}), onImages: vi.fn(() => () => {}),
    ...overrides,
  } as unknown as AppsBridge;
  window.manorApps = value;
  return value;
}

afterEach(() => { delete window.manorApps; });

describe('Bàn nhạc', () => {
  it('chọn bài trong Tàng Âm Các, khớp lời, sửa câu rồi lưu SRT/ASS', async () => {
    const api = bridge();
    render(<MiniApps />);
    const list = await screen.findByRole('complementary', { name: 'Danh sách nhạc' });
    expect(within(list).getByText('Thiếu file nhạc')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Tìm bài'), 'trăng');
    expect(within(list).queryByText('Bài khác')).toBeNull();
    await userEvent.click(within(list).getByRole('button', { name: /đêm trăng/ }));
    expect(api.openCatalogSong).toHaveBeenCalledWith('s1', 'audio3_master');
    expect(await screen.findByText(/khớp 92% từ/)).toBeTruthy();
    const text = screen.getByLabelText('Lời câu 1');
    await userEvent.clear(text); await userEvent.type(text, 'Đêm nay trăng tỏ');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(api.saveSubtitles).toHaveBeenCalled());
    const [, request] = vi.mocked(api.saveSubtitles).mock.calls[0];
    expect(request.cues[0]).toEqual({ start: 1, end: 2.5, text: 'Đêm nay trăng tỏ', words: undefined });
    await userEvent.click(screen.getByRole('button', { name: 'SRT' }));
    expect(await screen.findByText('Đã lưu D:/k/a.srt')).toBeTruthy();
  });

  it('duyệt vào kho SRT; bài đã duyệt mở thẳng bản trong kho, không gọi API', async () => {
    const api = bridge({ subtitles: vi.fn(async () => ({ cues: [{ start: 1, end: 2, text: 'Đêm nay trăng sáng' }], mode: 'library' as const, version: 3, coverage: 1, duration: 200, saved: true })) });
    render(<MiniApps />);
    await userEvent.click(await screen.findByRole('button', { name: /đêm trăng/ }));
    expect(await screen.findByText(/bản đã duyệt trong kho SRT \(phiên bản 3\)/)).toBeTruthy();
    expect(api.transcribe).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Duyệt vào kho SRT/ }));
    expect(await screen.findByText(/Đã duyệt vào kho SRT · phiên bản 1/)).toBeTruthy();
    expect(vi.mocked(api.approveSubtitles).mock.calls[0][1].cues[0].text).toBe('Đêm nay trăng sáng');
  });

  it('file nhập chưa có lời: mở sẵn ô dán lời, lời dán được lưu trước khi đọc bằng API', async () => {
    const bare = { ...project, lyrics: '', words: false, source: { kind: 'file' as const }, sourceKey: 'file:x' };
    const api = bridge({ openFile: vi.fn(async () => bare), subtitles: vi.fn(async () => ({ cues: [], mode: 'none' as const, coverage: 0, duration: 200, needsTranscription: true })) });
    render(<MiniApps />);
    await userEvent.click(await screen.findByRole('button', { name: /Nhập file nhạc/ }));
    expect(await screen.findByText(/Bài chưa có lời\. Dán lời/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Lời chuẩn'), 'Câu một');
    await userEvent.click(screen.getByRole('button', { name: /Đọc lời bằng Gemini/ }));
    await waitFor(() => expect(api.transcribe).toHaveBeenCalled());
    expect(api.updateProject).toHaveBeenCalledWith(project.id, { lyrics: 'Câu một' });
    expect(vi.mocked(api.updateProject).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(api.transcribe).mock.invocationCallOrder[0]);
  });

  it('chặn lưu khi mốc thời gian chồng nhau', async () => {
    bridge({ subtitles: vi.fn(async () => ({ cues: [{ start: 1, end: 3, text: 'a' }, { start: 2, end: 4, text: 'b' }], mode: 'heard' as const, coverage: 0, duration: 200 })) });
    render(<MiniApps />);
    await userEvent.click(await screen.findByRole('button', { name: /đêm trăng/ }));
    expect(await screen.findByText(/Câu 2 sai mốc/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Họa ảnh: tạo 5 ảnh theo chủ đề, thumbnail mặc định viết hoa chữ cái đầu và bỏ thể loại', async () => {
    const chosen = { ...emptyImages, chosen: 'c1', candidates: [{ id: 'c1', file: 'images/c1.png', url: 'file:///c1.png', prompt: '', adapter: 'flow', model: 'Nano Banana', account: 'a', round: '2026-10-29T00:00:00Z' }] };
    const api = bridge({ images: vi.fn(async () => chosen), generateImages: vi.fn(async () => ({ ...chosen, run: { kind: 'candidates' as const, stage: 'Flow · ảnh 1/5' } })) });
    render(<MiniApps />);
    await userEvent.click(await screen.findByRole('button', { name: /đêm trăng/ }));
    await userEvent.click(screen.getByRole('tab', { name: /Họa ảnh/ }));
    await userEvent.type(await screen.findByLabelText('Chủ đề / yêu cầu thêm'), 'bến đò');
    // Thumbnail mặc định: AI vẽ chữ + dò chính tả, tên đã viết hoa chữ cái đầu và bỏ "(Ballad)".
    await userEvent.click(screen.getByRole('button', { name: /Tạo 5 thumbnail/ }));
    expect(api.makeThumbnails).toHaveBeenCalledWith(project.id, { adapterId: 'flow', title: 'Đêm Trăng', font: 'Arial', mode: 'ai' });
    await userEvent.click(screen.getByRole('button', { name: /Tạo 5 ảnh/ }));
    expect(api.generateImages).toHaveBeenCalledWith(project.id, { adapterId: 'flow', theme: 'bến đò', presetId: null });
    expect((await screen.findByRole('status')).textContent).toContain('Flow · ảnh 1/5');
    expect((screen.getByLabelText('Tên in trên ảnh') as HTMLInputElement).value).toBe('Đêm Trăng');
  });

  it('thumbnail AI: hiện kết quả dò chính tả từng khung, khung sai có nút tạo lại', async () => {
    const urls = { '16:9': 'file:///a', '9:16': 'file:///b', '1:1': 'file:///c', '2:3': 'file:///d', '4:3': 'file:///e' };
    const good = { ok: true, problems: [] }, state = { ...emptyImages, chosen: 'c1', candidates: [{ id: 'c1', file: 'images/c1.png', url: 'file:///c1.png', prompt: '', adapter: 'flow', model: '', account: '', round: '2026-10-29T00:00:00Z' }],
      thumbs: { mode: 'ai' as const, title: 'Đêm Trăng', font: 'Arial', adapter: 'flow', errors: ['2:3: “Trang” thay vì “Trăng”'], files: urls, urls,
        checks: { '16:9': good, '9:16': good, '1:1': good, '2:3': { ok: false, problems: ['“Trang” thay vì “Trăng”'] }, '4:3': good } } };
    const api = bridge({ images: vi.fn(async () => state) });
    render(<MiniApps />);
    await userEvent.click(await screen.findByRole('button', { name: /đêm trăng/ }));
    await userEvent.click(screen.getByRole('tab', { name: /Họa ảnh/ }));
    expect((await screen.findAllByText(/đúng chính tả/)).length).toBe(4);
    expect(screen.getByText('“Trang” thay vì “Trăng”')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /In lại chữ/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Tạo lại/ }));
    expect(api.retryThumbnail).toHaveBeenCalledWith(project.id, '2:3');
  });

  it('báo rõ khi chạy ngoài bản Windows', () => {
    render(<MiniApps />);
    expect(screen.getByText(/cần bản Windows/)).toBeTruthy();
  });
});
