import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MvStudio from './MvStudio';
import type { MvJob, MvLibrary } from './MvStudio';

afterEach(() => { delete window.manorMv; delete (window as unknown as { manorApps?: unknown }).manorApps; });

const library: MvLibrary = {
  projects: [{ id: 'mv-genshin', name: 'MV Genshin', scenes: ['palace'] }, { id: 'mv-kv3', name: 'MV Kiếm Võng 3', scenes: ['pavilion'] }],
  scenes: [
    { id: 'palace', name: 'Cung điện', license: '', credit: 'miHoYo', board: null, thumb: 'file:///palace.jpg' },
    { id: 'pavilion', name: 'Hoa Nguyệt Hà Tịch', license: '', credit: 'JX3 / SaraKale', board: 'mot-chen-cho-sau', thumb: 'file:///pavilion.jpg' },
  ],
  characters: [
    { id: 'fumiriya', name: 'Sakurada Fumiriya', gender: 'nam', license: 'CC0', credit: 'VRoid', thumb: 'file:///f.jpg' },
    { id: 'keqing', name: 'Keqing', gender: 'nữ', license: '', credit: '', thumb: null },
  ],
};
const songs = [
  { id: 's1', title: 'Một chén cho sầu (Pop Ballad)', singer: 'Duy TTD', genre: 'Pop Ballad', themes: [], languages: [], lyrics: '', audio: [{ stage: 'audio5_master', label: 'Master', fileName: 'a.wav', size: 1, path: 'D:/a.wav' }] },
  { id: 's2', title: 'Bài khác', singer: 'Xing', genre: 'Pop', themes: [], languages: [], lyrics: '', audio: [{ stage: 'x', label: 'Master', fileName: 'b.wav', size: 1, path: 'D:/b.wav' }] },
];

const prepared = { duration: 200, sections: [], script: { source: 'gemini' as const, style: 'trầm lắng', seed: 1, lip: 25, shots: [
  { start: 0, end: 20, section: 'intro', camera: 'Toàn cảnh, máy trôi', action: 'Cảnh sắc', sing: false },
  { start: 60, end: 90, section: 'Chorus', camera: 'Cận mặt', action: 'Nhân vật hát', sing: true },
] } };

it('Dựng MV 3D: chọn bài → chuẩn bị ngầm ra kịch bản (đổi được) → cảnh + nhân vật → xem thử 3D, preview 10 s và dựng cả bài', async () => {
  let push: (job: MvJob) => void = () => {};
  const mv = { library: vi.fn(async () => library), jobs: vi.fn(async () => []), make: vi.fn(async (_request: MvJob['request']) => ({}) as MvJob), cancel: vi.fn(), show: vi.fn(), onJob: vi.fn(cb => { push = cb; return () => {}; }),
    prepare: vi.fn(async () => prepared), script: vi.fn(async (_id: string, seed: number) => ({ ...prepared.script, seed, style: 'điện ảnh', shots: [{ start: 0, end: 30, section: 'intro', camera: 'Góc rộng', action: 'Đi dạo', sing: false }] })),
    previewUrl: vi.fn(async () => 'http://127.0.0.1:1/web/xem-thu.html'), onPrep: vi.fn(() => () => {}) };
  window.manorMv = mv;
  (window as unknown as { manorApps: unknown }).manorApps = { catalog: vi.fn(async () => ({ root: '', name: '', songs })) };
  const back = vi.fn();
  render(<MvStudio onBack={back} />);
  expect(await screen.findByText('Cung điện')).toBeTruthy();
  expect(screen.getAllByText('Quay theo kịch bản').length).toBe(1);
  // 1 · Bài: lọc theo ca sĩ, chọn bài → app chuẩn bị ngầm và hiện kịch bản.
  await waitFor(() => expect(screen.getByLabelText('Ca sĩ').querySelectorAll('option').length).toBe(3));
  fireEvent.change(screen.getByLabelText('Ca sĩ'), { target: { value: 'Duy TTD' } });
  expect(screen.queryByText('Bài khác')).toBeNull();
  fireEvent.click(screen.getByText('Một chén cho sầu (Pop Ballad)'));
  expect(await screen.findByText('Cận mặt')).toBeTruthy();
  expect(mv.prepare).toHaveBeenCalledWith(expect.objectContaining({ songId: 's1', audio: 'D:/a.wav', lip: 25 }));
  fireEvent.click(screen.getByRole('button', { name: /Kịch bản khác/ }));
  expect(await screen.findByText('Góc rộng')).toBeTruthy();
  expect(mv.script).toHaveBeenCalledWith('s1', 2, 25, undefined);
  // 3 · Cảnh + nhân vật → khung xem 3D bên phải.
  fireEvent.click(screen.getByRole('button', { name: 'MV Kiếm Võng 3' }));
  fireEvent.click(screen.getByText('Hoa Nguyệt Hà Tịch'));
  fireEvent.click(screen.getByRole('button', { name: 'Nam' }));
  expect(screen.queryByText('Keqing')).toBeNull();
  const card = screen.getByText('Sakurada Fumiriya').closest('button')!;
  expect(card.querySelector('img')!.getAttribute('src')).toBe('file:///f.jpg');
  fireEvent.click(card);
  expect((await screen.findByTitle('Xem thử cảnh và nhân vật')).getAttribute('src')).toBe('http://127.0.0.1:1/web/xem-thu.html');
  expect(mv.previewUrl).toHaveBeenCalledWith('pavilion', 'fumiriya');
  // Preview 10 s: 720p, cờ preview; xong thì khung phải chuyển sang video.
  fireEvent.click(screen.getByRole('button', { name: /Preview video 10 s/ }));
  await waitFor(() => expect(mv.make).toHaveBeenCalledWith({ songId: 's1', title: 'Một chén cho sầu (Pop Ballad)', singer: 'Duy TTD', audio: 'D:/a.wav', scene: 'pavilion', character: 'fumiriya', lip: 25, quality: '720', preview: true }));
  act(() => push({ id: 'p1', request: mv.make.mock.calls[0][0], step: 'Xong', percent: 100, state: 'done', output: 'D:/out/preview.mp4', error: null }));
  expect(document.querySelector('video')!.getAttribute('src')).toBe('file:///D:/out/preview.mp4');
  // Dựng cả bài + theo dõi tiến độ.
  fireEvent.click(screen.getByRole('button', { name: /^Dựng MV$/ }));
  await waitFor(() => expect(mv.make).toHaveBeenCalledTimes(2));
  expect(mv.make.mock.calls[1][0]).toEqual({ songId: 's1', title: 'Một chén cho sầu (Pop Ballad)', singer: 'Duy TTD', audio: 'D:/a.wav', scene: 'pavilion', character: 'fumiriya', lip: 25, quality: '720' });
  act(() => push({ id: 'j1', request: mv.make.mock.calls[1][0], step: 'Quay khung hình', percent: 40, state: 'running', output: null, error: null }));
  expect(screen.getByText('Quay khung hình · 40%')).toBeTruthy();
  act(() => push({ id: 'j1', request: mv.make.mock.calls[1][0], step: 'Xong', percent: 100, state: 'done', output: 'D:/mv.mp4', error: null }));
  fireEvent.click(screen.getByRole('button', { name: /Mở thư mục/ }));
  expect(mv.show).toHaveBeenCalledWith('D:/mv.mp4');
  fireEvent.click(screen.getByRole('button', { name: /Về Mộc Ngư Trang/ }));
  expect(back).toHaveBeenCalled();
});
