import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AccountBook from './AccountBook';
import type { AccountView, AppsBridge } from '../apps/types';

const view: AccountView = {
  installDirectory: 'C:/Users/a/AppData/Roaming/ai-manor-studio/manor-extension', geminiKeys: ['AIzaSy…abcd'], legacyKeys: 20, imageKey: '',
  sites: [
    { id: 'flow', name: 'Google Flow', group: 'ai', plans: ['Free', 'Pro', 'Ultra'], detect: true },
    { id: 'chatgpt', name: 'ChatGPT', group: 'ai', plans: ['Free', 'Go', 'Plus', 'Pro'], detect: true },
    { id: 'youtube', name: 'YouTube', group: 'publish', plans: ['Đã đăng nhập'], detect: true, channel: true },
    { id: 'distrokid', name: 'DistroKid', group: 'publish', plans: ['Musician', 'Musician Plus', 'Ultimate'], detect: false },
    { id: 'c-1', name: 'Kling', group: 'custom', plans: ['Free', 'Trả phí'], detect: false },
  ],
  accounts: [
    { id: 'a1', label: 'tai-khoan-a', email: 'nguoi-dung@example.com', sites: { flow: { plan: 'Pro', loggedIn: true }, chatgpt: { plan: 'Plus', loggedIn: false, until: '2020-01-02' }, youtube: { plan: 'Đã đăng nhập', loggedIn: true, channel: 'Duy TTD Music', channels: [{ name: 'Duy TTD Music', handle: '@duyttd', selected: true }, { name: 'Lofi Đêm', handle: '@lofidem', selected: false }] } }, services: ['flow'], enabled: true, emails: { flow: 'nguoi-dung@example.com' }, checks: {}, online: true, busy: 0, firstSeen: '' },
    { id: 'a2', label: 'Profile mới 2', email: '', sites: { flow: { plan: 'Free' } }, services: [], enabled: true, emails: {}, checks: {}, online: false, busy: 0, firstSeen: '' },
  ],
};
afterEach(() => { delete window.manorApps; });

