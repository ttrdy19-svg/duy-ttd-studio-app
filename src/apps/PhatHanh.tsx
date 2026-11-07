import { useEffect, useRef, useState } from 'react';
import type { CatalogSong, PhatHanhRec } from './types';
import './phat-hanh.css';
const msg = (e: unknown) => e instanceof Error ? e.message : String(e);
export default function PhatHanh() {
  const bridge = window.manorApps;
  const [rows, setRows] = useState<PhatHanhRec[]>([]), [songs, setSongs] = useState<CatalogSong[]>([]);
  const [url, setUrl] = useState(''), [bai, setBai] = useState(''), [caSi, setCaSi] = useState(''), [ghi, setGhi] = useState('');
  const [checked, setChecked] = useState<{ url: string; records: PhatHanhRec[] } | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [filterBai, setFilterBai] = useState(''), [filterPlatform, setFilterPlatform] = useState(''), [filterSinger, setFilterSinger] = useState('');
  const lock = useRef(false);
  useEffect(() => { if (bridge) { bridge.phatHanhDs?.().then(setRows, e => setError(msg(e))); bridge.catalog().then(c => setSongs(c?.songs || []), e => setError(msg(e))); } }, [bridge]);
  useEffect(() => {
    let active = true; setChecked(null);
    if (!/^https?:\/\//i.test(url.trim())) return;
    bridge?.phatHanhKiem?.(url.trim()).then(records => { if (active) { setChecked({ url: url.trim(), records }); setError(''); } }, e => { if (active) setError(msg(e)); });
    return () => { active = false; };
  }, [url, bridge]);
  const save = async () => {
    if (!bridge?.phatHanhThem || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const r = await bridge.phatHanhThem({ url: url.trim(), bai: bai.trim(), caSi: caSi.trim(), ghi: ghi.trim() });
      setNotice(r.trung ? 'ĐÃ CÓ — không ghi lại.' : 'ĐÃ GHI');
      setChecked({ url: url.trim(), records: [r.rec] }); setRows(await bridge.phatHanhDs!());
    } catch (e) { setError(msg(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const validCheck = checked?.url === url.trim() ? checked : null;
  const list = rows.filter(r => r.bai.toLocaleLowerCase().includes(filterBai.toLocaleLowerCase()) && (!filterPlatform || r.nenTang === filterPlatform) && (!filterSinger || r.caSi === filterSinger));
  return <section className="phat-hanh" aria-label="Chỉ mục phát hành"><h2>Chỉ mục phát hành</h2><p>Ghi link đã phát hành vào kho; cùng mã video chỉ ghi một lần.</p>
    {!bridge && <p role="alert">Mở trong ứng dụng máy tính để dùng chỉ mục.</p>}
    <fieldset disabled={busy}><label>Link phát hành<input value={url} onChange={e => { setUrl(e.target.value); setNotice(''); }} placeholder="https://…" /></label>
      {url && <div role="status">{validCheck ? validCheck.records.length ? 'ĐÃ CÓ' : 'CHƯA CÓ' : /^https?:\/\//i.test(url.trim()) ? 'Đang kiểm…' : 'Nhập link HTTP/HTTPS'}{validCheck?.records.map(r => <p key={r.ma}>{r.ngay} · {r.bai} · {r.caSi} · {r.ghi}</p>)}</div>}
      <label>Bài hát<input list="ph-bai" value={bai} onChange={e => { setBai(e.target.value); const s = songs.find(s => s.title === e.target.value); if (s) setCaSi(s.singer); }} /></label><datalist id="ph-bai">{[...new Set(songs.map(s => s.title))].map(t => <option key={t} value={t} />)}</datalist>
      <label>Ca sĩ<input list="ph-ca-si" value={caSi} onChange={e => setCaSi(e.target.value)} /></label><datalist id="ph-ca-si">{[...new Set(songs.map(s => s.singer))].map(t => <option key={t} value={t} />)}</datalist>
      <label>Ghi chú<textarea value={ghi} onChange={e => setGhi(e.target.value)} /></label>
      <button disabled={!bridge || !bai.trim() || !validCheck || !!validCheck.records.length} onClick={save}>{busy ? 'Đang ghi…' : 'Ghi'}</button>
    </fieldset>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="ph-filters"><label>Lọc bài<input value={filterBai} onChange={e => setFilterBai(e.target.value)} /></label><label>Nền tảng<select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}><option value="">Tất cả</option>{[...new Set(rows.map(r => r.nenTang))].map(t => <option key={t}>{t}</option>)}</select></label><label>Lọc ca sĩ<select value={filterSinger} onChange={e => setFilterSinger(e.target.value)}><option value="">Tất cả</option>{[...new Set(rows.map(r => r.caSi).filter(Boolean))].map(t => <option key={t}>{t}</option>)}</select></label></div>
    <p>{list.length} bản ghi</p><div className="ph-table"><table><thead><tr><th>Ngày</th><th>Bài</th><th>Ca sĩ</th><th>Nền tảng</th><th>Link</th><th>Ghi chú</th></tr></thead><tbody>{list.map(r => <tr key={r.ma}><td>{r.ngay}</td><td>{r.bai}</td><td>{r.caSi}</td><td>{r.nenTang}</td><td><a href={r.url} onClick={e => { e.preventDefault(); bridge?.moLink?.(r.url).catch(e => setError(msg(e))); }}>{r.url}</a></td><td>{r.ghi}</td></tr>)}</tbody></table></div>
  </section>;
}
