import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountView, AppsBridge } from '../apps/types';

// three.js không chạy được trong jsdom: thay lớp hạt bằng bản giả, đếm số lần dựng/huỷ.
const hat = vi.hoisted(() => ({ tao: vi.fn(), huy: vi.fn(), boQua: vi.fn(), capNhat: vi.fn() }));
vi.mock('./sach-hat', () => ({ taoHatSach: hat.tao.mockImplementation(() => ({ huy: hat.huy, boQua: hat.boQua, capNhat: hat.capNhat })) }));
import AccountBook from './AccountBook';
import { _quenWebGL, mauProfile, viTriChum } from './SachPhep';

const view: AccountView = {
  installDirectory: 'C:/ext', geminiKeys: [], legacyKeys: 0, imageKey: '',
  sites: [
    { id: 'flow', name: 'Google Flow', group: 'ai', plans: ['Free', 'Pro', 'Ultra'], detect: true },
    { id: 'dreamina', name: 'Dreamina', group: 'ai', plans: ['Free', 'Basic'], detect: true },
    { id: 'youtube', name: 'YouTube', group: 'publish', plans: ['Đã đăng nhập'], detect: true, channel: true },
    { id: 'distrokid', name: 'DistroKid', group: 'publish', plans: ['Musician'], detect: false },
  ],
  accounts: [
    { id: 'a1', label: 'tai-khoan-a', email: 'nguoi-dung@example.com', online: true, busy: 0, firstSeen: '', services: ['flow'], enabled: true, emails: {}, checks: {},
      sites: { flow: { plan: 'Pro', loggedIn: true, checkedAt: '2026-11-05T01:00:00Z', hanMuc: { ngay: '50 tín dụng' } }, dreamina: { plan: 'Free', loggedIn: false }, youtube: { plan: 'Đã đăng nhập', loggedIn: true, channel: 'Duy TTD Music', channels: [{ name: 'Duy TTD Music', handle: '@duyttd', selected: true }] } },
      credits: { dreamina: { credits: 260, loggedIn: true, at: '2026-11-05T02:00:00Z' } },
      loi: [{ id: 'l1', dichVu: 'flow', viec: 'veo', thongBao: 'Tài khoản Flow đã hết tín dụng.', soLan: 1, dau: '2026-11-05T00:00:00Z', luc: '2026-11-05T00:00:00Z', trangThai: 'moi' }] },
    { id: 'a2', label: 'Kênh phụ', email: '', online: false, busy: 0, firstSeen: '', services: [], enabled: true, emails: {}, checks: {}, sites: {} },
  ],
};
type Api = AppsBridge & Record<'accounts' | 'updateAccount' | 'checkAccount' | 'scanCredits' | 'openInAccount' | 'accountErrorFeedback', ReturnType<typeof vi.fn>>;
const bridge = () => ({
  accounts: vi.fn(async () => view), onAccounts: vi.fn(() => () => {}),
  updateAccount: vi.fn(async () => view), checkAccount: vi.fn(async () => view),
  scanCredits: vi.fn(async () => [{ id: 'a1', label: 'tai-khoan-a', dreamina: { credits: 260, loggedIn: true } }]),
  openInAccount: vi.fn(async () => ({ dir: 'Profile 1', url: '' })),
  accountErrorFeedback: vi.fn(async () => view),
}) as unknown as Api;
const coWebGLGia = () => vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue({} as never);

