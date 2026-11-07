import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PhongHop, { PhongHopHome } from './PhongHop';
import type { PhongHopData } from './types';

function snapshot(): PhongHopData {
  return { config: { thanhVien: [
    { id: 'chu-tich', ten: 'Chủ tịch', bieuTuong: '🧑‍💼', vai: 'quyết' },
    { id: 'claude', ten: 'Mặc Trúc', bieuTuong: '🏮', vai: 'tổng quản' },
  ], thuTu: ['claude', 'codex', 'gemini', 'muse', 'copilot', 'claude'] },
  danhSach: [{ id: 'hop', tieuDe: 'Chia tài nguyên AI', trangThai: 'dang-hop', cu: false }],
  cuocHop: { id: 'hop', tieuDe: 'Chia tài nguyên AI', vong: 1, trangThai: 'dang-hop', dangNoi: { ai: 'claude', tu: Date.now() }, dong: [
    { id: 1, ai: 'chu-tich', luc: Date.now(), vong: 1, loai: 'ý mới', noiDung: 'Chọn việc cần làm', traLoi: null, quyetDinh: 'chu-tich', ghiChu: '' },
  ] } };
}
describe('Phòng họp qua cầu nối giả', () => {
  it('màn hình chính luôn có Phòng họp, mở được bảng việc khi chưa có cuộc họp', async () => {
    const { default: ManorWorld } = await import('../world/ManorWorld');
    const old = window.manorApps, data = snapshot();
    data.cuocHop = null; data.danhSach = []; data.dangHop = false; data.yCho = 0;
    Object.defineProperty(window, 'manorApps', { configurable: true, value: { phongHop: vi.fn().mockResolvedValue(data), onPhongHop: () => () => {}, onProject: () => () => {} } });
    localStorage.clear();
    const view = render(<ManorWorld />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Phòng họp · 0 ý chờ' }));
      await screen.findByText('Chọn cuộc họp cũ hoặc mở cuộc họp mới để bắt đầu.');
      expect(screen.getByRole('complementary', { name: 'Bảng việc thời gian thực' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Đóng Phòng họp' }));
      expect(screen.getByRole('button', { name: 'Phòng họp · 0 ý chờ' })).toBeTruthy();
    } finally { view.unmount(); Object.defineProperty(window, 'manorApps', { configurable: true, value: old }); localStorage.clear(); }
  });

  it('mở đúng phiên mới từ Tiên Nhỏ khi đang xem cuộc họp khác', async () => {
    const data = snapshot(), old = window.manorApps;
    let listener = (_d: PhongHopData) => {};
    const phongHop = vi.fn().mockImplementation(async ({ id }: { id?: string } = {}) => {
      const result = structuredClone(data);
      if (id === 'hop-moi') result.cuocHop = { ...result.cuocHop!, id, tieuDe: 'Kế hoạch MV mới' };
      return result;
    });
    Object.defineProperty(window, 'manorApps', { configurable: true, value: { phongHop, onPhongHop: (cb: typeof listener) => { listener = cb; return () => {}; } } });
    const view = render(<PhongHopHome />);
    try {
      await waitFor(() => expect(phongHop).toHaveBeenCalled());
      const incoming = structuredClone(data);
      incoming.cuocHop = { ...incoming.cuocHop!, id: 'hop-moi', tieuDe: 'Kế hoạch MV mới' };
      act(() => listener(incoming));
      view.rerender(<PhongHopHome openRequest={1} />);
      await screen.findByRole('heading', { name: 'Kế hoạch MV mới' });
      expect(phongHop).toHaveBeenLastCalledWith({ id: 'hop-moi' });
    } finally { view.unmount(); Object.defineProperty(window, 'manorApps', { configurable: true, value: old }); }
  });

  it('nút chính có chấm/số ý chờ, mở bảng cả khi không họp và đóng vẫn nhận trạng thái', async () => {
    const data = snapshot(); data.yCho = 3; data.dangHop = true;
    data.bangViec = [{ id: 'the:cl-043', noiDung: 'Đưa phòng họp ra ngoài', ai: 'codex', ma: 'cl-043', capNhat: Date.now(), xong: false }];
    const listeners = new Set<(d: PhongHopData) => void>(), old = window.manorApps;
    const phongHop = vi.fn().mockImplementation(async () => structuredClone(data));
    Object.defineProperty(window, 'manorApps', { configurable: true, value: { phongHop, onPhongHop: (cb: (d: PhongHopData) => void) => { listeners.add(cb); return () => listeners.delete(cb); } } });
    const view = render(<PhongHopHome />);
    try {
      const home = await screen.findByRole('button', { name: 'Phòng họp · 3 ý chờ' });
      expect(screen.getByLabelText('Đang họp')).toBeTruthy();
      fireEvent.click(home);
      await screen.findByText('Đưa phòng họp ra ngoài');
      const task = screen.getByRole('checkbox'); fireEvent.click(task);
      await waitFor(() => expect(phongHop).toHaveBeenLastCalledWith({ id: 'hop', action: 'viec-xong', viec: 'the:cl-043', xong: true }));
      fireEvent.click(screen.getByRole('button', { name: 'Đóng Phòng họp' }));
      expect(listeners.size).toBe(1);
      data.cuocHop = null; data.danhSach = []; data.yCho = 0; data.dangHop = false;
      data.bangViec[0].xong = true;
      act(() => listeners.forEach(cb => cb(structuredClone(data))));
      fireEvent.click(screen.getByRole('button', { name: 'Phòng họp · 0 ý chờ' }));
      await screen.findByText('Chọn cuộc họp cũ hoặc mở cuộc họp mới để bắt đầu.');
      expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
      expect(screen.getByRole('heading', { name: 'Đã hoàn thành' })).toBeTruthy();
      expect(screen.queryByLabelText('Đang họp')).toBeNull();
    } finally { view.unmount(); Object.defineProperty(window, 'manorApps', { configurable: true, value: old }); }
    expect(listeners.size).toBe(0);
  });

  it('Kết thúc / Giải tán gửi lệnh chốt, bảng việc vẫn nhận sự kiện cuộc khác', async () => {
    const data = snapshot(); let listener = (_d: PhongHopData) => {};
    const old = window.manorApps, phongHop = vi.fn().mockResolvedValue(data);
    Object.defineProperty(window, 'manorApps', { configurable: true, value: { phongHop, onPhongHop: (cb: typeof listener) => { listener = cb; return () => {}; } } });
    const view = render(<PhongHop />);
    try {
      await screen.findByRole('heading', { name: 'Chia tài nguyên AI' });
      fireEvent.click(screen.getByRole('button', { name: 'Kết thúc / Giải tán' }));
      await waitFor(() => expect(phongHop).toHaveBeenLastCalledWith({ id: 'hop', action: 'ket-thuc' }));
      const other = structuredClone(data); other.cuocHop!.id = 'khac';
      other.bangViec = [{ id: 'the:x', noiDung: 'Việc vừa xong', ai: 'claude', capNhat: Date.now(), xong: true }];
      act(() => listener(other));
      expect(screen.getByText('Việc vừa xong')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Chia tài nguyên AI' })).toBeTruthy();
    } finally { view.unmount(); Object.defineProperty(window, 'manorApps', { configurable: true, value: old }); }
  });

  it('nhận dòng thời gian thực, click xử lý OK/ghi chú, gửi ý Chủ tịch và gỡ listener khi đóng', async () => {
    const data = snapshot(); let listener: (data: PhongHopData) => void = () => {};
    const off = vi.fn(), phongHop = vi.fn().mockImplementation(async () => structuredClone(data));
    const old = window.manorApps;
    Object.defineProperty(window, 'manorApps', { configurable: true, value: { phongHop, onPhongHop: (cb: typeof listener) => { listener = cb; return off; } } });
    const view = render(<PhongHop />);
    try {
      await screen.findByRole('heading', { name: 'Chia tài nguyên AI' });
      expect(screen.getByText(/Đang nghĩ/)).toBeTruthy();
      data.cuocHop!.dangNoi = null;
      data.cuocHop!.dong.push({ id: 2, ai: 'claude', luc: Date.now(), vong: 1, loai: 'ý mới', noiDung: 'Chạy Shorts trước', traLoi: 1, quyetDinh: 'cho', ghiChu: '' });
      act(() => listener(structuredClone(data)));
      const log = screen.getByRole('log');
      fireEvent.click(within(log).getByText('Chạy Shorts trước'));
      let dialog = screen.getByRole('dialog', { name: 'Xử lý dòng #2' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'OK · Đã chốt' }));
      await waitFor(() => expect(phongHop).toHaveBeenLastCalledWith({ id: 'hop', action: 'quyet-dinh', dong: 2, quyetDinh: 'ok' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      fireEvent.click(within(log).getByText('Chạy Shorts trước'));
      dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Chi phí bao nhiêu?' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu ghi chú' }));
      await waitFor(() => expect(phongHop).toHaveBeenLastCalledWith({ id: 'hop', action: 'quyet-dinh', dong: 2, quyetDinh: 'ghi-chu', ghiChu: 'Chi phí bao nhiêu?' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      fireEvent.change(screen.getByRole('textbox', { name: 'Ý kiến Chủ tịch' }), { target: { value: 'Làm ngay' } });
      fireEvent.click(screen.getByRole('button', { name: 'Gửi ý kiến' }));
      await waitFor(() => expect(phongHop).toHaveBeenLastCalledWith({ id: 'hop', action: 'noi', noiDung: 'Làm ngay' }));
    } finally { view.unmount(); Object.defineProperty(window, 'manorApps', { configurable: true, value: old }); }
    expect(off).toHaveBeenCalledOnce();
  });

  it('mở lại hiện đủ các dòng; biên bản Markdown cũ chỉ đọc', async () => {
    const data = snapshot(); data.cuocHop = { ...data.cuocHop!, cu: true, markdown: '# Họp 06/11\nBiên bản cũ nguyên văn', trangThai: 'chi-doc' };
    const old = window.manorApps;
    Object.defineProperty(window, 'manorApps', { configurable: true, value: { phongHop: vi.fn().mockResolvedValue(data), onPhongHop: () => () => {} } });
    const view = render(<PhongHop />);
    try {
      await screen.findByText(/Biên bản cũ nguyên văn/);
      expect(screen.queryByRole('button', { name: 'Vòng mới' })).toBeNull();
      expect(screen.queryByRole('textbox', { name: 'Ý kiến Chủ tịch' })).toBeNull();
    } finally { view.unmount(); Object.defineProperty(window, 'manorApps', { configurable: true, value: old }); }
  });
});
