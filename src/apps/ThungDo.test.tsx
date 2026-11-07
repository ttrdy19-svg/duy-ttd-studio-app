import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ThungDo from './ThungDo';
import type { AppsBridge, Mon } from './types';

const mon = (id: string, caSi = 'Chú Lạ'): Mon => ({
  id, nguon: [`D:\\Thu nhac\\${id}.wav`],
  audio: { path: `D:\\Thu nhac\\${id}.wav`, size: 100, giay: 125, lufs: -14.2, sha256: id, suno: { id: `suno-${id}`, createdAt: '2026-11-06' }, taiVe: 0 },
  anh: [{ path: 'D:\\Thu nhac\\ảnh #1.png', w: 1920, h: 1080, khung: '16:9' }],
  srt: 'phude.srt', docx: 'loi.docx', deXuat: { bai: `Bài ${id}`, caSi, phongCach: 'Đồng quê', loi: `Lời ${id}` }, trung: [],
});
function bridge(items: Mon[]) {
  const b = {
    catalog: vi.fn().mockResolvedValue({ songs: [{ singer: 'Ca sĩ trong kho' }] }),
    thungDoChon: vi.fn().mockResolvedValue(['D:\\Thu nhac']),
    thungDoPhanTich: vi.fn().mockResolvedValue(items),
    thungDoNhap: vi.fn().mockResolvedValue({ thuMuc: 'E:\\Kho gia lap\\Bai a', files: [], catalogId: 'a' }),
    khoMo: vi.fn().mockResolvedValue(undefined),
  };
  window.manorApps = b as unknown as AppsBridge;
  return b;
}
async function phanTich() {
  fireEvent.click(screen.getByRole('button', { name: 'Chọn file / thư mục' }));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Phân tích' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Phân tích' }));
  await screen.findByRole('textbox', { name: 'Tên bài món 1' });
}
const nutNhap = () => screen.getByRole('button', { name: /Nhập các món đã chọn/ }) as HTMLButtonElement;
afterEach(() => { delete window.manorApps; });

