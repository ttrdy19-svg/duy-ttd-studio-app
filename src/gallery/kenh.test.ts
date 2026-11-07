import { describe, expect, it } from 'vitest';
import { kenhDung, profileDung, tiktokDung } from './kenh';

describe('kenhDung', () => {
  it('khớp 5 kênh dùng, không phân biệt dấu/hoa thường, bỏ kênh khác', () => {
    expect(kenhDung('MỘC NGƯ QUÁN')).toBe('Mộc Ngư Quán');
    expect(kenhDung('nguoi hat rong vn')).toBe('Người Hát Rong VN');
    expect(kenhDung('Người Hát Rong Music')).toBe('Người Hát Rong VN');
    expect(kenhDung('Ký Ức Nhạc Xưa')).toBeNull();
    expect(kenhDung('  Duy  TTD ')).toBe('Duy TTD');
    expect(kenhDung('The Wayfaring Bard')).toBe('The Wayfaring Bard');
    expect(kenhDung('Xing')).toBe('Xing');
    expect(kenhDung('Xing XIng CHULATIPS')).toBeNull();
    expect(kenhDung('Kênh phụ')).toBeNull();
  });
});

describe('tiktokDung', () => {
  it('chỉ nhận TikTok Duy TTD', () => {
    expect(tiktokDung('Duy TTD (@duy.ttd)')).toBe(true);
    expect(tiktokDung('@duyttd')).toBe(true);
    expect(tiktokDung('Xing (@xing)')).toBe(false);
    expect(tiktokDung('')).toBe(false);
  });
});

describe('profileDung', () => {
  it('Bilibili và TuneCore chỉ dùng profile Xing; nền tảng khác không lọc', () => {
    expect(profileDung('bilibili', 'Xing XIng CHULATIPS')).toBe(true);
    expect(profileDung('bilibili', 'tai-khoan-a', 'nguoi-dung@example.com')).toBe(false);
    expect(profileDung('tunecore', 'tai-khoan-b')).toBe(false);
    expect(profileDung('distrokid', 'tai-khoan-a')).toBe(true);
  });
});
