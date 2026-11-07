import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PhatHanh from './PhatHanh';
import type { AppsBridge, PhatHanhRec } from './types';
afterEach(() => { delete window.manorApps; });
const rec: PhatHanhRec = { ma: 'yt:abcdefghijk', url: 'https://youtu.be/abcdefghijk', bai: 'Bài kho', caSi: 'Chú Lạ', ghi: 'ghi cũ', nenTang: 'YouTube', ngay: '2026-11-06', luc: '' };
function setup(records: PhatHanhRec[] = []) {
  const b = { catalog: vi.fn().mockResolvedValue({ songs: [{ title: 'Bài kho', singer: 'Chú Lạ' }] }), phatHanhDs: vi.fn().mockResolvedValue(records), phatHanhKiem: vi.fn().mockResolvedValue([] as PhatHanhRec[]), phatHanhThem: vi.fn().mockResolvedValue({ trung: false, rec }), moLink: vi.fn().mockResolvedValue(undefined) };
  window.manorApps = b as unknown as AppsBridge; return b;
}
it('checks link immediately, suggests singer, saves then marks duplicate', async () => {
  const b = setup(); render(<PhatHanh />);
  await waitFor(() => expect(document.querySelector('datalist option[value="Bài kho"]')).toBeTruthy());
  fireEvent.change(screen.getByLabelText('Link phát hành'), { target: { value: rec.url } });
  await screen.findByText('CHƯA CÓ');
  fireEvent.change(screen.getByLabelText('Bài hát'), { target: { value: 'Bài kho' } });
  expect((screen.getByLabelText('Ca sĩ') as HTMLInputElement).value).toBe('Chú Lạ');
  fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Ghi thử' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ghi' }));
  await waitFor(() => expect(b.phatHanhThem).toHaveBeenCalledWith({ url: rec.url, bai: 'Bài kho', caSi: 'Chú Lạ', ghi: 'Ghi thử' }));
  await screen.findByText('ĐÃ GHI');
  expect((screen.getByRole('button', { name: 'Ghi' }) as HTMLButtonElement).disabled).toBe(true);
});
it('shows existing record, filters and opens browser link', async () => {
  const b = setup([rec, { ...rec, ma: 'tt:1', url: 'https://tiktok.com/@a/video/1', bai: 'Khác', caSi: 'Khác', nenTang: 'TikTok' }]);
  b.phatHanhKiem.mockResolvedValue([rec]); render(<PhatHanh />);
  fireEvent.change(screen.getByLabelText('Link phát hành'), { target: { value: rec.url } });
  await screen.findByText('ĐÃ CÓ'); expect(screen.getByText(/ghi cũ/, { selector: 'p' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Lọc bài'), { target: { value: 'Bài kho' } });
  fireEvent.change(screen.getByLabelText('Nền tảng'), { target: { value: 'YouTube' } });
  fireEvent.change(screen.getByLabelText('Lọc ca sĩ'), { target: { value: 'Chú Lạ' } });
  expect(screen.getByText('1 bản ghi')).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: rec.url })); expect(b.moLink).toHaveBeenCalledWith(rec.url);
});
it('ignores stale duplicate checks after url changes', async () => {
  const b = setup(); let finish!: (v: PhatHanhRec[]) => void;
  b.phatHanhKiem.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<PhatHanh />);
  fireEvent.change(screen.getByLabelText('Link phát hành'), { target: { value: rec.url } });
  fireEvent.change(screen.getByLabelText('Link phát hành'), { target: { value: 'https://youtu.be/otherid1234' } });
  await screen.findByText('CHƯA CÓ'); finish([rec]);
  await waitFor(() => expect(screen.queryByText('ĐÃ CÓ')).toBeNull());
});
