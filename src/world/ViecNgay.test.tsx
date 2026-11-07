import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ViecNgay from './ViecNgay';
import type { AccountView, AppsBridge, ViecChuTich } from '../apps/types';

const view = {
  geminiKeys: [], legacyKeys: 0, imageKey: '', sites: [{ id: 'flow', name: 'Google Flow', group: 'ai', plans: ['Free', 'Pro'], detect: true }],
  accounts: [
    { id: 'a1', label: 'tai-khoan-a', email: 'nguoi-dung@example.com', may: true, sites: { flow: { plan: 'Pro' } }, services: ['flow'], enabled: true, emails: {}, checks: {}, online: false, busy: 0, firstSeen: '',
      loi: [{ id: 'l1', dichVu: 'flow', viec: 'veo', thongBao: 'Tài khoản Flow đã hết tín dụng.', goiY: 'Chờ tín dụng hồi hoặc đổi tài khoản.', link: 'https://labs.google/fx/tools/flow', soLan: 1, dau: '2026-11-05T00:00:00Z', luc: '2026-11-05T00:00:00Z' }] },
  ],
} as unknown as AccountView;
const viec = (id: string, yeuCau: string): ViecChuTich => ({ id, luc: '2026-11-05T01:00:00Z', yeuCau, ghiChu: '', trangThai: 'cho-duyet', nguoiLam: 'Codex', ketQua: [{ text: 'Đã làm xong', link: '' }], ghiChuClaude: '', capNhat: '2026-11-05T02:00:00Z' });
const bridgeWith = (extra: Partial<AppsBridge> = {}, v: AccountView = view) =>
  ({ accounts: vi.fn(async () => v), onAccounts: vi.fn(() => () => {}), mayDangNhap: vi.fn(), openInAccount: vi.fn(async () => ({ dir: '', url: '' })), ...extra }) as unknown as AppsBridge;
afterEach(() => { delete window.manorApps; });

describe('Việc cần làm ngay', () => {
  it('mỗi lỗi tài khoản là một dòng riêng; bấm mở popup, nút lớn mở trang trong đúng profile', async () => {
    const bridge = bridgeWith();
    window.manorApps = bridge;
    render(<ViecNgay />);
    const orb = await screen.findByRole('button', { name: /Việc cần làm ngay/ });
    expect(orb.textContent).toContain('1');
    await userEvent.click(orb);
    expect(screen.queryByText(/tài khoản đang lỗi/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Lỗi Google Flow · tai-khoan-a' }));
    const dialog = screen.getByRole('dialog', { name: 'Lỗi Google Flow · tai-khoan-a' });
    expect(within(dialog).getByText('Tài khoản Flow đã hết tín dụng.')).toBeTruthy();
    expect(within(dialog).getByText(/Chờ tín dụng hồi/)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: /Mở trang trong profile tai-khoan-a/ }));
    expect(bridge.openInAccount).toHaveBeenCalledWith('a1', { url: 'https://labs.google/fx/tools/flow', cuaSo: false });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Để lại' }));
    expect(screen.queryByRole('dialog', { name: 'Lỗi Google Flow · tai-khoan-a' })).toBeNull();
  });

  it('Note gửi nhận xét giữ lỗi ở trạng thái mới; Submit báo đã xử lý', async () => {
    const accountErrorFeedback = vi.fn(async () => view);
    window.manorApps = bridgeWith({ accountErrorFeedback });
    render(<ViecNgay />);
    await userEvent.click(await screen.findByRole('button', { name: /Việc cần làm ngay/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Lỗi Google Flow · tai-khoan-a' }));
    const note = screen.getByRole('button', { name: 'Note' }) as HTMLButtonElement;
    expect(note.disabled).toBe(true);
    await userEvent.type(screen.getByLabelText('Nhận xét'), 'Dòng 1{Enter}Dòng 2');
    await userEvent.click(note);
    expect(accountErrorFeedback).toHaveBeenLastCalledWith('a1', 'l1', { daXuLy: false, nhanXet: 'Dòng 1\nDòng 2', giuMoi: true });
    await userEvent.click(screen.getByRole('button', { name: 'Lỗi Google Flow · tai-khoan-a' }));
    await userEvent.click(screen.getByRole('button', { name: /Submit/ }));
    expect(accountErrorFeedback).toHaveBeenLastCalledWith('a1', 'l1', { daXuLy: true, nhanXet: '' });
  });

  it('mỗi việc chờ duyệt một dòng; Submit chuyển "Chủ tịch đã duyệt" và nối nhận xét vào ghi chú', async () => {
    const list = [viec('v1', 'Làm khung việc cần làm ngay'), viec('v2', 'Chia launcher 5 nhóm')];
    const soViecLuu = vi.fn(async (input: Partial<ViecChuTich>) => ({ ...list.find(v => v.id === input.id)!, ...input }));
    window.manorApps = bridgeWith({ soViec: vi.fn(async () => list), onSoViec: vi.fn(() => () => {}), soViecLuu }, { ...view, accounts: [{ ...view.accounts[0], loi: [] }] });
    render(<ViecNgay />);
    const orb = await screen.findByRole('button', { name: /Việc cần làm ngay/ });
    await screen.findByText('2', { selector: 'b' });
    await userEvent.click(orb);
    expect(screen.getByRole('button', { name: /Việc chờ duyệt: Làm khung/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Việc chờ duyệt: Chia launcher/ }));
    await userEvent.type(screen.getByLabelText('Nhận xét'), 'Ổn');
    await userEvent.click(screen.getByRole('button', { name: /Submit/ }));
    expect(soViecLuu).toHaveBeenCalledWith(expect.objectContaining({ id: 'v2', trangThai: 'da-duyet', ghiChu: expect.stringMatching(/Chủ tịch: Ổn$/) }));
  });

  it('lỗi chờ Claude kiểm vẫn hiện thành dòng riêng, ghi rõ chờ kiểm', async () => {
    const acc = view.accounts[0];
    const two = { ...view, accounts: [
      { ...acc, loi: acc.loi!.map(e => ({ ...e, trangThai: 'cho-kiem' as const })) },
      { ...acc, id: 'a2', label: 'duy2', email: 'nguoi-dung@example.com' },
    ] } as AccountView;
    window.manorApps = bridgeWith({}, two);
    render(<ViecNgay />);
    const orb = await screen.findByRole('button', { name: /Việc cần làm ngay/ });
    expect(orb.textContent).toContain('2');
    await userEvent.click(orb);
    expect(screen.getByRole('button', { name: 'Lỗi Google Flow · duy2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lỗi Google Flow · tai-khoan-a' }).textContent).toContain('Chờ Claude kiểm lại');
    await userEvent.click(screen.getByRole('button', { name: 'Mở Sổ tài khoản' }));
    expect(await screen.findByRole('button', { name: 'Xem lỗi tài khoản tai-khoan-a' })).toBeTruthy();
  });
});
