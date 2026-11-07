import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import './o-viec.css';

// Ô popup một vấn đề (cl-021): dùng chung cho lỗi tài khoản và việc Sổ việc chờ duyệt.
// Ba nút: "Để lại" (đóng, không đổi gì) · "Note" (lưu nhận xét, vấn đề vẫn mở) · "Submit" (lưu nhận xét + báo đã xử lý / duyệt).
export type ODong = { nhan: string; noiDung: string };
export type OViecProps = {
  loai: string;                 // nhãn nhỏ trên tiêu đề, vd. "Lỗi tài khoản" / "Việc chờ duyệt"
  tieuDe: string;
  moTa?: string;
  goiY?: string;
  dong?: ODong[];               // các dòng thông tin: lúc nào, ai/thợ nào, kết quả…
  trangThai?: string;           // dòng trạng thái hiện tại (vd. "Chờ Claude kiểm lại")
  moTrang?: { nhan: string; onMo: () => Promise<unknown> | void };   // nút lớn mở trang gỡ lỗi trong đúng profile
  nhanSubmit?: string;
  giaiSubmit?: string;
  onNote: (nhanXet: string) => Promise<unknown>;
  onSubmit: (nhanXet: string) => Promise<unknown>;
  onDong: () => void;
  phu?: { nhan: string; onBam: () => void };  // nút phụ, vd. "Mở Sổ việc"
};

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

export default function OViec(p: OViecProps) {
  const [nhanXet, setNhanXet] = useState(''), [busy, setBusy] = useState(''), [error, setError] = useState(''), [baoMo, setBaoMo] = useState('');
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); p.onDong(); } };
    window.addEventListener('keydown', esc, true);
    return () => window.removeEventListener('keydown', esc, true);
  }, [p]);
  async function lam(kind: string, fn: () => Promise<unknown> | void, dong = true) {
    setError(''); setBusy(kind);
    try { await fn(); if (dong) p.onDong(); return true; } catch (e) { setError(message(e)); return false; } finally { setBusy(''); }
  }
  return <div className="ov-nen" onClick={p.onDong}>
    <section className="ov" role="dialog" aria-modal="true" aria-label={p.tieuDe} onClick={e => e.stopPropagation()}>
      <button className="ov-x" aria-label="Đóng" title="Đóng (giữ nguyên, không đổi gì)" onClick={p.onDong}><X size={18} /></button>
      <small className="ov-loai">{p.loai}</small>
      <h3>{p.tieuDe}</h3>
      {p.trangThai && <p className="ov-tt">{p.trangThai}</p>}
      {p.moTa && <p className="ov-mota">{p.moTa}</p>}
      {p.goiY && <p className="ov-goiy"><b>Cách gỡ:</b> {p.goiY}</p>}
      {p.dong && p.dong.length > 0 && <dl className="ov-dong">{p.dong.filter(d => d.noiDung).map(d => <div key={d.nhan}><dt>{d.nhan}</dt><dd>{d.noiDung}</dd></div>)}</dl>}
      {p.moTrang && <button className="ov-motrang" disabled={Boolean(busy)} onClick={() => void lam('mo', async () => { await p.moTrang!.onMo(); setBaoMo('Đã mở trang. Xem trong cửa sổ Cốc Cốc vừa hiện.'); }, false)}>
        <ExternalLink size={18} /> {busy === 'mo' ? 'Đang mở…' : p.moTrang.nhan}</button>}
      {baoMo && <p className="ov-bao">{baoMo}</p>}
      <label className="ov-nhanxet">Nhận xét
        <textarea rows={4} value={nhanXet} onChange={e => setNhanXet(e.target.value)} placeholder="Gõ nhận xét (xuống dòng thoải mái)" /></label>
      {error && <p className="ov-loi" role="alert">{error}</p>}
      <div className="ov-nut">
        <button onClick={p.onDong} disabled={Boolean(busy)} title="Đóng, giữ nguyên, không đổi gì">Để lại</button>
        <button onClick={() => void lam('note', () => p.onNote(nhanXet.trim()))} disabled={Boolean(busy) || !nhanXet.trim()} title="Lưu nhận xét, vấn đề vẫn để mở">{busy === 'note' ? 'Đang lưu…' : 'Note'}</button>
        <button className="ov-submit" onClick={() => void lam('submit', () => p.onSubmit(nhanXet.trim()))} disabled={Boolean(busy)} title={p.giaiSubmit || 'Lưu nhận xét và báo đã xử lý'}>{busy === 'submit' ? 'Đang gửi…' : p.nhanSubmit || 'Submit'}</button>
        {p.phu && <button className="ov-phu" onClick={p.phu.onBam} disabled={Boolean(busy)}>{p.phu.nhan}</button>}
      </div>
    </section>
  </div>;
}
