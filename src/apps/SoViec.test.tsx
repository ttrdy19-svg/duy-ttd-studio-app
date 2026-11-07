import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SoViec from './SoViec';
import ViecNgay from '../world/ViecNgay';
import type { AccountView, AppsBridge, ViecChuTich } from './types';

const viec = (id: string, yeuCau: string, trangThai: ViecChuTich['trangThai'], luc = '2026-11-04T00:00:00.000Z'): ViecChuTich =>
  ({ id, luc, yeuCau, ghiChu: '', trangThai, nguoiLam: 'Claude', ketQua: [], ghiChuClaude: '', capNhat: luc });

function bridge(list: ViecChuTich[]) {
  let data = [...list];
  const value = {
    soViec: vi.fn(async () => data),
    soViecLuu: vi.fn(async (input: Partial<ViecChuTich>) => {
      const cu = data.find(v => v.id === input.id);
      const v = { ...(cu ?? viec(`n${data.length}`, '', 'cho', '2026-11-05T10:00:00.000Z')), ...input, capNhat: new Date().toISOString() } as ViecChuTich;
      data = cu ? data.map(x => x.id === v.id ? v : x) : [v, ...data];
      return v;
    }),
    soViecXoa: vi.fn(async (id: string) => { data = data.map(v => v.id === id ? { ...v, trangThai: 'bo' as const } : v); return data.find(v => v.id === id)!; }),
    soViecNhap: vi.fn(async () => ({ viec: data, them: 0 })),
    onSoViec: vi.fn(() => () => {}),
    moLink: vi.fn(),
  } as unknown as AppsBridge;
  window.manorApps = value;
  return value;
}
afterEach(() => { delete window.manorApps; });

describe('Sổ việc chủ tịch', () => {
  it('lọc theo trạng thái, tìm, thêm việc nhanh rồi mở chi tiết', async () => {
    const b = bridge([viec('a', 'Gộp nhánh cloud vào main', 'da-duyet'), viec('b', 'MV Mặc gió đưa đi', 'cho-duyet'), viec('c', 'Gộp ổ G vào E', 'bo')]);
    render(<SoViec />);
    expect(await screen.findByText('MV Mặc gió đưa đi')).toBeTruthy();
    // "Tất cả" ẩn việc đã bỏ.
    expect(screen.queryByText('Gộp ổ G vào E')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: /Xong, chờ chủ tịch duyệt/ }));
    expect(screen.queryByText('Gộp nhánh cloud vào main')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: /^Bỏ/ }));
    expect(screen.getByText('Gộp ổ G vào E')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: /Tất cả/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tìm việc' }), 'cloud');
    expect(screen.getByText('Gộp nhánh cloud vào main')).toBeTruthy();
    expect(screen.queryByText('MV Mặc gió đưa đi')).toBeNull();
    await userEvent.clear(screen.getByRole('textbox', { name: 'Tìm việc' }));

    await userEvent.type(screen.getByRole('textbox', { name: 'Việc mới' }), 'Làm intro 5 giây{Enter}');
    expect(b.soViecLuu).toHaveBeenCalledWith({ yeuCau: 'Làm intro 5 giây' });
    const chiTiet = await screen.findByRole('complementary', { name: 'Chi tiết việc' });
    expect((within(chiTiet).getByLabelText(/Yêu cầu của chủ tịch/) as HTMLTextAreaElement).value).toBe('Làm intro 5 giây');
    expect((screen.getByRole('textbox', { name: 'Việc mới' }) as HTMLInputElement).value).toBe('');
  });

  it('sửa ghi chú, chủ tịch duyệt, bỏ việc (không xoá hẳn)', async () => {
    const b = bridge([viec('b', 'MV Mặc gió đưa đi', 'cho-duyet')]);
    render(<SoViec />);
    await userEvent.click(await screen.findByText('MV Mặc gió đưa đi'));
    const chiTiet = screen.getByRole('complementary', { name: 'Chi tiết việc' });
    await userEvent.type(within(chiTiet).getByLabelText('Ghi chú thêm của chủ tịch'), 'cún to hơn');
    await userEvent.click(within(chiTiet).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(b.soViecLuu).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', ghiChu: 'cún to hơn' })));
    await userEvent.click(within(screen.getByRole('complementary', { name: 'Chi tiết việc' })).getByRole('button', { name: /Chủ tịch duyệt/ }));
    await waitFor(() => expect(b.soViecLuu).toHaveBeenLastCalledWith({ id: 'b', trangThai: 'da-duyet' }));
    await userEvent.click(within(screen.getByRole('complementary', { name: 'Chi tiết việc' })).getByRole('button', { name: /Bỏ việc/ }));
    await waitFor(() => expect(b.soViecXoa).toHaveBeenCalledWith('b'));
  });

  it('màn hình chính: mỗi việc chờ duyệt một dòng trong Việc cần làm ngay, có nút mở Sổ việc', async () => {
    const view = { geminiKeys: [], legacyKeys: 0, imageKey: '', sites: [], accounts: [] } as unknown as AccountView;
    const b = bridge([viec('b', 'MV Mặc gió đưa đi', 'cho-duyet'), viec('d', 'MV hàng hải', 'cho-duyet'), viec('a', 'Gộp nhánh', 'da-duyet')]);
    Object.assign(b, { accounts: vi.fn(async () => view), onAccounts: vi.fn(() => () => {}), mayDangNhap: vi.fn() });
    const onSoViec = vi.fn();
    render(<ViecNgay onSoViec={onSoViec} />);
    const orb = await screen.findByRole('button', { name: /Việc cần làm ngay/ });
    await waitFor(() => expect(orb.textContent).toContain('2'));
    await userEvent.click(orb);
    expect(screen.getByRole('button', { name: /Việc chờ duyệt: MV Mặc gió đưa đi/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Việc chờ duyệt: MV hàng hải/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Việc chờ duyệt: Gộp nhánh/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Mở Sổ việc' }));
    expect(onSoViec).toHaveBeenCalled();
  });
});
