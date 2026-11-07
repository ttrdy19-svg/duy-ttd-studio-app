import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const scene = vi.hoisted(() => ({ setSelected: vi.fn(), setPaused: vi.fn(), focusStaff: vi.fn(), reset: vi.fn(), zoom: vi.fn(), dispose: vi.fn() }));
vi.mock('./scene', () => ({ createManor: () => scene }));
vi.mock('../App', () => ({ default: ({ externalView }: { externalView: string }) => <div>Bàn làm việc {externalView}</div> }));
vi.mock('../gchat/GChat', () => ({ default: () => <div>G Chat UI</div> }));
import ManorWorld from './ManorWorld';
describe('Màn hình chính nền ảnh cây tinh tú (mặc định)', () => {
  beforeEach(() => { localStorage.clear(); scene.setPaused.mockClear(); scene.dispose.mockClear(); });
  it('mặc định là nền ảnh, không dựng cảnh 3D; nút và bảng vẫn nằm trên nền', () => {
    const { container } = render(<ManorWorld />);
    expect(container.querySelector('.manor-world')!.classList.contains('che-do-anh')).toBe(true);
    expect(container.querySelector('[data-nen="cay-tinh-tu"]')).toBeTruthy();
    expect((container.querySelector('.nen-sau') as HTMLElement).style.backgroundImage).toContain('nen/cay-tinh-tu.jpg');
    expect(container.querySelector('.world-canvas')).toBeNull();
    expect(container.querySelector('.world-hint')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Mộc Ngư Quán' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mini app' })).toBeTruthy();
    expect(container.querySelectorAll('.nen-cau i').length).toBeGreaterThan(5);
    expect(container.querySelector('canvas.nen-hat')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Minh Nhi Quản sự$/ }));
    expect(screen.getByRole('dialog', { name: 'Trò chuyện với Minh Nhi' })).toBeTruthy();
    expect(scene.setPaused).not.toHaveBeenCalled();
  });
  it('Cài đặt nền: tắt hiệu ứng thì bỏ hạt sáng/quả cầu, bật "Nền 3D cũ" thì dựng lại cảnh 3D và nhớ lựa chọn', () => {
    const { container, unmount } = render(<ManorWorld />);
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt nền' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Hiệu ứng nền/ }));
    expect(container.querySelector('canvas.nen-hat')).toBeNull();
    expect(container.querySelector('.nen-cau')).toBeNull();
    expect(container.querySelector('.nen-sau')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: /Nền 3D cũ/ }));
    expect(container.querySelector('.world-canvas')).toBeTruthy();
    expect(container.querySelector('[data-nen]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('duy.nen-man-hinh')!)).toEqual({ cu3d: true, hieuUng: false });
    unmount();
    expect(scene.dispose).toHaveBeenCalled();
  });
});
describe('Trang viên 2.5D (Nền 3D cũ bật trong cài đặt)', () => {
  beforeEach(() => { localStorage.setItem('duy.nen-man-hinh', JSON.stringify({ cu3d: true, hieuUng: true })); });
  it('gặp người đang đi, dừng người đó khi mở thoại và đi tiếp khi tạm biệt', () => {
    render(<ManorWorld />);
    fireEvent.click(screen.getByRole('button', { name: /Minh Nhi Quản sự$/ }));
    expect(screen.getByRole('dialog', { name: 'Trò chuyện với Minh Nhi' })).toBeTruthy();
    expect(scene.setSelected).toHaveBeenLastCalledWith('minh-nhi');
    expect(screen.getByRole('button',{name:'Giao bản nhạc WAV'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tạm biệt' }));
    expect(scene.setSelected).toHaveBeenLastCalledWith('');
  });
  it('không còn thanh nút dưới; nút Mini app góc trái mở bảng, chọn app rồi bấm Mở app là vào ngay', () => {
    const { container } = render(<ManorWorld />);
    expect(container.querySelector('.world-dock')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Mộc Ngư Quán' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mini app' }));
    fireEvent.click(screen.getByRole('button', { name: /02\s*Tạo thumbnail/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở app' }));
    expect(scene.setPaused).toHaveBeenLastCalledWith(true);
    expect((container.querySelector('.world-tools') as HTMLElement).hidden).toBe(false);
    expect(screen.getByText('Bàn làm việc video')).toBeTruthy();
    // Tắt app mở từ bảng Mini app → quay lại bảng, đang chọn đúng app vừa mở.
    fireEvent.click(screen.getByRole('button', { name: 'Trở về trang viên' }));
    expect(screen.getByRole('dialog', { name: 'Mini app' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /02\s*Tạo thumbnail/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(scene.setPaused).toHaveBeenLastCalledWith(false);
  });
  it('chỉ để Minh Nhi và Xing trong trang viên, mở Tàng Âm Các và không còn G Chat', () => {
    const { container } = render(<ManorWorld />);
    expect(screen.queryByRole('button', { name: 'G Chat' })).toBeNull();
    expect(container.querySelectorAll('.person-label').length).toBe(2);
    expect(screen.getByRole('button',{name:/Xing Phụ tá/})).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mini app' }));
    fireEvent.click(screen.getByRole('button', { name: /07\s*Kho nhạc/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở app' }));
    expect(scene.setPaused).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(scene.setPaused).toHaveBeenLastCalledWith(false);
    expect((container.querySelector('.world-tools') as HTMLElement).hidden).toBe(true);
  });
});
