import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import KhoNhac from './KhoNhac';
import SoiKenh from './SoiKenh';

afterEach(() => { delete (window as unknown as { manorApps?: unknown }).manorApps; });
const audio = (p: string) => [{ stage: 'master', label: 'Master', fileName: 'a.wav', size: 1, path: p }];
const songs = [
  { id: 's1', title: 'Chuyện cũ qua rồi', singer: 'Xing', genre: 'Lofi R&B', themes: ['chia tay'], languages: [], lyrics: 'Câu một\nCâu hai', audio: audio('E:/K/BaiHat/a/Master.wav') },
  { id: 's2', title: 'A dollar short', singer: 'The Wayfaring Bard', genre: 'Country', themes: [], languages: [], lyrics: '', audio: audio('E:/K/BaiHat/b/Master.wav') },
];

const info = (extra: object = {}) => ({ published: { youtube: false, distrokid: false, tiktok: false, bilibili: false, shorts: false }, claimYoutube: false, isrc: '', cover: false, v60: false, memento: false,
  links: [], notes: '', meaning: '', titleNote: '', createdAt: 1792907354814, mvDone: 0, shorts: 0, workCover: false, workCoverNote: '', tiktokThumbs: 0, bilibiliThumbs: 0, ...extra });

it('Kho nhạc mới: thẻ theo tác phẩm (gom phiên bản), ô ghi tên bài + ca sĩ, nhãn YouTube theo cờ hoặc link, lọc, chi tiết thông tin/lời/tệp, ký âm', async () => {
  const songs2 = [
    { ...songs[0], info: info({ links: [{ platform: 'YouTube', url: 'https://youtu.be/x' }, { platform: 'Suno', url: 'https://suno.com/s/1' }], isrc: 'VN-A01-26-00001', meaning: 'Chia tay nhẹ nhàng' }) },
    { ...songs[0], id: 's1b', title: 'Chuyện cũ qua rồi (Pop)', singer: 'Duy TTD', genre: 'Pop', info: info() },
    { ...songs[1], info: info() },
  ];
  const bridge = { catalog: vi.fn(async () => ({ root: 'E:/K', name: 'Kho', songs: songs2 })), albums: vi.fn(async () => []),
    khoTep: vi.fn(async () => ({ s1: [{ name: 'x . Thumb MV 1.png', kind: 'thumb-mv', path: 'E:/K/BaiHat/a/t.png', url: 'file:///E:/K/t.png' }, { name: 'x . Phụ đề.srt', kind: 'srt', path: 'E:/K/BaiHat/a/p.srt' }], s1b: [], s2: [] })),
    khoMo: vi.fn(async () => {}), moLink: vi.fn(async () => {}), onXuLyBai: vi.fn(() => () => {}),
    xuLyBai: vi.fn(async () => ({ luc: '2026-11-03T10:00:00Z', loi: { khop: 94, thieu: [], thua: [], nguon: 'kho' }, phuDe: { cau: 30, phuLoi: 100 }, kyAm: { giong_vi: 'Đô trưởng', bpm: 80, so_trang: 2, so_hop_am: 10 }, chuDe: { chuDe: ['Chia ly', 'Hoài niệm'], boiCanh: 'Hiện đại', lyDo: '' }, loiBuoc: {} })) };
  (window as unknown as { manorApps: unknown }).manorApps = bridge;
  const old = vi.fn();
  render(<KhoNhac onOld={old} />);
  expect(await screen.findByText('2 tác phẩm')).toBeTruthy();
  expect(screen.getByTitle(/Số tác phẩm/).textContent).toBe('2Tác phẩm'); expect(screen.getByTitle(/Số phiên bản/).textContent).toBe('3Phiên bản');
  // Hai phiên bản "Chuyện cũ qua rồi" gom thành MỘT thẻ, ô ghi tên bài và các ca sĩ.
  const card = screen.getByText('Chuyện cũ qua rồi').closest('button')!;
  expect(card.textContent).toContain('Xing · Duy TTD'); expect(card.textContent).toContain('2 phiên bản');
  expect(card.querySelector('i.yt.on')).toBeTruthy();
  expect(screen.getByText('A dollar short').closest('button')!.querySelector('i.yt.on')).toBeNull();
  fireEvent.click(screen.getByTitle(/Có ít nhất một nguồn YouTube/));
  expect(screen.queryByText('A dollar short')).toBeNull();
  fireEvent.click(screen.getByTitle(/Có ít nhất một nguồn YouTube/));
  fireEvent.click(screen.getByRole('button', { name: 'Thiếu lời' }));
  expect(screen.queryByText('Chuyện cũ qua rồi')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thiếu lời' }));
  fireEvent.click(screen.getByText('Chuyện cũ qua rồi'));
  expect(screen.getByText('VN-A01-26-00001')).toBeTruthy();
  expect(screen.getByText('Chia tay nhẹ nhàng')).toBeTruthy();
  fireEvent.click(document.querySelector('.kn-info .kn-link')!);
  expect(bridge.moLink).toHaveBeenCalledWith('https://youtu.be/x');
  fireEvent.click(screen.getByRole('tab', { name: 'Lời' }));
  expect(screen.getByText(/Câu một/)).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: /Tệp/ }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Mở' })[1]);
  expect(bridge.khoMo).toHaveBeenCalledWith('E:/K/BaiHat/a/p.srt', false);
  fireEvent.click(screen.getByRole('button', { name: /Xử lý bài/ }));
  expect(await screen.findByText(/Đã xử lý "Chuyện cũ qua rồi" · lời khớp 94% · giọng Đô trưởng · chủ đề Chia ly, Hoài niệm · bối cảnh Hiện đại/)).toBeTruthy();
  // Đổi sang phiên bản Duy TTD.
  fireEvent.click(screen.getByRole('button', { name: /Duy TTD · Pop/ }));
  fireEvent.click(screen.getByRole('tab', { name: 'Thông tin' }));
  expect(screen.queryByText('VN-A01-26-00001')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Mở kho cũ (S2)' }));
  expect(old).toHaveBeenCalled();
});

it('Soi kênh: lấy 5 kênh từ sổ (ưu tiên kênh đã chọn), thẻ số liệu, video nổi, nhận xét AI, mở Studio đúng profile', async () => {
  const ch = (name: string, handle: string, selected = true) => ({ name, handle, selected });
  const view = { sites: [], geminiKeys: [], legacyKeys: 0, imageKey: '', accounts: [
    { id: 'a1', label: 'A', sites: { youtube: { plan: 'x', channels: [ch('Mộc Ngư Quán', '@MocNguQuan')] } } },
    { id: 'a2', label: 'B', sites: { youtube: { plan: 'x', channels: [ch('Mộc Ngư Quán', '@Khac', false), ch('Xing', '@Xing8424')] } } },
  ] };
  const v = (id: string, views: number) => ({ id, title: `Bài ${id}`, views, viewsText: String(views), age: '9 ngày trước', length: '3:00', thumb: '' });
  const bridge = { accounts: vi.fn(async () => view),
    soiKenh: vi.fn(async (handles: string[]) => handles.map(h => ({ handle: h, name: h === '@Xing8424' ? 'Xing' : 'Mộc Ngư Quán', subscribersText: '404 người đăng ký', subscribers: 404, videoCountText: '179 video', videos: [v('a', 100), v('b', 100), v('c', 500)] }))),
    nhanXetKenh: vi.fn(async () => ({ tomTat: 'Kênh đang lên.', nenLam: ['Đăng tối thứ 6'] })), openInAccount: vi.fn(async () => ({ dir: 'Profile 4', url: '' })) };
  (window as unknown as { manorApps: unknown }).manorApps = bridge;
  render(<SoiKenh />);
  await waitFor(() => expect(bridge.soiKenh).toHaveBeenCalledWith(['@Xing8424', '@MocNguQuan']));
  expect(await screen.findByText('Bài c')).toBeTruthy();
  expect(screen.getByText(/nổi ×5\.0/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Nhận xét kênh này' }));
  expect(await screen.findByText('Kênh đang lên.')).toBeTruthy();
  expect(screen.getByText('Đăng tối thứ 6')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Mở Studio/ }));
  expect(bridge.openInAccount).toHaveBeenCalledWith('a2', { channel: ch('Xing', '@Xing8424'), cuaSo: true });
});

it('Kho nhạc: tìm trong lời và ISRC, lọc chữ cái, ngôn ngữ, sắp xếp A→Z, chế độ Đầy đủ tách phiên bản, xóa bộ lọc', async () => {
  const mk = (id: string, title: string, singer: string, extra: object = {}) => ({ id, title, singer, genre: 'Pop', themes: ['Nhân sinh'], languages: ['Việt'], lyrics: 'trăng tàn', audio: [{ stage: 'master', label: 'Master', fileName: 'a.wav', size: 1, path: `E:/K/${id}.wav` }], info: info(), ...extra });
  const list = [mk('a', 'Cờ', 'Duy TTD', { info: info({ isrc: 'VNA012600001', createdAt: 1 }) }), mk('b', 'Cờ (Rock)', 'Xing', { genre: 'Rock', info: info({ createdAt: 2 }) }), mk('c', 'Ánh trăng', 'Xing', { languages: ['Anh'], lyrics: 'moonlight', info: info({ createdAt: 3 }) })];
  (window as unknown as { manorApps: unknown }).manorApps = { catalog: vi.fn(async () => ({ root: 'E:/K', name: 'Kho', songs: list })), albums: vi.fn(async () => []), khoTep: vi.fn(async () => ({})), khoMo: vi.fn(), moLink: vi.fn(), kyAm: vi.fn() };
  render(<KhoNhac />);
  expect(await screen.findByText('2 tác phẩm')).toBeTruthy();
  const titles = () => [...document.querySelectorAll('.kn-tile b')].map(b => b.textContent);
  expect(titles()).toEqual(['Ánh trăng', 'Cờ']);                       // mới thêm trước
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'az' } });
  expect(titles()).toEqual(['Ánh trăng', 'Cờ']);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'za' } });
  expect(titles()).toEqual(['Cờ', 'Ánh trăng']);
  fireEvent.change(screen.getByLabelText('Tìm bài'), { target: { value: 'moonlight' } });   // tìm trong lời
  expect(titles()).toEqual(['Ánh trăng']);
  fireEvent.change(screen.getByLabelText('Tìm bài'), { target: { value: 'VNA0126' } });     // tìm theo ISRC
  expect(titles()).toEqual(['Cờ']);
  fireEvent.click(screen.getByRole('button', { name: /Xóa bộ lọc \(1\)/ }));
  fireEvent.change(screen.getByPlaceholderText('VD: A'), { target: { value: 'a' } });      // chữ cái đầu, bỏ dấu
  expect(titles()).toEqual(['Ánh trăng']);
  fireEvent.click(screen.getByRole('button', { name: /Xóa bộ lọc/ }));
  fireEvent.click(screen.getByTitle(/Lọc tác phẩm tiếng Anh/));
  expect(titles()).toEqual(['Ánh trăng']);
  fireEvent.click(screen.getByTitle(/Lọc tác phẩm tiếng Anh/));
  fireEvent.click(screen.getByRole('button', { name: 'Đầy đủ' }));
  expect(screen.getByText('3 phiên bản')).toBeTruthy();
  expect(titles().filter(t => t === 'Cờ').length).toBe(2);
});
