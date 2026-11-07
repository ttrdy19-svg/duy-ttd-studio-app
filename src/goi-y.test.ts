import { describe, expect, it } from 'vitest';
import { batGoiY, goiYTuDong } from './goi-y';

describe('chú thích cho chỗ có mũi tên thả xuống', () => {
  it('ô chọn nói tên ô và giá trị đang chọn; dòng gập/mở nói mở hay gập', () => {
    document.body.innerHTML = `<label>Profile Cốc Cốc<select><option>tai-khoan-a</option></select></label>
      <select aria-label="Lọc nguồn"><option>Mọi nguồn</option></select>
      <details><summary>Cách cài tiện ích</summary>x</details>`;
    const [a, b] = document.querySelectorAll('select');
    expect(goiYTuDong(a)).toBe('Bấm để chọn Profile Cốc Cốc (đang: tai-khoan-a)');
    expect(goiYTuDong(b)).toBe('Bấm để chọn Lọc nguồn (đang: Mọi nguồn)');
    const details = document.querySelector('details') as HTMLDetailsElement;
    expect(goiYTuDong(details.querySelector('summary'))).toBe('Bấm để mở: Cách cài tiện ích');
    details.open = true;
    expect(goiYTuDong(details.querySelector('summary'))).toBe('Bấm để gập: Cách cài tiện ích');
  });

  it('rê chuột vào thì gắn chú thích, không đè chú thích đã viết tay', () => {
    document.body.innerHTML = '<select aria-label="Ca sĩ"><option>Xing</option></select><select title="Tự viết"><option>a</option></select>';
    batGoiY();
    const [a, b] = document.querySelectorAll('select');
    a.dispatchEvent(new Event('pointerover', { bubbles: true }));
    b.dispatchEvent(new Event('pointerover', { bubbles: true }));
    expect(a.title).toBe('Bấm để chọn Ca sĩ (đang: Xing)');
    expect(b.title).toBe('Tự viết');
  });
});
