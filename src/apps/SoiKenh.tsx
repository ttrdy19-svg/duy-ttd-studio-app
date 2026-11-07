import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ExternalLink, MonitorPlay, RefreshCw, Sparkles } from 'lucide-react';
import type { AccountView, KenhSoi, NhanXetKenh, YoutubeChannel } from './types';
import { KENH_YOUTUBE, kenhDung } from '../gallery/kenh';
import './soi-kenh.css';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const num = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString('vi-VN');
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
interface Kenh { name: string; accountId: string; channel: YoutubeChannel }

// 5 kênh YouTube từ Sổ tài khoản: mỗi tên trong KENH_YOUTUBE lấy kênh có handle, ưu tiên kênh đã chọn để đăng.
export function kenhTuSo(view: AccountView): Kenh[] {
  const all = view.accounts.flatMap(a => (a.sites.youtube?.channels || []).filter(c => c.handle).map(c => ({ accountId: a.id, channel: c, name: kenhDung(c.name) })));
  return KENH_YOUTUBE.map(name => all.filter(x => x.name === name).sort((a, b) => Number(b.channel.selected) - Number(a.channel.selected))[0]).filter(Boolean).map(x => ({ name: x!.name!, accountId: x!.accountId, channel: x!.channel }));
}

// Soi kênh YouTube (mini app trong app, thay Mộc Channel Desk chạy riêng): số liệu công khai của 5 kênh, video nổi/chìm,
// Gemini nhận xét một kênh hoặc so sánh cả 5; nút mở Studio đúng kênh trong profile Cốc Cốc của kênh đó.
export default function SoiKenh() {
  const bridge = window.manorApps;
  const [kenh, setKenh] = useState<Kenh[]>([]);
  const [data, setData] = useState<Record<string, KenhSoi>>({});
  const [chon, setChon] = useState('');
  const [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [hoi, setHoi] = useState('');
  const [nhanXet, setNhanXet] = useState<{ title: string; result: NhanXetKenh } | null>(null);

  async function tai(list = kenh) {
    if (!bridge?.soiKenh || !list.length) return;
    setBusy('tai'); setError('');
    try { const rows = await bridge.soiKenh(list.map(k => k.channel.handle)); setData(Object.fromEntries(rows.map(r => [r.handle, r]))); }
    catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  useEffect(() => {
    if (!bridge?.accounts) return;
    bridge.accounts().then(view => { const list = kenhTuSo(view); setKenh(list); setChon(list[0]?.channel.handle || ''); void tai(list); }, e => setError(message(e)));
  }, [bridge]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = data[chon], currentKenh = kenh.find(k => k.channel.handle === chon);
  const mid = useMemo(() => median((current?.videos || []).map(v => v.views || 0)), [current]);
  if (!bridge?.soiKenh) return <section className="soi-kenh"><p className="apps-note warn">Soi kênh chỉ chạy trong bản Windows (Electron) của app.</p></section>;

  async function hoiAi(all: boolean) {
    const channels = all ? kenh.map(k => data[k.channel.handle]).filter(c => c && !c.error) : current ? [current] : [];
    if (!channels.length) return;
    setBusy(all ? 'ai-all' : 'ai'); setError('');
    try { setNhanXet({ title: all ? 'So sánh 5 kênh' : current!.name || chon, result: await bridge!.nhanXetKenh(channels, hoi) }); }
    catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  const open = (url?: string) => currentKenh && bridge!.openInAccount(currentKenh.accountId, url ? { url, cuaSo: true } : { channel: currentKenh.channel, cuaSo: true }).catch(e => setError(message(e)));

  return <section className="soi-kenh" aria-label="Soi kênh YouTube">
    <header className="sk-head">
      <div><h2><MonitorPlay size={20} /> Soi kênh YouTube</h2><p>Số liệu công khai của {kenh.length} kênh, đọc thẳng từ YouTube (không mở trình duyệt). Giờ xem, CTR, doanh thu chỉ có trong Studio.</p></div>
      <button onClick={() => void tai()} disabled={!!busy}><RefreshCw size={14} /> {busy === 'tai' ? 'Đang đọc…' : 'Làm mới'}</button>
    </header>
    {error && <p className="apps-note warn" role="alert">{error}</p>}
    {!kenh.length && <p className="apps-note">Chưa thấy kênh nào trong Sổ tài khoản. Bấm "Kiểm tra" ở Sổ tài khoản để app đọc danh sách kênh YouTube.</p>}

    <div className="sk-cards">{kenh.map(k => { const c = data[k.channel.handle]; const views = (c?.videos || []).map(v => v.views || 0);
      return <button key={k.channel.handle} className={k.channel.handle === chon ? 'on' : ''} onClick={() => setChon(k.channel.handle)}>
        {c?.avatar ? <img src={c.avatar} alt="" /> : <span className="sk-noimg" />}
        <b>{c?.name || k.name}</b><small>{k.channel.handle}</small>
        {c?.error ? <em className="bad">{c.error}</em> : <span className="sk-nums">
          <span><i>Đăng ký</i>{c?.subscribersText ? num(c.subscribers) : 'ẩn'}</span>
          <span><i>Video</i>{c?.videoCountText?.replace(/\s*video/i, '') || '—'}</span>
          <span><i>TB xem</i>{views.length ? num(Math.round(views.reduce((a, b) => a + b, 0) / views.length)) : '—'}</span>
        </span>}
        {c?.videos[0] && <small className="sk-last">Mới nhất: {c.videos[0].age}</small>}
      </button>; })}</div>

    {current && !current.error && <div className="sk-body">
      <div className="sk-videos">
        <div className="sk-bar"><b>{current.name}</b><span>{current.videos.length} video mới nhất · trung vị {num(mid)} lượt xem</span><span className="grow" />
          <button onClick={() => void open()}><BarChart3 size={13} /> Mở Studio</button>
          <button onClick={() => void open(`https://www.youtube.com/${current.handle}`)}><ExternalLink size={13} /> Mở kênh</button></div>
        <ol>{current.videos.map(v => { const ratio = mid ? (v.views || 0) / mid : 0;
          return <li key={v.id} className={ratio >= 2 ? 'hot' : ratio > 0 && ratio <= 0.5 ? 'cold' : ''}>
            {v.thumb ? <img src={v.thumb} alt="" loading="lazy" /> : <span className="sk-noimg" />}
            <div><b title={v.title}>{v.title}</b><small>{v.age} · {v.length}</small>
              <span className="sk-meter"><span style={{ width: `${Math.min(100, ratio * 50)}%` }} /></span></div>
            <strong>{num(v.views)}{ratio >= 2 && <i>nổi ×{ratio.toFixed(1)}</i>}{ratio > 0 && ratio <= 0.5 && <i>chìm</i>}</strong>
          </li>; })}</ol>
      </div>
      <aside className="sk-ai">
        <h3><Sparkles size={15} /> Nhận xét AI</h3>
        <textarea value={hoi} onChange={e => setHoi(e.target.value)} placeholder="Hỏi thêm (không bắt buộc): vd. nên đăng giờ nào, tiêu đề kiểu gì cho kênh này…" aria-label="Câu hỏi thêm" />
        <div className="sk-ai-btns">
          <button className="primary" onClick={() => void hoiAi(false)} disabled={!!busy}>{busy === 'ai' ? 'Đang xem…' : 'Nhận xét kênh này'}</button>
          <button onClick={() => void hoiAi(true)} disabled={!!busy || kenh.length < 2}>{busy === 'ai-all' ? 'Đang so…' : `So sánh ${kenh.length} kênh`}</button>
        </div>
        {nhanXet && <div className="sk-result">
          <h4>{nhanXet.title}</h4>
          {nhanXet.result.tomTat && <p>{nhanXet.result.tomTat}</p>}
          {([['Điểm mạnh', nhanXet.result.diemManh], ['Vấn đề', nhanXet.result.vanDe], ['Nên làm tuần tới', nhanXet.result.nenLam], ['Video nổi bật', nhanXet.result.videoNoiBat]] as const)
            .filter(([, items]) => items?.length).map(([label, items]) => <section key={label}><b>{label}</b><ul>{items!.map((x, i) => <li key={i}>{x}</li>)}</ul></section>)}
        </div>}
      </aside>
    </div>}
  </section>;
}