describe('Thùng đồ', () => {
  it('phân tích hiện đủ dòng, thông tin, gợi ý ca sĩ và mặc định bỏ chọn món trùng mã băm', async () => {
    const trung = mon('b'); trung.trung = [{ muc: 'kho', file: 'E:\\Kho gia lap\\da-co.wav', ly_do: 'trung-ma-bam' }];
    const b = bridge([mon('a'), trung]); render(<ThungDo />); await phanTich();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(b.thungDoPhanTich).toHaveBeenCalledWith(['D:\\Thu nhac']);
    const check = screen.getByRole('checkbox', { name: 'Chọn món 2' }) as HTMLInputElement;
    expect(check.checked).toBe(false); expect(check.closest('tr')?.classList.contains('td-trung')).toBe(true);
    expect(screen.getByText('Trùng mã băm').title).toContain('da-co.wav');
    expect(screen.getAllByText('2:05')).toHaveLength(2);
    expect(screen.getAllByText('-14.2')).toHaveLength(2);
    expect(screen.getByText('suno-a')).toBeTruthy();
    expect(document.querySelector('datalist option')?.getAttribute('value')).toBe('Ca sĩ trong kho');
    fireEvent.click(nutNhap());
    await screen.findByText('✓ Đã nhập. File nguồn đã vào Thùng rác.');
    expect(b.thungDoNhap).toHaveBeenCalledTimes(1);
  });

  it('thiếu ca sĩ hoặc tên bài thì không nhập được; sửa đủ mới cho nhập', async () => {
    const b = bridge([mon('a', '')]); render(<ThungDo />); await phanTich();
    expect(nutNhap().disabled).toBe(true); expect(screen.getByText('Thiếu ca sĩ')).toBeTruthy();
    fireEvent.click(nutNhap()); expect(b.thungDoNhap).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Ca sĩ món 1' }), { target: { value: 'Ca sĩ mới' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên bài món 1' }), { target: { value: '  ' } });
    expect(nutNhap().disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên bài món 1' }), { target: { value: ' Bài mới ' } });
    expect(nutNhap().disabled).toBe(false);
    fireEvent.change(screen.getByRole('textbox', { name: 'Phong cách món 1' }), { target: { value: '  ' } });
    expect(nutNhap().disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Phong cách món 1' }), { target: { value: 'Đồng quê' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Lời bài hát' }), { target: { value: 'Lời đã sửa chính tả' } });
    fireEvent.click(nutNhap()); await waitFor(() => expect(b.thungDoNhap).toHaveBeenCalledTimes(1));
    expect(b.thungDoNhap).toHaveBeenCalledWith(expect.objectContaining({ bai: 'Bài mới', caSi: 'Ca sĩ mới', loi: 'Lời đã sửa chính tả' }));
  });

  it('bấm dòng đổi lời, ảnh và nhạc; mã hóa đúng đường dẫn ảnh có dấu và dấu thăng', async () => {
    bridge([mon('a'), mon('b')]); render(<ThungDo />); await phanTich();
    fireEvent.click(screen.getByRole('button', { name: 'Xem món 2' }));
    expect((screen.getByRole('textbox', { name: 'Lời bài hát' }) as HTMLTextAreaElement).value).toBe('Lời b');
    expect(document.querySelector('audio')?.getAttribute('src')).toBe('file:///D:/Thu%20nhac/b.wav');
    expect(screen.getByRole('img').getAttribute('src')).toContain('%E1%BA%A3nh%20%231.png');
    expect(screen.getByRole('img').getAttribute('alt')).toContain('16:9');
  });

  it('nhập tuần tự, hiện lỗi từng dòng, tiếp tục món sau và mở thư mục thành công', async () => {
    const b = bridge([mon('a'), mon('b'), mon('c')]);
    let tiep!: (v: { thuMuc: string; files: string[]; catalogId: string }) => void;
    b.thungDoNhap.mockImplementationOnce(() => new Promise(resolve => { tiep = resolve; })).mockRejectedValueOnce(new Error('Trùng tên file đích'));
    render(<ThungDo />); await phanTich(); fireEvent.click(nutNhap());
    expect(b.thungDoNhap).toHaveBeenCalledTimes(1); expect(nutNhap().disabled).toBe(true);
    tiep({ thuMuc: 'E:\\Kho gia lap\\Bai a', files: [], catalogId: 'a' });
    await waitFor(() => expect(b.thungDoNhap).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getAllByText('✓ Đã nhập. File nguồn đã vào Thùng rác.')).toHaveLength(2));
    expect(screen.getByText('Trùng tên file đích')).toBeTruthy();
    expect((screen.getByRole('progressbar', { name: 'Tiến độ nhập kho' }) as HTMLProgressElement).value).toBe(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'E:\\Kho gia lap\\Bai a' })[0]);
    expect(b.khoMo).toHaveBeenCalledWith('E:\\Kho gia lap\\Bai a');
    expect(nutNhap().disabled).toBe(true);
  });

  it('khóa món đã ghi nếu đưa nguồn vào Thùng rác lỗi, không báo đã trash thành công', async () => {
    const b = bridge([mon('a')]);
    b.thungDoNhap.mockRejectedValue(new Error('Đã nhập và kiểm băm, nhưng chưa đưa hết nguồn vào Thùng rác: bị khóa. Danh mục: a'));
    render(<ThungDo />); await phanTich(); fireEvent.click(nutNhap());
    await screen.findByText(/Đã nhập và kiểm băm, nhưng/);
    expect((screen.getByRole('checkbox', { name: 'Chọn món 1' }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByText('✓ Đã nhập. File nguồn đã vào Thùng rác.')).toBeNull();
  });

  it('kéo thả lấy file.path, hiển thị tiến độ và lỗi phân tích mà không gọi nhập', async () => {
    const b = bridge([]); b.thungDoPhanTich.mockRejectedValue(new Error('Không đọc được nhạc'));
    render(<ThungDo />);
    fireEvent.drop(screen.getByTitle('Kéo file hoặc thư mục từ Explorer vào đây'), { dataTransfer: { files: [{ path: 'D:\\Thu nhac\\a.wav' }, { path: 'D:\\Thu nhac' }] } });
    fireEvent.click(screen.getByRole('button', { name: 'Phân tích' }));
    expect(screen.getByRole('progressbar', { name: 'Đang phân tích' })).toBeTruthy();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Không đọc được nhạc');
    expect(b.thungDoPhanTich).toHaveBeenCalledWith(['D:\\Thu nhac\\a.wav', 'D:\\Thu nhac']);
    expect(b.thungDoNhap).not.toHaveBeenCalled();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(1);
  });
});
