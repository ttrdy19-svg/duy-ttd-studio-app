// Kênh YouTube chủ tịch dùng để đăng (2026-11-02). Phòng trưng bày chỉ hiện các kênh này, bỏ kênh phụ khác của cùng mail.
export const KENH_YOUTUBE = ['Xing', 'Người Hát Rong VN', 'Mộc Ngư Quán', 'Duy TTD', 'The Wayfaring Bard'];
// Tên thật trên YouTube khác cách chủ tịch gọi: "Người Hát Rong Music" (kiểm tra 03/11/2026) = kênh "Người Hát Rong VN".
const TEN_KHAC: Record<string, string[]> = { 'Người Hát Rong VN': ['Người Hát Rong Music', 'Người Hát Rong'] };

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

// Tên kênh quét được khớp với kênh nào trong danh sách (không phân biệt dấu, hoa thường, kể cả tên thật khác tên gọi).
export function kenhDung(name: string): string | null {
  const f = fold(name || '');
  return KENH_YOUTUBE.find(k => [k, ...(TEN_KHAC[k] || [])].some(t => fold(t) === f)) || null;
}

// TikTok chỉ dùng một tài khoản. Sổ lưu tên TikTok dạng "Tên (@handle)" hoặc "@handle".
export const KENH_TIKTOK = 'Duy TTD';
export function tiktokDung(text: string): boolean {
  const squash = (s: string) => fold(s).replace(/[^a-z0-9]/g, '');
  return Boolean(text) && squash(text).includes(squash(KENH_TIKTOK));
}

// Nền tảng chỉ dùng đúng một profile (chủ tịch chốt 03/11/2026): cùng tài khoản Bilibili đăng nhập ở 2 profile,
// còn TuneCore thì dò đăng nhập đoán sai → chỉ lấy profile Xing.
export const PROFILE_NEN_TANG: Record<string, string[]> = { bilibili: ['xing'], tunecore: ['xing'] };
export function profileDung(site: string, label: string, email = ''): boolean {
  const keys = PROFILE_NEN_TANG[site];
  if (!keys) return true;
  const f = fold(`${label} ${email}`);
  return keys.some(k => f.includes(k));
}
// Trang mở thành TAB thường trong Cốc Cốc (có nút dịch trang + tải lại); còn lại mở cửa sổ một trang.
export const MO_TAB_THUONG = new Set(['bilibili', 'distrokid', 'tunecore']);