describe('Sổ tài khoản kiểu sách phép', () => {
  beforeEach(() => { localStorage.clear(); _quenWebGL(); hat.tao.mockClear(); hat.huy.mockClear(); hat.boQua.mockClear(); });
  afterEach(() => { delete window.manorApps; _quenWebGL(); vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null); });

  it('không có WebGL: tự rơi về dạng bảng cũ, nút sách phép bị khoá', async () => {
    window.manorApps = bridge();
    render(<AccountBook />);
    expect(await screen.findByDisplayValue('nguoi-dung@example.com')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Dạng sách phép/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(hat.tao).not.toHaveBeenCalled();
  });

  it('có WebGL: mở sách, bỏ qua hoạt cảnh, bấm chùm xem trang + hạn mức + lỗi, lưu hạn mức tay, Mở trang/Kiểm tra/Dò tín dụng, về bảng cũ', async () => {
    coWebGLGia();
    const api = bridge(); window.manorApps = api;
    render(<AccountBook />);
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ qua' }));
    expect(hat.tao).toHaveBeenCalledTimes(1);
    expect(hat.tao.mock.calls[0][1].chum).toHaveLength(2);
    expect(hat.boQua).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Bỏ qua' })).toBeNull();

    // Chùm: màu ổn định theo mã profile, tooltip đủ thông tin, chùm có lỗi thì nhấp nháy đỏ.
    const chum = screen.getByRole('button', { name: 'Mở tai-khoan-a' });
    expect(chum.className).toContain('co-loi');
    expect(chum.getAttribute('title')).toContain('nguoi-dung@example.com · 2 trang đã đăng nhập · đang mở · 1 lỗi tài khoản');
    expect(chum.style.getPropertyValue('--mau')).toBe(mauProfile('a1'));
    expect(screen.getByRole('button', { name: 'Mở Kênh phụ' }).className).not.toContain('co-loi');

    await userEvent.click(chum);
    const bang = screen.getByRole('dialog', { name: 'Tài khoản tai-khoan-a' });
    const flow = within(bang).getByRole('listitem', { name: 'Trang Google Flow' });
    expect(within(flow).getByText('Đã đăng nhập')).toBeTruthy();
    expect(within(flow).getByText('Gói Pro')).toBeTruthy();
    expect((within(flow).getByLabelText('Định mức/ngày Google Flow') as HTMLInputElement).value).toBe('50 tín dụng');
    const dreamina = within(bang).getByRole('listitem', { name: 'Trang Dreamina' });
    expect(within(dreamina).getByText('Mất đăng nhập')).toBeTruthy();
    expect(within(dreamina).getByText('260 tín dụng')).toBeTruthy();
    expect(within(bang).getByRole('listitem', { name: 'Trang YouTube' })).toBeTruthy();
    expect(within(bang).queryByRole('listitem', { name: 'Trang DistroKid' })).toBeNull();

    // Hạn mức nhập tay: chỉ gửi ô vừa sửa, vào đúng trang của đúng profile; ô không đổi thì không lưu.
    await userEvent.type(within(dreamina).getByLabelText('Hạn mức tháng Dreamina'), '3000 tín dụng');
    await userEvent.tab();
    expect(api.updateAccount).toHaveBeenCalledWith('a1', { site: { id: 'dreamina', hanMuc: { thang: '3000 tín dụng' } } });
    (within(flow).getByLabelText('Định mức/ngày Google Flow') as HTMLInputElement).focus(); await userEvent.tab();
    expect(api.updateAccount).toHaveBeenCalledTimes(1);

    await userEvent.click(within(flow).getByRole('button', { name: /Mở trang/ }));
    await waitFor(() => expect(api.openInAccount).toHaveBeenCalledWith('a1', { url: 'https://labs.google/fx/tools/flow', cuaSo: true }));
    await userEvent.click(within(within(bang).getByRole('listitem', { name: 'Trang YouTube' })).getByRole('button', { name: /Mở trang/ }));
    await waitFor(() => expect(api.openInAccount).toHaveBeenCalledWith('a1', { channel: { name: 'Duy TTD Music', handle: '@duyttd', selected: true }, cuaSo: true }));
    await userEvent.click(within(bang).getByRole('button', { name: /Kiểm tra/ }));
    expect(await screen.findByText(/Kiểm tra xong tai-khoan-a/)).toBeTruthy();
    expect(api.checkAccount).toHaveBeenCalledWith('a1');
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Tài khoản tai-khoan-a' })).getByRole('button', { name: /Dò tín dụng/ }));
    expect(await screen.findByText('✓ Dò tín dụng xong tai-khoan-a · Dreamina: 260.')).toBeTruthy();
    expect(api.scanCredits).toHaveBeenCalledWith(['a1']);

    // Lỗi "!": hộp chi tiết cl-011 ngay trong bảng, gửi phản hồi được.
    await userEvent.click(screen.getByRole('button', { name: 'Xem lỗi Google Flow của tai-khoan-a' }));
    const loi = screen.getByRole('dialog', { name: 'Lỗi tài khoản tai-khoan-a' });
    expect(within(loi).getByText('Tài khoản Flow đã hết tín dụng.')).toBeTruthy();
    await userEvent.click(within(loi).getByRole('button', { name: /Tao đã xử lý/ }));
    expect(api.accountErrorFeedback).toHaveBeenCalledWith('a1', 'l1', { daXuLy: true, nhanXet: '' });

    // Về dạng bảng cũ: nhớ lựa chọn, lần sau mở thẳng bảng.
    await userEvent.click(screen.getByRole('button', { name: /Dạng bảng cũ/ }));
    expect(await screen.findByDisplayValue('nguoi-dung@example.com')).toBeTruthy();
    expect(hat.huy).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('duy.so-tai-khoan')!).dang).toBe('bang');
  });

  it('tắt hoạt cảnh trong cài đặt: lần sau hiện ngay các chùm; chùm xếp trong khung', async () => {
    coWebGLGia();
    window.manorApps = bridge();
    const first = render(<AccountBook />);
    await userEvent.click(await screen.findByRole('checkbox', { name: /Hoạt cảnh mở sách/ }));
    expect(JSON.parse(localStorage.getItem('duy.so-tai-khoan')!).intro).toBe(false);
    first.unmount();
    render(<AccountBook />);
    expect(await screen.findByRole('button', { name: 'Mở tai-khoan-a' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Bỏ qua' })).toBeNull();
    expect(hat.tao.mock.calls.at(-1)![1].intro).toBe(false);
    for (const p of viTriChum(12)) { expect(p.x).toBeGreaterThan(5); expect(p.x).toBeLessThan(95); expect(p.y).toBeGreaterThan(10); expect(p.y).toBeLessThan(70); }
    expect(mauProfile('a1')).toBe(mauProfile('a1'));
    expect(mauProfile('a1')).not.toBe(mauProfile('a2'));
  });

  it('bảng chùm (cl-022): nút trang trắng gọi đúng profile, ô "Dùng làm gì" dưới tên trang lưu ngay, mail che bớt', async () => {
    coWebGLGia(); localStorage.setItem('duy.so-tai-khoan', JSON.stringify({ dang: 'sach', intro: false }));
    const api = { ...bridge(), openBlank: vi.fn(async () => ({ dir: 'May tai-khoan-a', url: '', since: 1 })), nhanTrang: vi.fn(async () => ({ view, them: [] })) } as unknown as Api & { openBlank: ReturnType<typeof vi.fn>; nhanTrang: ReturnType<typeof vi.fn> };
    window.manorApps = api;
    render(<AccountBook />);
    await userEvent.click(await screen.findByRole('button', { name: 'Mở tai-khoan-a' }));
    const bang = screen.getByRole('dialog', { name: 'Tài khoản tai-khoan-a' });
    expect(within(bang).getByText(/tt•••nguoi-dung@example.com/)).toBeTruthy();
    expect(within(bang).getByText('260')).toBeTruthy();
    await userEvent.click(within(bang).getByRole('button', { name: /Mở trang trắng để đăng nhập/ }));
    expect(api.openBlank).toHaveBeenCalledWith('a1');
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Tài khoản tai-khoan-a' })).getByRole('button', { name: /Xong, kiểm lại/ }));
    expect(await screen.findByText(/chưa thấy trang mới nào có đăng nhập/)).toBeTruthy();
    const flow = within(screen.getByRole('dialog', { name: 'Tài khoản tai-khoan-a' })).getByRole('listitem', { name: 'Trang Google Flow' });
    await userEvent.type(within(flow).getByLabelText('Dùng làm gì Google Flow của tai-khoan-a'), 'làm Veo MV');
    await userEvent.tab();
    await waitFor(() => expect(api.updateAccount).toHaveBeenCalledWith('a1', { site: { id: 'flow', dungLam: 'làm Veo MV' } }));
  });
});