describe('Sổ tài khoản', () => {
  it('bảng profile × trang: gói đăng ký, trạng thái đăng nhập, chạy việc, thêm trang; chỉ hiện key đã che', async () => {
    const api = {
      accounts: vi.fn(async () => view), onAccounts: vi.fn(() => () => {}),
      updateAccount: vi.fn(async () => view), checkAccount: vi.fn(async () => view), removeAccount: vi.fn(async () => view),
      addSite: vi.fn(async () => view), removeSite: vi.fn(async () => view),
      addGeminiKeys: vi.fn(async () => view), removeGeminiKey: vi.fn(async () => view), setImageKey: vi.fn(async () => view), openExtensionFolder: vi.fn(async () => ''),
    } as unknown as AppsBridge;
    window.manorApps = api;
    render(<AccountBook />);
    expect(await screen.findByDisplayValue('nguoi-dung@example.com')).toBeTruthy();
    expect(screen.getByText(/manor-extension/)).toBeTruthy();
    expect(screen.getByText('Google Flow: 1 Pro, 1 Free · ChatGPT: 1 Plus · YouTube: 1 tài khoản')).toBeTruthy();
    expect(screen.queryByLabelText('YouTube của tai-khoan-a')).toBeNull();
    expect(screen.getByText('Duy TTD Music', { selector: '.hall-channel' })).toBeTruthy();
    expect(screen.queryByText(/Premium|Thường/)).toBeNull();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].className).toBe('online');
    expect((within(rows[1]).getByRole('button', { name: /Kiểm tra/ }) as HTMLButtonElement).disabled).toBe(true);

    const flow = screen.getByLabelText('Google Flow của tai-khoan-a') as HTMLSelectElement;
    expect(flow.value).toBe('Pro');
    expect(flow.closest('td')!.className).toContain('ok');
    expect(screen.getByLabelText('ChatGPT của tai-khoan-a').closest('td')!.className).toContain('lost');
    await userEvent.selectOptions(screen.getByLabelText('DistroKid của tai-khoan-a'), 'Musician Plus');
    expect(api.updateAccount).toHaveBeenCalledWith('a1', { site: { id: 'distrokid', plan: 'Musician Plus' } });
    await userEvent.selectOptions(screen.getByLabelText('ChatGPT của tai-khoan-a'), '');
    expect(api.updateAccount).toHaveBeenCalledWith('a1', { site: { id: 'chatgpt', plan: null } });

    const work = within(rows[0]).getAllByRole('checkbox', { name: 'chạy việc' });
    await userEvent.click(work[1]);
    expect(api.updateAccount).toHaveBeenCalledWith('a1', { services: ['flow', 'chatgpt'] });
    await userEvent.click(within(rows[0]).getByRole('button', { name: /Kiểm tra/ }));
    expect(api.checkAccount).toHaveBeenCalledWith('a1');

    await userEvent.type(screen.getByLabelText('Tên trang mới'), 'Hailuo');
    await userEvent.click(screen.getByRole('button', { name: /Thêm trang/ }));
    await waitFor(() => expect(api.addSite).toHaveBeenCalledWith('Hailuo'));
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ trang Kling' }));
    expect(api.removeSite).toHaveBeenCalledWith('c-1');

    // Hàng chi tiết: hạn gói, tự gia hạn, ghi chú, tên kênh đọc tự động; gói hết hạn hiện nhắc ở đầu bảng.
    expect(screen.getByRole('status').textContent).toContain('tai-khoan-a · ChatGPT đã hết hạn');
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết tai-khoan-a' }));
    const youtube = screen.getByRole('group', { name: 'Chi tiết YouTube' });
    const channel = within(youtube).getByLabelText('Kênh dùng để đăng') as HTMLSelectElement;
    expect(channel.value).toBe('Duy TTD Music');
    expect(within(youtube).getByText('Mail này có 2 kênh')).toBeTruthy();
    await userEvent.selectOptions(channel, 'Lofi Đêm');
    expect(api.updateAccount).toHaveBeenCalledWith('a1', { site: { id: 'youtube', channel: 'Lofi Đêm' } });
    const chat = screen.getByRole('group', { name: 'Chi tiết ChatGPT' });
    await userEvent.selectOptions(within(chat).getByLabelText('Tự gia hạn'), 'true');
    expect(api.updateAccount).toHaveBeenCalledWith('a1', { site: { id: 'chatgpt', autoRenew: true } });
    await userEvent.type(screen.getByLabelText('Ghi chú profile'), 'chỉ làm YT');
    await userEvent.tab();
    expect(api.updateAccount).toHaveBeenCalledWith('a1', { note: 'chỉ làm YT' });

    // Trang khác đăng nhập bằng Google: thêm từ chi tiết profile rồi quét luôn.
    await userEvent.type(screen.getByLabelText('Thêm trang cho tai-khoan-a'), 'klingai.com');
    await userEvent.click(screen.getByRole('button', { name: /Thêm & quét/ }));
    await waitFor(() => expect(api.addSite).toHaveBeenCalledWith('klingai.com', 'a1'));
    await waitFor(() => expect(api.checkAccount).toHaveBeenCalledTimes(2));

    expect(screen.getByText('AIzaSy…abcd')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Thêm key Gemini'), 'AIzaSyNEWKEY_xxxxxxxxxxxxxxxxxxxx');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    await waitFor(() => expect(api.addGeminiKeys).toHaveBeenCalledWith('AIzaSyNEWKEY_xxxxxxxxxxxxxxxxxxxx'));
  });

  it('lỗi tài khoản: dấu "!" cạnh tên và ô dịch vụ, bấm thấy chi tiết + cách gỡ + link + ô nhận xét; "Tao đã xử lý" → chờ Claude kiểm (vàng), không xoá', async () => {
    const loi = [
      { id: 'l1', dichVu: 'flow', viec: 'veo', thongBao: 'Tài khoản Flow đã hết tín dụng.', goiY: 'Chờ tín dụng reset 07:57.', link: 'https://flow.google.com/', soLan: 3, dau: '2026-11-05T00:00:00Z', luc: '2026-11-05T01:00:00Z', trangThai: 'moi', daOnLai: '2026-11-05T02:00:00Z' },
      { id: 'l2', dichVu: 'chatgpt', viec: 'anh', thongBao: 'ChatGPT: không thấy ô nhập.', link: 'https://chatgpt.com/', soLan: 1, dau: '2026-11-05T00:00:00Z', luc: '2026-11-05T00:30:00Z', trangThai: 'moi', kiemLai: { luc: '2026-11-05T03:00:00Z', ketQua: 'van-loi', ghiChu: 'Ô nhập vẫn không hiện.' } },
    ];
    const withErrors = { ...view, accounts: [{ ...view.accounts[0], loi }, view.accounts[1]] } as AccountView;
    const answered = { ...view, accounts: [{ ...view.accounts[0], loi: loi.map(e => ({ ...e, trangThai: 'cho-kiem', phanHoi: { luc: '2026-11-05T04:00:00Z', daXuLy: true, nhanXet: '' } })) }, view.accounts[1]] } as AccountView;
    const api = {
      accounts: vi.fn(async () => withErrors), onAccounts: vi.fn(() => () => {}),
      accountErrorFeedback: vi.fn(async () => answered),
      openInAccount: vi.fn(async () => ({ dir: 'Profile 1', url: 'https://flow.google.com/' })),
    } as unknown as AppsBridge;
    window.manorApps = api;
    render(<AccountBook />);
    const mark = await screen.findByRole('button', { name: 'Xem lỗi tài khoản tai-khoan-a' });
    expect(mark.getAttribute('title')).toContain('2 lỗi tài khoản. Mới nhất: Tài khoản Flow đã hết tín dụng.');
    expect(screen.getByRole('button', { name: 'Xem lỗi Google Flow của tai-khoan-a' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Xem lỗi .*Profile mới 2/ })).toBeNull();

    // Bấm dấu ở ô Flow: chỉ lỗi Flow, có việc, số lần, cách gỡ.
    await userEvent.click(screen.getByRole('button', { name: 'Xem lỗi Google Flow của tai-khoan-a' }));
    let box = screen.getByRole('dialog', { name: 'Lỗi tài khoản tai-khoan-a' });
    expect(within(box).getByText('Tài khoản Flow đã hết tín dụng.')).toBeTruthy();
    expect(within(box).getByText('Video Veo (Flow)')).toBeTruthy();
    expect(within(box).getByText(/3 lần/)).toBeTruthy();
    expect(within(box).getByText('Cách gỡ: Chờ tín dụng reset 07:57.')).toBeTruthy();
    expect(within(box).queryByText('ChatGPT: không thấy ô nhập.')).toBeNull();
    expect(within(box).getByText(/Có vẻ đã ổn lại lúc/)).toBeTruthy();
    expect(within(box).queryByRole('button', { name: /xoá/i })).toBeNull();
    // Link mở trong đúng profile của tài khoản (không mở trình duyệt khác).
    await userEvent.click(within(box).getByRole('button', { name: /Mở trang gỡ lỗi: https:\/\/flow\.google\.com\// }));
    expect(api.openInAccount).toHaveBeenCalledWith('a1', { url: 'https://flow.google.com/', cuaSo: false });
    // Gửi nhận xét chưa có chữ thì khoá; "Tao đã xử lý" gửi kèm nhận xét.
    expect((within(box).getByRole('button', { name: 'Gửi nhận xét' }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(within(box).getByRole('textbox', { name: 'Nhận xét lỗi Google Flow' }), 'Đã nạp thêm');
    await userEvent.click(within(box).getByRole('button', { name: /Tao đã xử lý/ }));
    expect((api as unknown as { accountErrorFeedback: unknown }).accountErrorFeedback).toHaveBeenCalledWith('a1', 'l1', { daXuLy: true, nhanXet: 'Đã nạp thêm' });
    // Không tự đóng / không mất lỗi: hộp vẫn còn, lỗi hiện "Chờ Claude kiểm lại", dấu vàng.
    box = await screen.findByRole('dialog', { name: 'Lỗi tài khoản tai-khoan-a' });
    expect(within(box).getByText('Tài khoản Flow đã hết tín dụng.')).toBeTruthy();
    expect(within(box).getByText('Chờ Claude kiểm lại')).toBeTruthy();
    const mark2 = screen.getByRole('button', { name: 'Xem lỗi tài khoản tai-khoan-a' });
    expect(mark2.className).toContain('cho-kiem');
    expect(mark2.getAttribute('title')).toContain('Chờ Claude kiểm lại');

    // Dấu cạnh tên: mọi lỗi của tài khoản, kèm ghi chú Claude "vẫn lỗi".
    await userEvent.click(screen.getByRole('button', { name: 'Xem lỗi tài khoản tai-khoan-a' }));
    box = screen.getByRole('dialog', { name: 'Lỗi tài khoản tai-khoan-a' });
    expect(within(box).getByText('ChatGPT: không thấy ô nhập.')).toBeTruthy();
    expect(within(box).getByText(/vẫn lỗi\. Ô nhập vẫn không hiện\./)).toBeTruthy();
  });

  it('mở trang trong profile thật: ghi trang vào sổ và báo; profile chưa có tiện ích thì có nút cài; Kiểm tra xong báo trang đã đăng nhập', async () => {
    const api = {
      accounts: vi.fn(async () => view), onAccounts: vi.fn(() => () => {}),
      checkAccount: vi.fn(async () => view), addSite: vi.fn(async () => view), openExtensionFolder: vi.fn(async () => ''),
      browserProfiles: vi.fn(async () => [{ dir: 'Profile 1', name: 'tai-khoan-a' }, { dir: 'Profile 9', name: 'Kênh mới' }]),
      openInProfile: vi.fn(async () => true),
    } as unknown as AppsBridge;
    window.manorApps = api;
    render(<AccountBook />);
    const input = await screen.findByLabelText('Trang mở trong tai-khoan-a');
    await userEvent.type(input, 'suno.com{Enter}');
    await waitFor(() => expect(api.openInProfile).toHaveBeenCalledWith('Profile 1', 'https://suno.com', false));
    expect(api.addSite).toHaveBeenCalledWith('https://suno.com', 'a1');
    expect((await screen.findByText(/Đã thêm trang suno\.com vào profile tai-khoan-a/)).getAttribute('role')).toBe('status');

    const row = screen.getByLabelText('Trang mở trong Kênh mới').closest('li') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: /Cài tiện ích/ }));
    await waitFor(() => expect(api.openInProfile).toHaveBeenCalledWith('Profile 9', 'coccoc://extensions/', false));
    expect(api.openExtensionFolder).not.toHaveBeenCalled();
    expect(await screen.findByText(/Đã mở trang tiện ích trong profile Kênh mới/)).toBeTruthy();
    expect(within(screen.getByLabelText('Trang mở trong tai-khoan-a').closest('li') as HTMLElement).queryByRole('button', { name: /Cài tiện ích/ })).toBeNull();

    await userEvent.click(within(screen.getAllByRole('row')[1]).getByRole('button', { name: /Kiểm tra/ }));
    expect(await screen.findByText('✓ Kiểm tra xong tai-khoan-a: đã đăng nhập Google Flow, YouTube.')).toBeTruthy();
  });

  it('thẻ profile (cl-022): mail che bớt, dãy biểu tượng trang, trang trắng gọi đúng profile, Xong kiểm lại nhận trang lạ, lưu "Dùng làm gì"', async () => {
    const after: AccountView = { ...view, sites: [...view.sites, { id: 'c-suno', name: 'suno.com', group: 'custom', plans: ['Free'], detect: true, scans: true, url: 'https://suno.com/' }],
      accounts: [{ ...view.accounts[0], sites: { ...view.accounts[0].sites, 'c-suno': { plan: 'Free', loggedIn: true, checkedAt: '2026-11-05T05:10:00.000Z' } } }, view.accounts[1]] };
    const api = {
      accounts: vi.fn(async () => view), onAccounts: vi.fn(() => () => {}), updateAccount: vi.fn(async () => view),
      openBlank: vi.fn(async () => ({ dir: 'May tai-khoan-a', url: '', since: 1 })),
      nhanTrang: vi.fn(async () => ({ view: after, them: ['suno.com'] })),
    } as unknown as AppsBridge;
    window.manorApps = api;
    render(<AccountBook />);
    const the = await screen.findByRole('article', { name: 'Thẻ tai-khoan-a' });
    expect(within(the).getByText('tt•••nguoi-dung@example.com')).toBeTruthy();
    expect(within(the).queryByText('nguoi-dung@example.com')).toBeNull();
    expect(within(the).getByLabelText('Google Flow: đã đăng nhập').className).toContain('ok');
    expect(within(the).getByLabelText('ChatGPT: mất đăng nhập').className).toContain('chua');
    expect(within(the).getByLabelText('DistroKid: chưa đăng nhập').className).toContain('chua');

    await userEvent.click(within(the).getByRole('button', { name: /Mở trang trắng để đăng nhập/ }));
    expect(api.openBlank).toHaveBeenCalledWith('a1');
    expect(await screen.findByText(/Đã mở tab trắng trong profile máy "May tai-khoan-a" của tai-khoan-a/)).toBeTruthy();
    // Profile đang tắt: "Xong, kiểm lại" khoá (tiện ích chưa nối thì không hỏi được).
    const the2 = screen.getByRole('article', { name: 'Thẻ Profile mới 2' });
    expect((within(the2).getByRole('button', { name: /Xong, kiểm lại/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(the2).getByLabelText('Google Flow: chưa đăng nhập').className).toContain('chua');
    await userEvent.click(within(the2).getByRole('button', { name: /Mở trang trắng/ }));
    expect(api.openBlank).toHaveBeenLastCalledWith('a2');

    await userEvent.click(within(the).getByRole('button', { name: /Xong, kiểm lại/ }));
    expect(api.nhanTrang).toHaveBeenCalledWith('a1');
    expect(await screen.findByText(/tai-khoan-a: đã nhận suno.com/)).toBeTruthy();
    const moi = screen.getByRole('article', { name: 'Thẻ tai-khoan-a' });
    expect(within(moi).getByLabelText('suno.com: đã đăng nhập').className).toContain('ok');
    expect(within(moi).getByText(/Đã đăng nhập · \d{2}:\d{2} \d{2}-\d{2}/)).toBeTruthy();

    await userEvent.type(within(moi).getByLabelText('Dùng làm gì suno.com của tai-khoan-a'), 'tạo nhạc demo{Enter}');
    await waitFor(() => expect(api.updateAccount).toHaveBeenCalledWith('a1', { site: { id: 'c-suno', dungLam: 'tạo nhạc demo' } }));
  });
});
