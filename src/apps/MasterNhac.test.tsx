import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MasterNhac from './MasterNhac';
import type { AppsBridge } from './types';
afterEach(() => { delete window.manorApps; vi.restoreAllMocks(); });
const result = { id: 'r', source: 'goc.wav', file: 'Master.wav', truoc: { lufs: -23, lra: 4, peak: -6 }, sau: { lufs: -14, lra: 3, peak: -1 }, cach: 'C', theLoai: 'folk' };
function setup() {
  const bridge = { catalog: vi.fn().mockResolvedValue({ songs: [{ id: 's', title: 'Bài kho', singer: 'Chú Lạ', audio: [{ label: 'Gốc', path: 'goc.wav' }, { label: 'Master', path: 'mau.wav' }] }] }), masterChon: vi.fn().mockResolvedValue(['a.wav', 'b.wav']), masterChay: vi.fn().mockResolvedValue(result), masterNghe: vi.fn().mockResolvedValue(new Uint8Array([1])) };
  window.manorApps = bridge as unknown as AppsBridge; return bridge;
}
it('queues multiple WAVs, defaults C/folk, renders measurements and requests equal-loudness preview', async () => {
  const bridge = setup();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn().mockReturnValue('blob:preview') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  render(<MasterNhac />);
  fireEvent.click(screen.getByRole('button', { name: 'Chọn WAV' }));
  await screen.findByText('a.wav');
  fireEvent.click(screen.getByRole('button', { name: 'Master các bài chờ' }));
  await waitFor(() => expect(bridge.masterChay).toHaveBeenCalledTimes(2));
  expect(bridge.masterChay).toHaveBeenNthCalledWith(1, expect.objectContaining({ path: 'a.wav', cach: 'C', theLoai: 'folk' }));
  await screen.findAllByText('-14');
  fireEvent.click(screen.getAllByRole('button', { name: 'Nghe gốc -14 LUFS' })[0]);
  await waitFor(() => expect(bridge.masterNghe).toHaveBeenCalledWith('r', 'truoc'));
});
it('selects original from catalog and requires a catalog Master reference for B', async () => {
  const bridge = setup(); render(<MasterNhac />);
  await screen.findByRole('option', { name: 'Bài kho · Chú Lạ' });
  fireEvent.change(screen.getByLabelText('Bài trong kho'), { target: { value: 's' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm bài' }));
  fireEvent.change(screen.getByLabelText('Cách master'), { target: { value: 'B' } });
  expect((screen.getByRole('button', { name: 'Master các bài chờ' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Master mẫu trong kho'), { target: { value: 'mau.wav' } });
  fireEvent.click(screen.getByRole('button', { name: 'Master các bài chờ' }));
  await waitFor(() => expect(bridge.masterChay).toHaveBeenCalledWith(expect.objectContaining({ songId: 's', cach: 'B', mau: 'mau.wav' })));
});
it('shows per-file errors without losing remaining batch', async () => {
  const bridge = setup(); bridge.masterChay.mockRejectedValueOnce(new Error('Đã hủy ghi đè'));
  render(<MasterNhac />); fireEvent.click(screen.getByRole('button', { name: 'Chọn WAV' })); await screen.findByText('a.wav');
  fireEvent.click(screen.getByRole('button', { name: 'Master các bài chờ' }));
  await screen.findByRole('alert'); await waitFor(() => expect(bridge.masterChay).toHaveBeenCalledTimes(2));
});
