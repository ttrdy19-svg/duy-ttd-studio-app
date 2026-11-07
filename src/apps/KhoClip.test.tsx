import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import KhoClip from './KhoClip';
import type { AppsBridge } from './types';

afterEach(() => { delete window.manorApps; vi.restoreAllMocks(); });
const dance = { id: 'dance', path: 'tango.mp4', name: 'tango.mp4', folder: '.', url: '', loai: 'video',
  bai: 'Qua Hết Phong Sương', caSi: 'Du Ca', nguon: 'veo', nhanVat: 'Du Ca lãng tử tóc bạc',
  hanhDong: 'nhảy tango', phongCach: 'cổ phong điện ảnh', canh: 'xa', tieng: 'vi', sua: [], daDung: [] };
function setup() {
  const items = [dance, { ...dance, id: 'lip', path: 'lip.mp4', name: 'lip.mp4', loai: 'nhep',
    nguon: 'dreamina-nhep', hanhDong: 'nhép', canh: 'cận' }];
  window.manorApps = { khoClip: vi.fn().mockResolvedValue(items) } as unknown as AppsBridge;
  return render(<KhoClip />);
}
it('lọc hành động và cỡ cảnh thu hẹp đúng clip có thể chọn', async () => {
  setup();
  await screen.findByText('2 file');
  fireEvent.click(screen.getByRole('button', { name: /nhảy tango/ }));
  expect(screen.getByText('1 file')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Chọn tango.mp4' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Chọn lip.mp4' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /nhảy tango/ }));
  fireEvent.click(screen.getByRole('button', { name: /^cận/ }));
  expect(screen.getByRole('button', { name: 'Chọn lip.mp4' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Chọn tango.mp4' })).toBeNull();
});
it('chọn plan hiện bảng tango và yêu cầu nhép lại cảnh cận khác tiếng', async () => {
  const { container } = setup();
  await screen.findByText('2 file');
  const plan = { bai: 'Bài thử', caSi: 'Du Ca', phongCach: 'cổ phong điện ảnh', tieng: 'zh',
    canh: [{ id: '01', nv: true, ta: 'Wide tango' }, { id: '02', nv: true, nhep: true, ta: 'Close-up singing' }] };
  fireEvent.click(screen.getByRole('button', { name: 'Gợi ý cho bài…' }));
  fireEvent.change(container.querySelector('input[type="file"]')!, {
    target: { files: [{ name: 'plan.json', text: async () => JSON.stringify(plan) }] },
  });
  const table = await screen.findByRole('table');
  expect(within(table).getByText('tango.mp4')).toBeTruthy();
  expect(within(table).getByText('Tạo mới / nhép lại')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Tải kế hoạch có clip dùng lại' })).toBeTruthy();
});
