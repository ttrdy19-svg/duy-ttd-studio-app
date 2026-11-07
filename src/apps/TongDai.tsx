import { useEffect, useState } from 'react';
import type { TongDaiCua, TongDaiData, TongDaiMail, TongDaiRequest } from './types';
import './tong-dai.css';
import AccountBook from '../hall/AccountBook';
import TramHanMuc from './TramHanMuc';
const tenVai: Record<string, string> = { code: 'Viết code', chat: 'Chat, đề xuất', plan: 'Lập kế hoạch', chu: 'Chữ', 've-anh': 'Vẽ ảnh', video: 'Video', nhep: 'Nhép', 'tra-web': 'Tra web', 'doc-repo': 'Đọc repo' };
export function TaiKhoanHanMuc({ initialTab = 'so' }: { initialTab?: 'so' | 'han-muc' | 'tong-dai' }) {
  const [tab, setTab] = useState(initialTab);
  const [warnings, setWarnings] = useState<NonNullable<TongDaiData['canhBaoGoi']>>([]);
  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => {
    let live = true;
    const read = () => window.manorApps?.tongDai?.().then(d => { if (live) setWarnings(d.canhBaoGoi || []); }, () => {});
    void read(); const timer = setInterval(read, 60000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  return <section className="tk-han-muc"><h2>Tài khoản &amp; hạn mức</h2>
    {tab !== 'tong-dai' && warnings.map(c => <p role="alert" key={c.id}>{c.chu} · {c.nguon} · {c.do === 'do-duoc' ? 'Đo thật' : 'Ước tính'} · Giờ đo: {gio(c.capNhat)}</p>)}
    <nav role="tablist" aria-label="Tài khoản và hạn mức">{([['so', 'Sổ tài khoản'], ['han-muc', 'Hạn mức'], ['tong-dai', 'Tổng đài']] as const).map(([id, label]) =>
      <button key={id} id={`tk-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="tk-panel" onClick={() => setTab(id)}>{label}</button>)}</nav>
    <div role="tabpanel" id="tk-panel" aria-labelledby={`tk-tab-${tab}`}>{tab === 'so' ? <AccountBook /> : tab === 'han-muc' ? <TramHanMuc /> : <TongDai />}</div>
  </section>;
}
const gio = (t: number | null) => t ? new Date(t).toLocaleString('vi-VN') : '—';
const tenSo: Record<string, string> = { pct: 'Đã dùng (%)', pct5h: 'Đã dùng 5 giờ (%)', pctTuan: 'Đã dùng tuần (%)', tokenHomNay: 'Token hôm nay', token5h: 'Token khối 5 giờ', hoi5h: 'Hồi cửa sổ 5 giờ', hoiTuan: 'Hồi cửa sổ tuần', hoiLai: 'Hồi hạn mức', capNhat: 'Đo lúc', hetLuc: 'Báo hết lúc', luotHomNay: 'Lượt hôm nay', conLai: 'Còn lại', daDung: 'Đã dùng hôm nay' };
export function TongDai() {
  const [data, setData] = useState<TongDaiData | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [vai, setVai] = useState('');
  async function gui(req: TongDaiRequest = {}) {
    if (!window.manorApps?.tongDai) { setError('Mở bản desktop để dùng Tổng đài.'); return; }
    setBusy(true);
    try { setData(await window.manorApps.tongDai(req)); setError(''); }
    catch { setError('Không cập nhật được. Nhãn không được chứa @ hoặc bí mật; mã mail phải là SHA-256 ngắn hợp lệ.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let live = true;
    const read = () => window.manorApps?.tongDai?.().then(d => { if (live) setData(d); }, () => { if (live) setError('Không đọc được Tổng đài.'); });
    if (!window.manorApps?.tongDai) setError('Mở bản desktop để dùng Tổng đài.');
    void read(); const timer = setInterval(read, 30000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  const loc = (c: TongDaiCua) => !vai || data?.vaiCua?.[vai]?.some(l => l === c.loai || l === 'api:*' && c.loai.startsWith('api:'));
  function cua(c: TongDaiCua) {
    return <article className="td-cua" key={c.id}>
      <div className="td-cua-title"><span className={`td-den ${c.tinhTrang === 'san' && ((c.soDo.pct ?? 0) >= 80 || (c.soDo.pct5h ?? 0) >= 80 || (c.soDo.pctTuan ?? 0) >= 80) ? 'gan-het' : c.tinhTrang}`} title={c.lyDo || c.tinhTrang} /> <strong>{c.loai}</strong> · {c.dungDe}</div>
      <p title={c.nhom}>Nhóm hạn mức: {c.nhom}{c.chungVoi.length > 0 && <><br />Chung với {c.chungVoi.join(', ')}</>}</p>
      <p>{({ san: 'Sẵn sàng', nghi: 'Đang nghỉ', loi: 'Có lỗi', tat: 'Đã tắt / mail không hoạt động' })[c.tinhTrang]}{c.nghiDen ? ` · Nghỉ tới ${gio(c.nghiDen)}` : ''}{c.lyDo ? ` · ${c.lyDo}` : ''}</p>
      <p className="td-vitri" title="Chỉ lưu vị trí chứng thực, không đọc cookie">{Object.entries(c.chungThuc).map(([k, v]) => `${k}: ${v || 'Chưa rõ'}`).join(' · ') || 'Chưa rõ vị trí chứng thực'}</p>
      <p>Nguồn: {c.nguonDo || 'Chưa ghi nguồn'} · {c.loaiDo === 'do-duoc' ? 'Đo thật' : 'Ước tính / chưa đo'} · Giờ đo: {gio(c.soDo.capNhat)}</p>
      <div className="td-so-do">{Object.keys(c.soDo).length ? Object.entries(c.soDo).map(([k, v]) => <span key={k} title="Số đo từ Trạm hạn mức">{tenSo[k] || k}: {v === null ? 'Chưa đo' : /hoi|capNhat|hetLuc/.test(k) ? gio(v) : v.toLocaleString('vi-VN')}</span>) : <span>Trạm hạn mức: chưa có số đo</span>}</div>
      <p>Hôm nay: {c.homNay.ok} việc thành công · {c.homNay.hetLuot} lần hết hạn mức · Nguồn: nhật ký gọi Tổng đài · Đo thật lúc {gio(data?.luc || null)}</p>
      <div className="td-actions">
        <button disabled={busy} title="Bật/tắt riêng cửa này; không thay tình trạng mail" onClick={() => void gui({ action: 'tat', id: c.id, tat: !c.tat })}>{c.tat ? 'Bật cửa' : 'Tắt cửa'}</button>
        <button disabled={busy} title="Cho cả nhóm hạn mức nghỉ một giờ" onClick={() => void gui({ action: 'nghi', id: c.id, nghiDen: Date.now() + 3600000 })}>Cho nghỉ 1 giờ</button>
        <button disabled={busy} title="Gọi lại cả nhóm; số đo đang hết vẫn được ưu tiên" onClick={() => void gui({ action: 'goi-lai', id: c.id })}>Gọi lại nhóm</button>
        <label title="Gắn cửa vào một mail đã nhận diện; chỉ dùng mã băm">Gắn mail <select value={c.mail || ''} disabled={busy} onChange={e => void gui({ action: 'gan-mail', id: c.id, ma: e.target.value })}><option value="" disabled>Chưa rõ mail</option>{data?.mail?.map(m => <option value={m.ma} key={m.ma}>{m.nhan}</option>)}</select></label>
      </div>
    </article>;
  }
  function mail(m: TongDaiMail) {
    const cs = m.cua.filter(loc); if (!cs.length && vai) return null;
    return <article className="td-mail" key={m.ma}>
      <h3>{m.nhan} <small>{m.tinhTrang === 'ok' ? 'Hoạt động' : m.tinhTrang === 'khoa' ? 'Khoá' : 'Hết hạn'}</small></h3>
      <p>{m.goi.map(g => `${g.loai}${g.hetHan ? ` (hết hạn ${g.hetHan})` : ''}`).join(' · ') || 'Chưa rõ gói'}</p>
      <form className="td-actions" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void gui({ action: 'mail', ma: m.ma, nhan: String(f.get('nhan')), tinhTrang: String(f.get('tinhTrang')) as TongDaiMail['tinhTrang'] }); }}>
        <input key={m.nhan} name="nhan" aria-label={`Nhãn ${m.nhan}`} title="Nhãn do mày đặt, không nhập email" defaultValue={m.nhan} required maxLength={60} pattern="[^@]+" />
        <select key={m.tinhTrang} name="tinhTrang" aria-label={`Tình trạng ${m.nhan}`} defaultValue={m.tinhTrang}><option value="ok">Hoạt động</option><option value="khoa">Khoá mọi cửa</option><option value="het-han">Hết hạn mọi cửa</option></select>
        <button disabled={busy}>Lưu mail</button>
      </form>{cs.map(cua)}
    </article>;
  }
  // Giữ giao diện đọc dữ liệu bản 1 khi tiến trình desktop chưa được khởi động lại.
  if (data && !data.cua) return <section className="tong-dai"><h2>Tổng đài</h2>{data.tho.map(t => <article key={t.id}>{t.id} · Nghỉ tới {gio(t.nghiDen)} <button disabled={busy} onClick={() => void gui({ action: 'goi-lai', id: t.id })}>Gọi lại ngay</button></article>)}
    {Object.entries(data.vai).map(([v, ds]) => <div key={v}>{ds.map((id,i) => <button key={id} title={`Đưa ${id} xuống một bậc`} disabled={busy || i === ds.length-1} onClick={() => { const hang = [...ds]; [hang[i], hang[i+1]] = [hang[i+1], hang[i]]; void gui({ action: 'vai', vai:v, hang }); }}>Xuống</button>)}</div>)}
    {data.web.map(a => <form key={a.id+a.trang} onSubmit={e => { e.preventDefault(); void gui({ action:'web', id:a.id, trang:a.trang, soLieu:{ credits:Number(new FormData(e.currentTarget).get('credits')) } }); }}><input type="number" name="credits" aria-label={`Tín dụng ${a.trang} ${a.id}`} defaultValue={a.credits ?? ''} /><button disabled={busy}>Lưu</button></form>)}
  </section>;
  return <section className="tong-dai"><h2>Tổng đài · Mail → Cửa → Hạn mức</h2>
    {data?.canhBaoGoi?.map(c => <p role="alert" key={c.id}>{c.chu} · {c.nguon} · {c.do === 'do-duoc' ? 'Đo thật' : 'Ước tính'} · {gio(c.capNhat)}</p>)}
    <p>ChatGPT web và Codex có hạn mức riêng. Claude web và Claude Code dùng chung hạn mức theo mail. Không nhập email, token, cookie hoặc key ở đây.</p>
    {error && <p role="alert">{error}</p>}
    <div className="td-actions"><label>Lọc theo vai <select value={vai} onChange={e => setVai(e.target.value)}><option value="">Tất cả</option>{Object.entries(tenVai).map(([k,v]) => <option value={k} key={k}>{v}</option>)}</select></label><button disabled={busy} onClick={() => void gui()}>Đọc lại số đo</button></div>
    <div className="td-mails">{data?.mail?.map(mail)}{data?.cua?.some(c => !c.mail && loc(c)) && <article className="td-mail"><h3>Chưa rõ mail</h3><p>Chọn “Gắn mail” ở từng cửa để ghép với mail đã nhận diện.</p>{data.cua?.filter(c => !c.mail && loc(c)).map(cua)}</article>}</div>
    <details><summary>Thứ tự loại cửa theo vai</summary><div className="tong-dai-vai">{Object.entries(data?.vaiCua || {}).map(([v, hang]) => <article key={v}><h4>{tenVai[v]}</h4><ol>{hang.map((l,i) => <li key={l}>{l} <button disabled={busy || i === 0} title="Đưa loại cửa này lên trước" onClick={() => { const ds = [...hang]; [ds[i-1],ds[i]] = [ds[i],ds[i-1]]; void gui({ action: 'vai-cua', vai: v, hang: ds }); }}>Lên</button><button disabled={busy || i === hang.length-1} title="Đưa loại cửa này xuống sau" onClick={() => { const ds = [...hang]; [ds[i+1],ds[i]] = [ds[i],ds[i+1]]; void gui({ action: 'vai-cua', vai: v, hang: ds }); }}>Xuống</button></li>)}</ol></article>)}</div></details>
  </section>;
}

export default TongDai;
