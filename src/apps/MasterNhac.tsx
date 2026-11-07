import { useEffect, useRef, useState } from 'react';
import type { CatalogSong, MasterInput, MasterKetQua } from './types';
import './master-nhac.css';

type Row = { key: string; name: string; path?: string; songId?: string; result?: MasterKetQua; error?: string };
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);
export default function MasterNhac() {
  const bridge = window.manorApps;
  const [songs, setSongs] = useState<CatalogSong[]>([]), [rows, setRows] = useState<Row[]>([]);
  const [cach, setCach] = useState<MasterInput['cach']>('C'), [theLoai, setTheLoai] = useState('folk');
  const [songId, setSongId] = useState(''), [mau, setMau] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
  const lock = useRef(false), audioUrl = useRef('');
  useEffect(() => {
    bridge?.catalog().then(c => setSongs(c?.songs || []), e => setError(errorText(e)));
    return () => { if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); };
  }, [bridge]);
  const add = (items: Row[]) => setRows(old => [...old, ...items.filter(x => !old.some(r => r.key === x.key))]);
  const addPaths = (paths: string[]) => {
    const wavs = paths.filter(p => /\.wav$/i.test(p));
    if (wavs.length !== paths.length) setError('Chỉ nhận WAV.');
    add(wavs.map(path => ({ key: path, path, name: path.split(/[\\/]/).pop() || path })));
  };
  const pick = async () => { try { addPaths(await bridge?.masterChon?.() || []); } catch (e) { setError(errorText(e)); } };
  const master = async () => {
    if (!bridge?.masterChay || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      for (const row of rows.filter(r => !r.result)) {
        try {
          const result = await bridge.masterChay({ path: row.path, songId: row.songId, cach, theLoai, mau: cach === 'B' ? mau : undefined });
          setRows(old => old.map(r => r.key === row.key ? { ...r, result, error: '' } : r));
        } catch (e) { setRows(old => old.map(r => r.key === row.key ? { ...r, error: errorText(e) } : r)); }
      }
    } finally { lock.current = false; setBusy(false); }
  };
  const nghe = async (result: MasterKetQua, ban: 'truoc' | 'sau') => {
    if (!bridge?.masterNghe || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const bytes = await bridge.masterNghe(result.id, ban);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'audio/wav' }));
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = url; setPreview({ url, label: `${ban === 'truoc' ? 'Gốc' : 'Master'} · -14 LUFS` });
    } catch (e) { setError(errorText(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const originals = songs.filter(s => s.audio.some(a => a.label === 'Gốc' && /\.wav$/i.test(a.path)));
  const refs = songs.flatMap(s => s.audio.filter(a => a.label === 'Master' && /\.wav$/i.test(a.path)).map(a => ({ path: a.path, name: `${s.title} · ${s.singer}` })));
  return <section className="master-nhac" aria-label="Master nhạc">
    <h2>Master nhạc</h2><p>WAV gốc → Master.wav. C mặc định -14 LUFS, trần -1 dBTP. B khớp bài mẫu; A dùng mức của tool dự phòng.</p>
    {!bridge && <p role="alert">Mở trong ứng dụng máy tính để master.</p>}
    <fieldset disabled={busy}>
      <div className="mn-drop" onDragOver={e => e.preventDefault()} onDrop={e => {
        e.preventDefault(); if (busy) return;
        try { const paths = Array.from(e.dataTransfer.files).map(f => bridge?.masterFilePath?.(f) || (f as File & { path?: string }).path || '');
          if (paths.some(p => !p)) setError('Không lấy được đường dẫn, dùng nút Chọn WAV.'); else addPaths(paths);
        } catch (err) { setError(errorText(err)); }
      }}>Thả một hoặc nhiều WAV vào đây <button disabled={!bridge} onClick={pick}>Chọn WAV</button></div>
      <label>Bài trong kho <select value={songId} onChange={e => setSongId(e.target.value)}><option value="">Chọn bài có WAV gốc</option>{originals.map(s => <option key={s.id} value={s.id}>{s.title} · {s.singer}</option>)}</select></label>
      <button disabled={!songId} onClick={() => { const s = songs.find(x => x.id === songId)!; add([{ key: s.id, songId: s.id, name: `${s.title} · ${s.singer}` }]); }}>Thêm bài</button>
      <label>Cách master <select value={cach} onChange={e => setCach(e.target.value as MasterInput['cach'])}><option value="C">C — chuẩn mặc định</option><option value="B">B — theo bài mẫu</option><option value="A">A — dự phòng ffmpeg</option></select></label>
      {cach === 'C' && <label>Thể loại <select value={theLoai} onChange={e => setTheLoai(e.target.value)}>{['folk', 'pop', 'rnb', 'lo-fi', 'edm', 'rock', 'cinematic'].map(g => <option key={g}>{g}</option>)}</select></label>}
      {cach === 'B' && <label>Master mẫu trong kho <select value={mau} onChange={e => setMau(e.target.value)}><option value="">Chọn bài mẫu</option>{refs.map(r => <option key={r.path} value={r.path}>{r.name}</option>)}</select></label>}
      <button disabled={!bridge || !rows.some(r => !r.result) || (cach === 'B' && !mau)} onClick={master}>Master các bài chờ</button>
      <button onClick={() => setRows([])}>Dọn danh sách</button>
    </fieldset>
    {busy && <p role="status">Đang xử lý WAV…</p>}{error && <p role="alert">{error}</p>}
    {rows.map(row => <article key={row.key}><h3>{row.name}</h3>{row.error && <p role="alert">{row.error}</p>}
      {row.result ? <><p>{row.result.file}</p><table><thead><tr><th>Bản</th><th>LUFS</th><th>LRA</th><th>Đỉnh thật (dBTP)</th></tr></thead><tbody>{(['truoc', 'sau'] as const).map(b => <tr key={b}><th>{b === 'truoc' ? 'Gốc' : 'Master'}</th><td>{row.result![b].lufs}</td><td>{row.result![b].lra}</td><td>{row.result![b].peak}</td></tr>)}</tbody></table>
        <button disabled={busy} onClick={() => nghe(row.result!, 'truoc')}>Nghe gốc -14 LUFS</button><button disabled={busy} onClick={() => nghe(row.result!, 'sau')}>Nghe Master -14 LUFS</button></> : <p>Chờ master</p>}
    </article>)}
    {preview && <div><p>{preview.label} · chỉ chỉnh âm lượng</p><audio key={preview.url} controls autoPlay src={preview.url} onError={() => setError('Không nghe được WAV.')} /></div>}
  </section>;
}
