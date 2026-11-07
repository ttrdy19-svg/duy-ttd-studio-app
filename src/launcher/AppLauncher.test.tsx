import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLauncher from './AppLauncher';
import { MINI_APPS, NHOM_APP } from './apps';
import TongDai, { TaiKhoanHanMuc } from '../apps/TongDai';
import type { TongDaiData } from '../apps/types';

describe('Bảng mini app', () => {
  it('đánh số liên tục, chọn app thì hiện giải thích và nút riêng, app chưa làm thì không bấm được', () => {
    const onAction = vi.fn();
    render(<AppLauncher onAction={onAction} onClose={() => {}} />);
    expect(MINI_APPS.map(app => app.no)).toEqual(MINI_APPS.map((_, i) => i + 1));
    fireEvent.click(screen.getByRole('button', { name: /01\s*Tạo ảnh 16:9/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập ChatGPT' }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'anh-mau' }), expect.objectContaining({ open: 'hall' }));
    fireEvent.click(screen.getByRole('button', { name: /05\s*Dựng MV 3D/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở app' }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'mv' }), expect.objectContaining({ open: 'mv' }));
    fireEvent.click(screen.getByRole('button', { name: /06\s*Nhép môi AI/ }));
    expect(screen.getAllByText(/25 giây/).length).toBeGreaterThan(0);
    expect((screen.getByRole('button', { name: 'Chưa bấm được' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /21\s*Thùng đồ/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở app' }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'thung-do' }), expect.objectContaining({ open: 'thung-do' }));
    fireEvent.click(screen.getByRole('button', { name: /24\s*Sức máy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở app' }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'suc-may' }), expect.objectContaining({ open: 'suc-may' }));
    fireEvent.click(screen.getByRole('button', { name: /25\s*Tổng đài/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở app' }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'tong-dai' }), expect.objectContaining({ open: 'tong-dai' }));
    expect(MINI_APPS).toHaveLength(25);
    expect(screen.queryByRole('button', { name: /Phòng họp/ })).toBeNull();
  });

  it('chia 5 nhóm có tiêu đề, giữ số cũ, mọi app đều có nhóm; có mục Cài đặt nền', () => {
    render(<AppLauncher onAction={() => {}} onClose={() => {}} />);
    expect(NHOM_APP).toHaveLength(5);
    for (const nhom of NHOM_APP) expect(screen.getByRole('heading', { name: nhom.ten })).toBeTruthy();
    expect(MINI_APPS.every(app => NHOM_APP.some(n => n.id === app.nhom))).toBe(true);
    const so = (nhom: string) => MINI_APPS.filter(a => a.nhom === nhom).map(a => a.no).sort((a, b) => a - b);
    expect(so('dieu-khien')).toEqual([9, 15, 16]);
    expect(so('kho')).toEqual([7, 12, 13, 14, 18, 21, 23]);
    expect(so('may')).toEqual([3, 4, 5, 10, 22, 24, 25]);
    expect(so('dich-vu')).toEqual([1, 2, 6, 8, 11, 20]);
    expect(so('giao-dien')).toEqual([17, 19]);
    const kho = screen.getByRole('region', { name: 'Kho' });
    expect(within(kho).getByRole('button', { name: /07\s*Kho nhạc/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /19\s*Cài đặt nền/ }));
    const onNen = vi.fn();
    render(<AppLauncher onAction={() => {}} onClose={() => {}} initial="cai-dat-nen" nen={{ cu3d: false, hieuUng: true }} onNen={onNen} />);
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Nền 3D cũ' }).at(-1)!);
    expect(onNen).toHaveBeenCalledWith({ cu3d: true, hieuUng: true });
  });
});

it('gộp tài khoản: đường cũ mở đúng thẻ, chuyển thẻ vẫn giữ đủ lối vào Sổ tài khoản', async () => {
  const truoc = window.manorApps;
  Object.defineProperty(window, 'manorApps', { configurable: true, value: undefined });
  const view = render(<TaiKhoanHanMuc initialTab="tong-dai" />);
  try {
    expect(screen.getByRole('tab', { name: 'Tổng đài' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Sổ tài khoản' }));
    expect(await screen.findByText('Sổ tài khoản cần bản Windows.')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Hạn mức' }));
    expect(screen.getByRole('tab', { name: 'Hạn mức' }).getAttribute('aria-selected')).toBe('true');
    view.rerender(<TaiKhoanHanMuc initialTab="so" />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Sổ tài khoản' }).getAttribute('aria-selected')).toBe('true'));
  } finally { view.unmount(); Object.defineProperty(window, 'manorApps', { configurable: true, value: truoc }); }
});

it('Tổng đài: hiện giờ nghỉ, sửa hàng, gọi lại và nhập số dư web qua IPC', async () => {
  const data: TongDaiData = { luc: Date.now(),
    tho: [{ id: 'codex-business', tinhTrang: 'nghi', nghiDen: Date.now() + 3600000, lyDo: 'Hết hạn mức', lanCuoi: null, homNay: { ok: 2, loi: 1, hetLuot: 1 } }],
    vai: { code: ['codex-business', 'copilot'] },
    web: [{ id: 'ma-an-danh', trang: 'flow', credits: 60, daDung: 0, ngay: '2026-11-07', lanCuoi: null }] };
  const tongDai = vi.fn().mockResolvedValue(data);
  const truoc = window.manorApps;
  Object.defineProperty(window, 'manorApps', { configurable: true, value: { tongDai } });
  const view = render(<TongDai />);
  try {
    await screen.findByText(/Nghỉ tới/);
    fireEvent.click(screen.getByRole('button', { name: 'Gọi lại ngay' }));
    await waitFor(() => expect(tongDai).toHaveBeenLastCalledWith({ action: 'goi-lai', id: 'codex-business' }));
    await waitFor(() => expect((screen.getByTitle('Đưa codex-business xuống một bậc') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getAllByRole('button', { name: 'Xuống' })[0]);
    await waitFor(() => expect(tongDai).toHaveBeenLastCalledWith({ action: 'vai', vai: 'code', hang: ['copilot', 'codex-business'] }));
    const input = screen.getByRole('spinbutton', { name: 'Tín dụng flow ma-an-danh' });
    fireEvent.change(input, { target: { value: '35' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(tongDai).toHaveBeenLastCalledWith({ action: 'web', id: 'ma-an-danh', trang: 'flow', soLieu: { credits: 35 } }));
  } finally { view.unmount(); Object.defineProperty(window, 'manorApps', { configurable: true, value: truoc }); }
});
