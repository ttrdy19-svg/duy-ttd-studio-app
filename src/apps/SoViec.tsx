import { useEffect, useMemo, useState } from 'react';
import { Ban, Check, ClipboardList, ExternalLink, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import type { TrangThaiViec, ViecChuTich } from './types';
import './so-viec.css';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
export const TRANG_THAI: { id: TrangThaiViec; ten: string; giai: string }[] = [
  { id: 'cho', ten: 'Chờ làm', giai: 'Chưa ai bắt tay làm' },
  { id: 'dang-lam', ten: 'Đang làm', giai: 'Đang có người làm' },
  { id: 'cho-duyet', ten: 'Xong, chờ chủ tịch duyệt', giai: 'Đã làm xong, chờ chủ tịch xem và bấm duyệt' },
  { id: 'da-duyet', ten: 'Chủ tịch đã duyệt', giai: 'Chủ tịch đã xác nhận xong' },
  { id: 'bo', ten: 'Bỏ', giai: 'Không làm nữa (vẫn giữ trong sổ)' },
];
const NGUOI = ['Claude', 'Codex', 'Gemini', 'Copilot', 'BeatAPI', 'Antigravity', 'Chủ tịch'];
const ten = (t: TrangThaiViec) => TRANG_THAI.find(x => x.id === t)?.ten ?? t;
const ngay = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

// Sổ việc chủ tịch (05/11/2026): danh sách việc chủ tịch giao, lọc theo trạng thái, tìm, thêm nhanh, bấm một việc để xem/sửa chi tiết.
export default function SoViec() {
  const bridge = window.manorApps;
  const [list, setList] = useState<ViecChuTich[]>([]);
  const [loc, setLoc] = useState<TrangThaiViec | 'tat-ca'>('tat-ca');
  const [tim, setTim] = useState(''), [nhanh, setNhanh] = useState('');
  const [mo, setMo] = useState<string>(''), [error, setError] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!bridge?.soViec) return;
    bridge.soViec().then(setList, e => setError(message(e)));
    return bridge.onSoViec?.(setList);
  }, [bridge]);

  const dem = useMemo(() => Object.fromEntries(TRANG_THAI.map(t => [t.id, list.filter(v => v.trangThai === t.id).length])), [list]);
  const hien = useMemo(() => {
    const q = tim.trim().toLowerCase();
    return list.filter(v => (loc === 'tat-ca' ? v.trangThai !== 'bo' : v.trangThai === loc)
      && (!q || [v.yeuCau, v.ghiChu, v.ghiChuClaude, v.nguoiLam, ...v.ketQua.map(k => k.text)].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => b.luc.localeCompare(a.luc));
  }, [list, loc, tim]);
  if (!bridge?.soViec) return <section className="so-viec"><p className="apps-note warn">Sổ việc chỉ chạy trong bản Windows (Electron) của app.</p></section>;

  const capNhat = (v: ViecChuTich) => setList(l => l.some(x => x.id === v.id) ? l.map(x => x.id === v.id ? v : x) : [v, ...l]);
  async function luu(input: Partial<ViecChuTich>) {
    setError(''); setBusy(true);
    try { const v = await bridge!.soViecLuu!(input); capNhat(v); return v; } catch (e) { setError(message(e)); return null; } finally { setBusy(false); }
  }
  async function them() {
    if (!nhanh.trim()) return;
    const v = await luu({ yeuCau: nhanh.trim() });
    if (v) { setNhanh(''); setMo(v.id); }
  }
  async function bo(id: string) {
    setError('');
    try { capNhat(await bridge!.soViecXoa!(id)); } catch (e) { setError(message(e)); }
  }
  async function nhapLai() {
    setError(''); setNote(''); setBusy(true);
    try { const r = await bridge!.soViecNhap!(); setList(r.viec); setNote(r.them ? `Đã thêm ${r.them} việc mới từ DO-DANG.` : 'Không có việc mới trong DO-DANG (việc đã có thì giữ nguyên).'); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  const dangMo = list.find(v => v.id === mo);

  return <section className="so-viec" aria-label="Sổ việc chủ tịch">
    <header className="sv-head">
      <div><h2><ClipboardList size={20} /> Sổ việc chủ tịch</h2><p>Việc chủ tịch giao: thời gian giao, yêu cầu nguyên văn, ghi chú, ai làm, kết quả. Claude đọc và ghi sổ này qua cổng nội bộ.</p></div>
      <button onClick={() => void nhapLai()} disabled={busy} title="Đọc lại mục 📌 trong AI Nhat Ky/DO-DANG.md; chỉ thêm việc chưa có, không đè việc đã sửa"><RefreshCw size={14} /> Nhập lại từ DO-DANG</button>
    </header>
    <form className="sv-them" onSubmit={e => { e.preventDefault(); void them(); }}>
      <input value={nhanh} onChange={e => setNhanh(e.target.value)} placeholder="Gõ việc mới cần làm (nguyên văn yêu cầu) rồi Enter" aria-label="Việc mới" />
      <button type="submit" className="primary" disabled={busy || !nhanh.trim()} title="Thêm việc vào sổ, trạng thái Chờ làm"><Plus size={14} /> Thêm việc</button>
    </form>
    {error && <p className="apps-note warn" role="alert">{error}</p>}
    {note && <p className="apps-note">{note}</p>}
    <div className="sv-loc" role="tablist" aria-label="Lọc theo trạng thái">
      <button role="tab" aria-selected={loc === 'tat-ca'} className={loc === 'tat-ca' ? 'on' : ''} onClick={() => setLoc('tat-ca')} title="Mọi việc trừ việc đã bỏ">Tất cả <b>{list.length - (dem.bo || 0)}</b></button>
      {TRANG_THAI.map(t => <button key={t.id} role="tab" aria-selected={loc === t.id} className={`${loc === t.id ? 'on' : ''} tt-${t.id}`} onClick={() => setLoc(t.id)} title={t.giai}>{t.ten} <b>{dem[t.id] || 0}</b></button>)}
      <label className="sv-tim" title="Tìm trong yêu cầu, ghi chú, người làm, kết quả"><Search size={14} /><input value={tim} onChange={e => setTim(e.target.value)} placeholder="Tìm việc" aria-label="Tìm việc" /></label>
    </div>
    <table className="sv-bang">
      <thead><tr><th>Lúc giao</th><th>Yêu cầu</th><th>Trạng thái</th><th>Người làm</th><th>Cập nhật</th></tr></thead>
      <tbody>{hien.map(v => <tr key={v.id} className={mo === v.id ? 'on' : ''} onClick={() => setMo(v.id)} title="Bấm để xem / sửa chi tiết">
        <td className="sv-ngay">{ngay(v.luc)}</td>
        <td><span className="sv-yc">{v.yeuCau}</span>{v.ghiChu && <small>{v.ghiChu}</small>}</td>
        <td><span className={`sv-tt tt-${v.trangThai}`}>{ten(v.trangThai)}</span></td>
        <td>{v.nguoiLam || '—'}</td>
        <td className="sv-ngay">{v.capNhat ? ngay(v.capNhat) : '—'}</td>
      </tr>)}
      {!hien.length && <tr><td colSpan={5} className="sv-trong">Không có việc nào {loc === 'tat-ca' ? '' : `ở mục "${ten(loc)}"`}{tim ? ` khớp "${tim}"` : ''}.</td></tr>}</tbody>
    </table>
    {dangMo && <ChiTiet key={dangMo.id + dangMo.capNhat} viec={dangMo} busy={busy} onLuu={luu} onBo={() => void bo(dangMo.id)} onDong={() => setMo('')} onMoLink={url => bridge!.moLink(url).catch(e => setError(message(e)))} />}
  </section>;
}

function ChiTiet({ viec, busy, onLuu, onBo, onDong, onMoLink }: { viec: ViecChuTich; busy: boolean; onLuu: (v: Partial<ViecChuTich>) => Promise<unknown>; onBo: () => void; onDong: () => void; onMoLink: (url: string) => void }) {
  const [v, setV] = useState(viec);
  const doi = <K extends keyof ViecChuTich>(k: K, value: ViecChuTich[K]) => setV(x => ({ ...x, [k]: value }));
  const sua = JSON.stringify(v) !== JSON.stringify(viec);
  const luu = () => onLuu({ id: v.id, yeuCau: v.yeuCau, ghiChu: v.ghiChu, trangThai: v.trangThai, nguoiLam: v.nguoiLam, ketQua: v.ketQua, ghiChuClaude: v.ghiChuClaude });
  return <aside className="sv-chitiet" aria-label="Chi tiết việc">
    <header><h3>Chi tiết việc</h3><small>Giao lúc {ngay(viec.luc)}{viec.capNhat ? ` · cập nhật ${ngay(viec.capNhat)}` : ''}</small>
      <button className="sv-dong" aria-label="Đóng chi tiết" title="Đóng chi tiết" onClick={onDong}><X size={16} /></button></header>
    <label>Yêu cầu của chủ tịch (nguyên văn)<textarea rows={3} value={v.yeuCau} onChange={e => doi('yeuCau', e.target.value)} /></label>
    <label>Ghi chú thêm của chủ tịch<textarea rows={3} value={v.ghiChu} onChange={e => doi('ghiChu', e.target.value)} /></label>
    <div className="sv-hang">
      <label>Trạng thái<select value={v.trangThai} onChange={e => doi('trangThai', e.target.value as TrangThaiViec)}>{TRANG_THAI.map(t => <option key={t.id} value={t.id} title={t.giai}>{t.ten}</option>)}</select></label>
      <label>Người làm<input list="sv-nguoi" value={v.nguoiLam} onChange={e => doi('nguoiLam', e.target.value)} /><datalist id="sv-nguoi">{NGUOI.map(n => <option key={n} value={n} />)}</datalist></label>
    </div>
    <fieldset><legend>Kết quả (chữ + link)</legend>
      {v.ketQua.map((k, i) => <div key={i} className="sv-kq">
        <input value={k.text} placeholder="Mô tả kết quả" aria-label={`Kết quả ${i + 1}`} onChange={e => doi('ketQua', v.ketQua.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
        <input value={k.link} placeholder="Link hoặc đường dẫn file" aria-label={`Link kết quả ${i + 1}`} onChange={e => doi('ketQua', v.ketQua.map((x, j) => j === i ? { ...x, link: e.target.value } : x))} />
        {/^https?:\/\//.test(k.link) && <button type="button" onClick={() => onMoLink(k.link)} title="Mở link trong trình duyệt"><ExternalLink size={13} /></button>}
        <button type="button" onClick={() => doi('ketQua', v.ketQua.filter((_, j) => j !== i))} title="Bỏ dòng kết quả này" aria-label={`Bỏ kết quả ${i + 1}`}><Trash2 size={13} /></button>
      </div>)}
      <button type="button" onClick={() => doi('ketQua', [...v.ketQua, { text: '', link: '' }])} title="Thêm một dòng kết quả"><Plus size={13} /> Thêm kết quả</button>
    </fieldset>
    <label>Ghi chú của Claude<textarea rows={3} value={v.ghiChuClaude} onChange={e => doi('ghiChuClaude', e.target.value)} /></label>
    <div className="sv-nut">
      <button className="primary" disabled={busy || !sua || !v.yeuCau.trim()} onClick={() => void luu()} title="Lưu mọi thay đổi của việc này">Lưu thay đổi</button>
      {viec.trangThai !== 'da-duyet' && <button disabled={busy} onClick={() => void onLuu({ id: viec.id, trangThai: 'da-duyet' })} title="Chủ tịch xác nhận việc này đã xong"><Check size={14} /> Chủ tịch duyệt</button>}
      {viec.trangThai !== 'bo' && <button disabled={busy} onClick={onBo} title="Không làm việc này nữa (vẫn giữ trong sổ, xem ở mục Bỏ)"><Ban size={14} /> Bỏ việc</button>}
    </div>
  </aside>;
}
