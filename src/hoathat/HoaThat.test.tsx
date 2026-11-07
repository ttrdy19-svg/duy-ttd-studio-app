import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HoaThat from './HoaThat';
import type { AppsBridge, Project } from '../apps/types';


const base: Project = {
  id: '22222222-2222-4222-8222-222222222222', sourceKey: 'catalog:s1:m', title: 'Một chén cho sầu', singer: 'Duy TTD', genre: 'Pop Ballad', themes: ['Rượu'], languages: ['Việt'],
  lyrics: 'Một chén cho mình một chén cho sầu', lyricsSource: 'catalog', audio: { path: 'D:/a.wav', name: 'a.wav', duration: 200, size: 1 },
  source: { kind: 'catalog', songId: 's1', stage: 'm' }, createdAt: '', updatedAt: '', approved: null, words: false, captions: false, candidates: 0, chosen: null, thumbs: 0, transcribing: false,
};

function bridge(overrides: Partial<AppsBridge> = {}) {
  const api = {
    catalog: vi.fn(async () => ({ root: 'D:/k', name: 'k', songs: [
      { id: 's1', title: 'Một chén cho sầu', singer: 'Duy TTD', genre: 'Pop Ballad', themes: ['Rượu'], languages: ['Việt'], lyrics: 'x', audio: [{ stage: 'm', label: 'Master', fileName: 'a.wav', size: 1, path: 'D:/a.wav' }] },
      { id: 's2', title: 'Where the wild horses go', singer: 'The Wayfaring Bard', genre: 'Country', themes: [], languages: ['Anh'], lyrics: 'y', audio: [{ stage: 'm', label: 'Master', fileName: 'b.wav', size: 1, path: 'D:/b.wav' }] },
    ] })),
    pickCatalog: vi.fn(), openCatalogSong: vi.fn(async () => base), openBytes: vi.fn(async () => ({ ...base, lyrics: '', lyricsSource: null, source: { kind: 'file' as const } })),
    autoLyrics: vi.fn(async () => ({ ...base, lyrics: 'Lời Gemini chép', lyricsSource: 'api' as const, source: { kind: 'file' as const } })),
    updateProject: vi.fn(async (_id: string, patch: { lyrics?: string }) => ({ ...base, lyrics: patch.lyrics || '', lyricsSource: 'manual' as const })),
    audioUrl: vi.fn(async () => 'file:///a.wav'), onProject: vi.fn(() => () => {}),
    subtitles: vi.fn(async () => ({ cues: [], mode: 'none' as const, coverage: 0, duration: 200, needsTranscription: true })),
    transcribe: vi.fn(async () => base),
    imagePresets: vi.fn(async () => []), images: vi.fn(async () => ({ candidates: [], chosen: null, folder: '', thumbs: null, run: null, set: null })), onImages: vi.fn(() => () => {}),
    ...overrides,
  } as unknown as AppsBridge;
  window.manorApps = api;
  return api;
}
afterEach(() => { delete window.manorApps; });
// Qua cảnh mở màn: bấm một phím bất kỳ rồi chờ video tan hẳn.
async function enter() {
  fireEvent.keyDown(window, { key: 'Enter' });
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Vào Họa thất' })).toBeNull(), { timeout: 2000 });
}

