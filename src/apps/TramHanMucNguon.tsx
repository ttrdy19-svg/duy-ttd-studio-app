import { useState } from 'react';
import { KeyRound, Pencil, Plus } from 'lucide-react';
import type { AppsBridge, NguonKeyCachDo, NguonKeyLuu, NguonKeyView } from './types';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const CACH: Record<NguonKeyCachDo, string> = {
  'tu-dong': 'Tự thử (OpenRouter / new-api / billing)', openrouter: 'OpenRouter (/api/v1/key)', 'new-api': 'new-api / one-api (/api/usage/token)',
  billing: 'Kiểu OpenAI cũ (/v1/dashboard/billing)', khong: 'Không có — chỉ đếm token',
};
const TRONG: NguonKeyLuu = { ten: '', loai: 'openai', baseUrl: '', key: '', model: '', cachDo: 'tu-dong', hetHan: '', ghiChu: '', tat: false };

// Danh sách nguồn key qua trang trung gian (mwapi, BeatAPI, OpenRouter…) + form thêm/sửa.
// Key nhập vào ô mật khẩu, gửi một chiều xuống máy; giao diện không bao giờ nhận lại key (chỉ biết "đã có key").
export default function NguonKey({ cauHinh, bridge, xong }: { cauHinh: { nguon: NguonKeyView[]; loi: string }; bridge: AppsBridge; xong: () => void }) {
  const [form, setForm] = useState<NguonKeyLuu | null>(null), [coKey, setCoKey] = useState(false);
  const [busy, setBusy] = useState(false), [loi, setLoi] = useState('');
  const sua = (n?: NguonKeyView) => {
    setLoi(''); setCoKey(Boolean(n?.coKey));
    setForm(n ? { tenCu: n.ten, ten: n.ten, loai: n.loai, baseUrl: n.baseUrl, key: '', model: n.model, rpm: n.rpm ?? undefined, cachDo: n.cachDo, hetHan: n.hetHan, ghiChu: n.ghiChu, tat: n.tat } : { ...TRONG });
  };
  const dat = (patch: Partial<NguonKeyLuu>) => setForm(f => f && { ...f, ...patch });
  const luu = async () => {
    if (!form || !bridge.hanMucLuu) return;
    setBusy(true); setLoi('');
    try { await bridge.hanMucLuu(form); setForm(null); xong(); } catch (e) { setLoi(message(e)); } finally { setBusy(false); }
  };
  const laMw = form?.tenCu === 'mwapi';
  return <section className="hm-nguon" aria-label="Nguồn key">
    <header>
      <h3><KeyRound size={16} /> Nguồn key qua trang trung gian</h3>
      {bridge.hanMucLuu && <button onClick={() => sua()}><Plus size={13} /> Thêm nguồn</button>}
    </header>
    <p className="hm-cach">Lưu ở desktop/api-nguon.local.json (mwapi: desktop/anthropic-key.local.txt — thợ Claude đọc file này). Git bỏ qua cả hai. Nguồn kiểu OpenAI có model thì bộ giao dùng được thành thợ <code>api:&lt;tên&gt;</code>.</p>
    {cauHinh.loi && <p className="hm-loi">{cauHinh.loi}</p>}
    <table>
      <thead><tr><th>Tên</th><th>Kiểu</th><th>Máy chủ</th><th>Key</th><th>Dò số dư</th><th>Hết hạn</th><th>Ghi chú</th><th /></tr></thead>
      <tbody>{cauHinh.nguon.map(n => <tr key={n.ten} className={n.tat ? 'tat' : ''}>
        <td><b>{n.ten}</b>{n.tat ? ' (tắt)' : ''}</td><td>{n.loai === 'anthropic' ? 'Anthropic' : 'OpenAI'}</td><td>{n.host || '—'}</td>
        <td>{n.coKey ? 'đã có' : <em>chưa có</em>}</td><td>{CACH[n.cachDo]}</td><td>{n.hetHan || '—'}</td><td className="ghi">{n.ghiChu}</td>
        <td>{bridge.hanMucLuu && <button onClick={() => sua(n)} aria-label={`Sửa ${n.ten}`}><Pencil size={12} /> Sửa</button>}</td>
      </tr>)}</tbody>
    </table>
    {form && <form className="hm-form" aria-label="Sửa nguồn" onSubmit={e => { e.preventDefault(); void luu(); }}>
      <label>Tên<input value={form.ten} disabled={laMw} onChange={e => dat({ ten: e.target.value })} placeholder="vd beatapi" /></label>
      <label>Kiểu<select value={form.loai} disabled={laMw} onChange={e => dat({ loai: e.target.value as NguonKeyLuu['loai'] })}>
        <option value="openai">Kiểu OpenAI (/chat/completions)</option><option value="anthropic">Kiểu Anthropic (Claude Code)</option></select></label>
      <label className="rong">Link máy chủ<input value={form.baseUrl} onChange={e => dat({ baseUrl: e.target.value })} placeholder="https://…/v1" /></label>
      <label className="rong">Key<input type="password" autoComplete="new-password" value={form.key || ''} onChange={e => dat({ key: e.target.value })}
        placeholder={coKey ? 'Đã có key — để trống thì giữ key cũ' : 'Dán key'} /></label>
      {!laMw && <label>Model<input value={form.model || ''} onChange={e => dat({ model: e.target.value })} placeholder="để trống nếu chỉ theo dõi" /></label>}
      <label>Dò số dư<select value={form.cachDo} onChange={e => dat({ cachDo: e.target.value as NguonKeyCachDo })}>
        {Object.entries(CACH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Hết hạn<input type="date" value={form.hetHan || ''} onChange={e => dat({ hetHan: e.target.value })} /></label>
      <label className="rong">Ghi chú<input value={form.ghiChu || ''} onChange={e => dat({ ghiChu: e.target.value })} /></label>
      <label className="chon"><input type="checkbox" checked={Boolean(form.tat)} onChange={e => dat({ tat: e.target.checked })} /> Tắt (bộ giao bỏ qua)</label>
      {loi && <p className="hm-loi rong">{loi}</p>}
      <div className="rong nut"><button type="submit" className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button><button type="button" onClick={() => setForm(null)}>Huỷ</button></div>
    </form>}
  </section>;
}
