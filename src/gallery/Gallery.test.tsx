import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Gallery from './Gallery';
import type { AccountView, LiveMeta } from '../apps/types';

afterEach(() => { delete (window as unknown as { manorApps?: unknown }).manorApps; });
// jsdom không có PointerEvent nên sự kiện con trỏ mất tọa độ.
if (!('PointerEvent' in window)) (window as unknown as { PointerEvent: unknown }).PointerEvent = class extends MouseEvent { pointerId = 1; };

const view = {
  installDirectory: '', geminiKeys: [], legacyKeys: 0, imageKey: '', sites: [],
  accounts: [
    { id: 'a1', label: 'Mail chính', email: 'nguoi-dung@example.com', sites: { youtube: { plan: 'Đã đăng nhập', loggedIn: true, channel: 'Mộc Ngư Quán' } }, services: [], enabled: true, emails: {}, checks: {}, online: true, busy: 0, firstSeen: '' },
    { id: 'a2', label: 'Mail phụ', email: 'nguoi-dung@example.com', sites: { youtube: { plan: 'Đã đăng nhập', loggedIn: true, channel: 'Xing', channels: [
      { name: 'Xing', handle: '@xing', selected: true }, { name: 'Duy TTD', handle: '@duyttd', selected: false }, { name: 'Kênh phụ', handle: '@phu', selected: false }] } }, services: [], enabled: true, emails: {}, checks: {}, online: false, busy: 0, firstSeen: '' },
  ],
} as unknown as AccountView;

it('Phòng trưng bày: chọn YouTube, chọn kênh, trang mở thành cửa sổ trong app nhận hình, chuột, chữ và điều hướng', async () => {
  let frame: (f: { id: string; data: string }) => void = () => {}, meta: (m: LiveMeta) => void = () => {};
  const api = {
    accounts: vi.fn(async () => view), onAccounts: vi.fn(() => () => {}),
    openLive: vi.fn(async () => 'live-1'), liveInput: vi.fn(async () => {}), closeLive: vi.fn(async () => {}),
    openInAccount: vi.fn(async () => ({ dir: 'Profile 2', url: 'https://studio.youtube.com/channel/x' })),
    onLiveFrame: vi.fn(cb => { frame = cb; return () => {}; }), onLiveMeta: vi.fn(cb => { meta = cb; return () => {}; }),
  };
  (window as unknown as { manorApps: unknown }).manorApps = api;
  render(<Gallery />);
  fireEvent.click(await screen.findByRole('button', { name: /^YouTube:/ }));
  const pick = screen.getByRole('dialog', { name: 'Chọn tài khoản YouTube' });
  expect(pick.textContent).toContain('Mộc Ngư Quán');
  // Chỉ hiện 5 kênh dùng: kênh phụ bị bỏ; kênh chưa profile nào có thì báo.
  expect(pick.textContent).not.toContain('Kênh phụ');
  expect(pick.textContent).toContain('Chưa thấy kênh: Người Hát Rong VN, The Wayfaring Bard');
  // Kênh không đang chọn của profile ngoại tuyến: không chiếu trong app được, nhưng mở thẳng ở Cốc Cốc được (đúng kênh đó).
  const duy = screen.getByText('Duy TTD').closest('li') as HTMLElement;
  expect((duy.querySelector('button:last-child') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(duy.querySelector('button') as HTMLButtonElement);
  await waitFor(() => expect(api.openInAccount).toHaveBeenCalledWith('a2', { channel: { name: 'Duy TTD', handle: '@duyttd', selected: false }, cuaSo: true }));
  const moc = screen.getByText('Mộc Ngư Quán').closest('li') as HTMLElement;
  fireEvent.click(moc.querySelector('button:last-child') as HTMLButtonElement);
  await waitFor(() => expect(api.openLive).toHaveBeenCalledWith('a1', 'https://studio.youtube.com/'));
  expect(await screen.findByText('Đang mở trang…')).toBeTruthy();
  const live = screen.getByRole('dialog', { name: 'Cửa sổ YouTube · Mộc Ngư Quán' });
  expect(live.parentElement).toBe(document.body);
  act(() => { frame({ id: 'live-1', data: 'AAAA' }); meta({ id: 'live-1', url: 'https://studio.youtube.com/channel/x', title: 'Studio' }); });
  expect((screen.getByAltText('Trang Studio') as HTMLImageElement).src).toContain('data:image/jpeg;base64,AAAA');
  expect((screen.getByLabelText('Địa chỉ trang') as HTMLInputElement).value).toBe('https://studio.youtube.com/channel/x');

  const screenBox = live.querySelector('.live-screen') as HTMLElement;
  screenBox.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 400, right: 640, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
  screenBox.setPointerCapture = () => {};
  fireEvent.pointerDown(screenBox, { clientX: 320, clientY: 200, button: 0 });
  expect(api.liveInput).toHaveBeenCalledWith('live-1', expect.objectContaining({ kind: 'mouse', type: 'mousePressed', x: 640, y: 400, button: 'left' }));
  const keys = screen.getByLabelText('Gõ vào trang') as HTMLTextAreaElement;
  keys.value = 'Đêm trăng'; fireEvent.input(keys);
  expect(api.liveInput).toHaveBeenCalledWith('live-1', { kind: 'text', text: 'Đêm trăng' });
  fireEvent.keyDown(keys, { key: 'Backspace', code: 'Backspace', keyCode: 8 });
  expect(api.liveInput).toHaveBeenCalledWith('live-1', expect.objectContaining({ kind: 'key', type: 'rawKeyDown', key: 'Backspace' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại trang' }));
  expect(api.liveInput).toHaveBeenCalledWith('live-1', { kind: 'nav', action: 'reload' });
  fireEvent.click(screen.getByRole('button', { name: 'Đóng cửa sổ' }));
  expect(screen.queryByRole('dialog', { name: /Cửa sổ YouTube/ })).toBeNull();
  expect(api.closeLive).toHaveBeenCalledWith('live-1');
});

it('một kênh hiện ở nhiều profile (tài khoản Google phụ) thì chỉ giữ dòng ở profile chính có handle', async () => {
  const many = { ...view, accounts: [
    { ...view.accounts[0], id: 'x', label: 'Xing', sites: { youtube: { plan: 'Đã đăng nhập', loggedIn: true, channel: 'Xing', channels: [{ name: 'Xing', handle: '@Xing8424', selected: true }, { name: 'Mộc Ngư Quán', handle: '', selected: false }] } } },
    { ...view.accounts[0], id: 'm', label: 'tai-khoan-b', sites: { youtube: { plan: 'Đã đăng nhập', loggedIn: true, channel: 'Mộc Ngư Quán', channels: [{ name: 'Mộc Ngư Quán', handle: '@MocNguQuan', selected: true }] } } },
  ] } as unknown as AccountView;
  (window as unknown as { manorApps: unknown }).manorApps = { accounts: vi.fn(async () => many), onAccounts: vi.fn(() => () => {}) };
  render(<Gallery />);
  fireEvent.click(await screen.findByRole('button', { name: /^YouTube:/ }));
  const rows = screen.getAllByText('Mộc Ngư Quán');
  expect(rows).toHaveLength(1);
  expect(rows[0].closest('li')!.textContent).toContain('@MocNguQuan');
  expect(screen.getByText('2 kênh')).toBeTruthy();
});