describe('Họa thất', () => {
  it('mỗi lần vào phòng, video mở màn chạy vòng; phím bất kỳ hoặc nhấp chuột thì về gian phòng có nốt nhạc', async () => {
    bridge();
    const { rerender, container } = render(<HoaThat active />);
    const intro = screen.getByRole('button', { name: 'Vào Họa thất' });
    const video = container.querySelector('.ht-intro video') as HTMLVideoElement;
    expect(video.loop && video.muted && video.autoplay).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(intro.className).not.toContain('leaving');
    fireEvent.keyDown(window, { key: 'a' });
    expect(intro.className).toContain('leaving');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Vào Họa thất' })).toBeNull(), { timeout: 2000 });
    rerender(<HoaThat active={false} />);
    rerender(<HoaThat active />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Vào Họa thất' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Vào Họa thất' })).toBeNull(), { timeout: 2000 });
  });
  it('chạm nốt nhạc → Tàng Âm Các có bộ lọc → bài hiện đủ thông tin và lời, không gọi API chép lời', async () => {
    const api = bridge();
    render(<HoaThat />);
    await enter();
    await userEvent.click(screen.getByRole('button', { name: 'Nốt nhạc' }));
    await userEvent.click(screen.getByRole('button', { name: /Tàng Âm Các/ }));
    const picker = await screen.findByRole('dialog', { name: /Tàng Âm Các/ });
    await within(picker).findByText('Where the wild horses go');
    await userEvent.selectOptions(within(picker).getByLabelText('Lọc theo ngôn ngữ'), 'Việt');
    expect(within(picker).queryByText('Where the wild horses go')).toBeNull();
    await userEvent.click(within(picker).getByRole('button', { name: /Một chén cho sầu/ }));
    const card = await screen.findByRole('complementary', { name: 'Thông tin bài hát' });
    expect(within(card).getByText('Duy TTD')).toBeTruthy();
    expect(within(card).getByText('Pop Ballad')).toBeTruthy();
    expect(within(card).getByText('Rượu')).toBeTruthy();
    expect(within(card).getByText('Lời từ Tàng Âm Các')).toBeTruthy();
    expect(api.autoLyrics).not.toHaveBeenCalled();
  });

  it('file từ máy chưa có lời: tự chép lời bằng API, sửa được lời; chạm nốt nhạc mở bảng phụ đề tự chạy', async () => {
    const api = bridge();
    render(<HoaThat />);
    await enter();
    await userEvent.click(screen.getByRole('button', { name: 'Nốt nhạc' }));
    await userEvent.upload(screen.getByLabelText('File nhạc'), new File([new Uint8Array([1, 2, 3])], 'bai.wav', { type: 'audio/wav' }));
    expect(await screen.findByText('Lời Gemini chép')).toBeTruthy();
    expect(api.openBytes).toHaveBeenCalled();
    expect(screen.getByText(/Lời do Gemini chép/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Sửa lời' }));
    const box = screen.getByLabelText('Sửa lời bài hát');
    await userEvent.clear(box); await userEvent.type(box, 'Lời đã sửa');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu lời' }));
    await waitFor(() => expect(api.updateProject).toHaveBeenCalledWith(base.id, { lyrics: 'Lời đã sửa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nốt nhạc' }));
    expect(await screen.findByRole('region', { name: 'Bảng phụ đề' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Bảng tạo ảnh' })).toBeTruthy();
    await waitFor(() => expect(api.transcribe).toHaveBeenCalled());
  });
  it('đang ở bảng làm việc vẫn đổi được bài; Phiên cũ mở lại bài đã làm, vào thẳng bảng phụ đề và tạo ảnh; không còn Sổ tài khoản hay Họa thất cũ', async () => {
    const old = { ...base, id: '33333333-3333-4333-8333-333333333333', title: 'Bài hôm qua', candidates: 4, chosen: 'c1', approved: { version: 2, approvedAt: '' }, updatedAt: '2026-10-29T10:00:00.000Z' };
    const api = bridge({ projects: vi.fn(async () => [old, base]), project: vi.fn(async () => old) } as Partial<AppsBridge>);
    render(<HoaThat />);
    await enter();
    expect(screen.queryByRole('button', { name: 'Tài khoản và key' })).toBeNull();
    const bar = screen.getByRole('navigation', { name: 'Bài đang làm' });
    await userEvent.click(within(bar).getByRole('button', { name: /Phiên cũ/ }));
    const sessions = await screen.findByRole('dialog', { name: 'Phiên làm việc cũ' });
    expect(within(sessions).getByText(/Phụ đề đã duyệt \(bản 2\) · 4 ảnh · đã chọn ảnh/)).toBeTruthy();
    await userEvent.click(within(sessions).getByRole('button', { name: /Bài hôm qua/ }));
    expect(api.project).toHaveBeenCalledWith(old.id);
    expect(await screen.findByRole('region', { name: 'Bảng tạo ảnh' })).toBeTruthy();
    expect(within(bar).getByText('Bài hôm qua')).toBeTruthy();
    await userEvent.click(within(bar).getByRole('button', { name: 'Đổi bài' }));
    await userEvent.click(screen.getByRole('button', { name: /Tàng Âm Các/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Một chén cho sầu/ }));
    await waitFor(() => expect(within(bar).getByText('Một chén cho sầu')).toBeTruthy());
    expect(api.openCatalogSong).toHaveBeenCalledWith('s1', 'm');
  });
});
