import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ImagePanel from './ImagePanel';
import type { AppsBridge, ImageSlot, ImageState, Project } from '../apps/types';

const project = { id: 'p1', title: 'Đêm trăng', audio: { path: 'C:/bai/audio.wav', name: 'Đêm trăng.wav', duration: 180, size: 9 } } as Project;
const slot = (service: ImageSlot['service'], status: ImageSlot['status'], candidateId: string | null = null, percent = 0): ImageSlot => ({ service, status, percent, stage: status === 'running' ? 'Flow đang vẽ' : '', account: '', candidateId, error: status === 'error' ? 'Chưa có profile ChatGPT nào trực tuyến.' : '' });
const empty: ImageState = { candidates: [], chosen: null, folder: '', thumbs: null, run: null, set: null };
const running: ImageState = { ...empty, candidates: [{ id: 'c1', file: 'images/c1.png', url: 'file:///c1.png', prompt: '', adapter: 'flow', model: '', account: '', round: '' }],
  run: { kind: 'set', stage: 'Đang chuẩn bị' },
  set: { round: 'r', presetId: 'swordsman', slots: [slot('chatgpt', 'done', 'c1'), slot('chatgpt', 'running', null, 42), slot('chatgpt', 'waiting'), slot('chatgpt', 'error')] } };
afterEach(() => { delete window.manorApps; });

describe('Bảng tạo ảnh', () => {
  it('chọn quả cầu thì các quả khác tắt màu, Tạo ảnh hiện 4 ô ChatGPT; nhấp đúp mở cửa sổ xem ảnh có phóng to và nút tắt; sang Lưu Ảnh Thất mang theo ảnh, nhạc, phụ đề và tự làm thumbnail', async () => {
    let listener: (change: ImageState & { id?: string }) => void = () => {};
    const api = {
      imagePresets: vi.fn(async () => [{ id: 'swordsman', name: 'Kiếm khách', description: 'Kiếm hiệp', sample: 'file:///s.png' }, { id: 'minh-nhi', name: 'Minh Nhi', description: 'Mỹ nhân' }]),
      images: vi.fn(async () => empty), onImages: vi.fn(callback => { listener = callback; return () => {}; }),
      generateImageSet: vi.fn(async () => running),
      chooseImage: vi.fn(async () => ({ ...running, run: { kind: 'set' as const, done: 1 }, chosen: 'c1' })),
      imageBytes: vi.fn(async () => new Uint8Array([1])), makeThumbnails: vi.fn(async () => running),
      audioBytes: vi.fn(async () => new Uint8Array([2])), subtitles: vi.fn(async () => ({ cues: [{ start: 1, end: 3, text: 'Trăng lên', words: [] }] })),
    } as unknown as AppsBridge;
    window.manorApps = api;
    const onToWorkshop = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:anh');
    render(<ImagePanel project={project} onClose={() => {}} onToWorkshop={onToWorkshop} />);
    const orb = await screen.findByRole('button', { name: /Huyết Mặc Kiếm Hồn/ });
    expect(screen.queryByRole('button', { name: /Tạo ảnh/ })).toBeNull();
    await userEvent.hover(orb);
    expect(screen.getByRole('img', { name: /Ảnh mẫu Huyết Mặc Kiếm Hồn/ })).toBeTruthy();
    await userEvent.click(orb);
    expect(orb.getAttribute('aria-pressed')).toBe('true');
    expect(orb.parentElement!.className).toContain('has-pick');
    await userEvent.click(screen.getByRole('button', { name: /Tạo ảnh/ }));
    expect(api.generateImageSet).toHaveBeenCalledWith('p1', { presetId: 'swordsman' });
    const tiles = screen.getByLabelText('Các ô tạo ảnh');
    expect(tiles.children.length).toBe(4);
    expect(within(tiles).getByText('42%')).toBeTruthy();
    expect(within(tiles).getAllByText(/Chưa có profile ChatGPT/).length).toBe(1);
    listener({ ...running, run: { kind: 'set', done: 1 }, id: 'p1' });
    const first = await screen.findByRole('button', { name: 'Chọn ảnh ChatGPT 1' });
    await userEvent.dblClick(first);
    const viewer = screen.getByRole('dialog', { name: 'Xem ảnh ChatGPT 1' });
    expect(viewer.parentElement).toBe(document.body);
    await userEvent.click(within(viewer).getByRole('button', { name: 'Phóng to' }));
    expect(within(viewer).getByLabelText('Mức phóng').textContent).toBe('125%');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /Xem ảnh/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Xem ảnh ChatGPT 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tắt ảnh' }));
    expect(screen.queryByRole('dialog', { name: /Xem ảnh/ })).toBeNull();
    await userEvent.click(first);
    expect(api.chooseImage).toHaveBeenCalledWith('p1', 'c1');
    expect(tiles.className).toContain('has-chosen');
    await userEvent.click(screen.getByRole('button', { name: 'Sang Lưu Ảnh Thất' }));
    await waitFor(() => expect(onToWorkshop).toHaveBeenCalled());
    expect(onToWorkshop.mock.calls[0][0]).toMatchObject({ id: 'p1', image: { name: 'Đêm trăng.png' }, audio: { name: 'Đêm trăng.wav', duration: 180, extension: 'wav' }, cues: [{ start: 1, end: 3, text: 'Trăng lên' }] });
    expect(screen.queryByRole('button', { name: 'Tạo thumb' })).toBeNull();
    expect(api.makeThumbnails).toHaveBeenCalledWith('p1', { adapterId: 'chatgpt', title: 'Đêm trăng', font: 'Arial', mode: 'ai' });
  });
});
