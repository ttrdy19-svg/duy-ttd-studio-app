import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BanDoSao from './BanDoSao';
import type { AppsBridge } from './types';

describe('Bản đồ sao', () => {
  afterEach(() => { delete window.manorApps; });
  it('nạp xem.html trong khung, Quét lại gọi bộ quét rồi nạp bản mới', async () => {
    const banDo = vi.fn().mockResolvedValue({ url: 'file:///x/tools/ban-do/xem.html?v=1', capNhat: Date.now(), nut: 535, canh: 1865, git: 'abc1234' });
    const banDoQuet = vi.fn().mockResolvedValue({ url: 'file:///x/tools/ban-do/xem.html?v=2', capNhat: Date.now(), nut: 540, canh: 1870 });
    window.manorApps = { banDo, banDoQuet } as unknown as AppsBridge;
    render(<BanDoSao />);
    const frame = await screen.findByTitle('Bản đồ liên kết');
    expect(frame.getAttribute('src')).toContain('v=1');
    expect(screen.getByText(/535 nút · 1865 cạnh/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Quét lại/ }));
    await waitFor(() => expect(screen.getByTitle('Bản đồ liên kết').getAttribute('src')).toContain('v=2'));
    expect(banDoQuet).toHaveBeenCalledTimes(1);
  });
  it('chưa quét lần nào thì bảo bấm Quét lại; lỗi quét hiện ra', async () => {
    window.manorApps = { banDo: vi.fn().mockResolvedValue({ url: null, capNhat: null }), banDoQuet: vi.fn().mockRejectedValue(new Error('Quét bản đồ lỗi: x')) } as unknown as AppsBridge;
    render(<BanDoSao />);
    expect(await screen.findByText(/chưa được dựng/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Quét lại/ }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
