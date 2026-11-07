import { useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import type { Account, AccountError, Site, SiteCredits } from '../apps/types';

// Phần dùng chung giữa bảng cũ (AccountBook) và sách phép (SachPhep): dấu "!" lỗi tài khoản (cl-010/011), tín dụng, dòng kiểm.
// Lỗi tài khoản do việc tự động ghi lại (desktop/apps/accounts.cjs ghiLoi): hiện dấu "!" đỏ, bấm xem chi tiết.
export type AccountLoi = AccountError;
export const loiCua = (account: Account, dichVu?: string): AccountLoi[] => (account.loi || []).filter(e => !dichVu || e.dichVu === dichVu);
const TEN_VIEC: Record<string, string> = { veo: 'Video Veo (Flow)', nhep: 'Nhép môi (Dreamina)', anh: 'Vẽ ảnh (ChatGPT)', 'do-tin-dung': 'Dò tín dụng', 'kiem-tra': 'Kiểm tra' };
const TEN_DICH_VU: Record<string, string> = { profile: 'Profile Cốc Cốc' };
const luc = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
// Lỗi cũ (trước cl-011) chưa có trạng thái thì coi như mới.
export const choKiem = (e: AccountLoi) => e.trangThai === 'cho-kiem';
export type Feedback = { daXuLy: boolean; nhanXet: string };

// Dấu "!": đỏ khi còn lỗi mới; vàng khi mọi lỗi đã được chủ tịch phản hồi, chờ Claude kiểm lại. Không tự ẩn; chỉ mất khi Claude kiểm xong.
export function LoiMark({ list, label, onOpen }: { list: AccountLoi[]; label: string; onOpen: () => void }) {
  if (!list.length) return null;
  const cho = list.every(choKiem);
  const tip = cho ? `${label}: Chờ Claude kiểm lại (${list.length} lỗi mày đã phản hồi). Bấm để xem chi tiết.`
    : `${label}: ${list.length} lỗi tài khoản. Mới nhất: ${list[0].thongBao}${list[0].goiY ? ` — Cách gỡ: ${list[0].goiY}` : ''}. Bấm để xem chi tiết, mở trang gỡ lỗi và báo đã xử lý.`;
  return <button type="button" className={`hall-loi-mark${cho ? ' cho-kiem' : ''}`} aria-label={`Xem lỗi ${label}`} title={tip} onClick={onOpen}>!</button>;
}

// Một lỗi: mô tả, cách gỡ, link mở trong đúng profile, ô nhận xét + nút "Tao đã xử lý" (gửi cho Claude kiểm lại).
function LoiItem({ e, ten, onFeedback, onLink }: { e: AccountLoi; ten: (id: string) => string; onFeedback: (loiId: string, feedback: Feedback) => void; onLink: (url: string) => void }) {
  const [nhanXet, setNhanXet] = useState('');
  const cho = choKiem(e);
  return <li className={cho ? 'cho-kiem' : ''}>
    <div className="hall-loi-head"><b>{ten(e.dichVu)}</b><span>{TEN_VIEC[e.viec] || e.viec || 'Việc tự động'}</span><small>{luc(e.luc)}{e.soLan > 1 ? ` · ${e.soLan} lần (từ ${luc(e.dau)})` : ''}</small>
      {cho && <em className="hall-loi-state">Chờ Claude kiểm lại</em>}</div>
    <p>{e.thongBao}</p>
    {e.goiY && <p className="hall-loi-goiy">Cách gỡ: {e.goiY}</p>}
    {e.link && <p className="hall-loi-link"><button type="button" title={`Mở ${e.link} trong đúng profile Cốc Cốc của tài khoản này`} onClick={() => onLink(e.link!)}><ExternalLink size={12} /> Mở trang gỡ lỗi: {e.link}</button></p>}
    {e.daOnLai && <p className="hall-loi-note">Có vẻ đã ổn lại lúc {luc(e.daOnLai)} (việc cùng dịch vụ vừa chạy được).</p>}
    {e.kiemLai?.ketQua === 'van-loi' && <p className="hall-loi-claude">Claude kiểm lại lúc {luc(e.kiemLai.luc)}: vẫn lỗi.{e.kiemLai.ghiChu ? ` ${e.kiemLai.ghiChu}` : ''}</p>}
    {e.phanHoi && <p className="hall-loi-note">Mày đã phản hồi lúc {luc(e.phanHoi.luc)}: {[e.phanHoi.daXuLy ? 'đã xử lý' : '', e.phanHoi.nhanXet ? `"${e.phanHoi.nhanXet}"` : ''].filter(Boolean).join(', ')}</p>}
    <div className="hall-loi-reply">
      <textarea value={nhanXet} rows={2} placeholder="Nhận xét cho Claude (không bắt buộc khi bấm Tao đã xử lý)" aria-label={`Nhận xét lỗi ${ten(e.dichVu)}`} onChange={ev => setNhanXet(ev.target.value)} />
      <div>
        <button type="button" title="Báo Claude là mày đã gỡ lỗi này; Claude sẽ kiểm lại rồi mới xoá dấu" onClick={() => { onFeedback(e.id, { daXuLy: true, nhanXet }); setNhanXet(''); }}><Check size={12} /> Tao đã xử lý</button>
        <button type="button" disabled={!nhanXet.trim()} title="Gửi nhận xét cho Claude kiểm lại (chưa xử lý xong)" onClick={() => { onFeedback(e.id, { daXuLy: false, nhanXet }); setNhanXet(''); }}>Gửi nhận xét</button>
      </div>
    </div>
  </li>;
}

export function LoiDialog({ account, dichVu, sites, onFeedback, onLink, onClose }: { account: Account; dichVu?: string; sites: Site[]; onFeedback: (loiId: string, feedback: Feedback) => void; onLink: (url: string) => void; onClose: () => void }) {
  const list = loiCua(account, dichVu);
  const ten = (id: string) => sites.find(s => s.id === id)?.name || TEN_DICH_VU[id] || id;
  return <div className="hall-loi" role="dialog" aria-label={`Lỗi tài khoản ${account.label}`}>
    <header><h4>Lỗi tài khoản · {account.label}{dichVu ? ` · ${ten(dichVu)}` : ''}</h4>
      <button className="hall-icon" aria-label="Đóng hộp lỗi" title="Đóng (lỗi vẫn giữ nguyên)" onClick={onClose}><X size={13} /></button></header>
    <p className="hall-muted">Gỡ xong thì bấm "Tao đã xử lý" hoặc viết nhận xét. Claude kiểm lại rồi mới xoá dấu "!"; chỉ xem thì lỗi giữ nguyên.</p>
    {list.length ? <ul>{list.map(e => <LoiItem key={e.id} e={e} ten={ten} onFeedback={onFeedback} onLink={onLink} />)}</ul> : <p className="hall-muted">Không còn lỗi nào.</p>}
  </div>;
}

// Tín dụng đọc từ trang. Dreamina: nhép môi (Ảnh đại diện AI) tốn ~300 tín dụng / 25 s, dưới mức đó tô vàng.
const CREDIT_LOW: Record<string, number> = { dreamina: 300 };
export function CreditTag({ site, found }: { site: string; found: SiteCredits }) {
  const when = found.at ? new Date(found.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
  if (found.credits == null) return <small className="hall-credits lost" title={`Đọc lúc ${when}`}>{found.loggedIn === false ? 'mất đăng nhập' : 'không đọc được số'}</small>;
  const low = found.credits < (CREDIT_LOW[site] ?? 0);
  return <small className={`hall-credits${low ? ' low' : ''}`} title={`Đọc lúc ${when}${low ? ' · dưới 300 = chưa đủ một đoạn nhép môi 25 s' : ''}`}>{found.credits.toLocaleString('vi-VN')} tín dụng</small>;
}

// Kết quả lần Kiểm tra gần nhất, ngắn gọn: giờ dò và lỗi nếu có.
export function ScanLine({ account, site }: { account: Account; site: Site }) {
  const entry = account.sites[site.id], check = account.checks[site.id];
  if (!site.detect) return <small className="hall-scan">Ghi tay</small>;
  if (!entry.checkedAt) return <small className="hall-scan">Chưa kiểm tra</small>;
  const at = new Date(entry.checkedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  const scan = entry.scan;
  const problems = [entry.loggedIn === false && 'không thấy đăng nhập', check && !check.ok && check.error, check?.billing, scan?.error].filter(Boolean);
  return <small className={`hall-scan ${problems.length ? 'bad' : 'ok'}`}>{problems.length ? `${at} · ${problems.join(' · ')}` : `✓ Dò lúc ${at}`}</small>;
}
