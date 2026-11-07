import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Disc3, FileText, Import, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { Album, AlbumDraft, LyricsRow } from './types';
import './lyrics-albums.css';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const key = (r: { songId: string; singer: string }) => `${r.songId}::${r.singer}`;

// Album: gom 1–50 bài trong kho thành một album / tuyển tập để phát hành (cờ YouTube, TuneCore) và xuất Word danh sách + lời.
// Lời bài hát không sửa ở đây nữa: lời lấy từ kho (dò tự động, thiếu thì chạy API). Dữ liệu album nằm trong <kho>/QuanLy.
export default function LyricsAlbums() {
  const bridge = window.manorApps;
  const [rows, setRows] = useState<LyricsRow[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const reload = () => { if (!bridge?.lyrics || !bridge.albums) return; Promise.all([bridge.lyrics(), bridge.albums()]).then(([r, a]) => { setRows(r); setAlbums(a); setError(''); }, e => setError(message(e))); };
  useEffect(reload, [bridge]);
  if (!bridge?.lyrics) return <section className="mini-app notes-app"><p className="apps-note warn">Album chỉ chạy trong bản Windows (Electron) của app.</p></section>;
  return <section className="mini-app notes-app" aria-label="Album">
    <div className="notes-tabs"><b><Disc3 size={14} /> Album</b><span className="grow" /><small>Gom bài thành album / tuyển tập để đăng YouTube, phát hành TuneCore và xuất Word</small></div>
    {error && <p className="apps-note warn" role="alert">{error}</p>}
    {notice && <p className="apps-note ok">{notice}</p>}
    <AlbumTab rows={rows} albums={albums} onChange={reload} onNotice={setNotice} onError={setError} />
  </section>;
}

const EMPTY: AlbumDraft = { name: '', tracks: [], youtubeEnabled: false, youtubeUrl: '', tuneCore: false, note: '' };

function AlbumTab({ rows, albums, onChange, onNotice, onError }: { rows: LyricsRow[]; albums: Album[]; onChange: () => void; onNotice: (t: string) => void; onError: (t: string) => void }) {
  const bridge = window.manorApps!;
  const [draft, setDraft] = useState<AlbumDraft | null>(null), [pick, setPick] = useState('');
  const run = async (work: () => Promise<string>) => { try { onNotice(await work()); onError(''); onChange(); } catch (e) { onError(message(e)); } };
  const label = (t: { songId: string; singer: string }) => { const r = rows.find(x => key(x) === key(t)); return r ? `${r.title} — ${r.singer || '?'}` : t.songId; };
  const suggestions = pick.trim() ? rows.filter(r => fold(`${r.title} ${r.singer}`).includes(fold(pick))).slice(0, 8) : [];
  const move = (i: number, d: number) => setDraft(a => { if (!a) return a; const t = [...a.tracks]; const [x] = t.splice(i, 1); t.splice(Math.max(0, Math.min(t.length, i + d)), 0, x); return { ...a, tracks: t }; });

  if (draft) return <div className="album-form">
    <div className="mini-toolbar"><b>{draft.id ? 'Sửa album' : 'Tạo album'}</b><span className="grow" /><button onClick={() => setDraft(null)}><X size={14} /> Hủy</button>
      <button className="primary" onClick={() => void run(async () => { const a = await bridge.saveAlbum!(draft); setDraft(null); return `Đã lưu album "${a.name}" (${a.tracks.length} bài).`; })}><Save size={14} /> Lưu album</button></div>
    <label>Tên album<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Tên album" /></label>
    <div className="album-flags">
      <label><input type="checkbox" checked={!!draft.youtubeEnabled} onChange={e => setDraft({ ...draft, youtubeEnabled: e.target.checked })} /> YouTube</label>
      <label><input type="checkbox" checked={!!draft.tuneCore} onChange={e => setDraft({ ...draft, tuneCore: e.target.checked })} /> TuneCore</label>
      {draft.youtubeEnabled && <input value={draft.youtubeUrl} onChange={e => setDraft({ ...draft, youtubeUrl: e.target.value })} placeholder="https://youtu.be/…" aria-label="Link YouTube" />}
    </div>
    <label>Ghi chú<input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label>
    <div className="album-tracks"><b>Bài trong album ({draft.tracks.length}/50)</b>
      <ol>{draft.tracks.map((t, i) => <li key={`${key(t)}-${i}`}><span>{i + 1}. {label(t)}</span>
        <button aria-label="Lên" onClick={() => move(i, -1)}><ArrowUp size={13} /></button><button aria-label="Xuống" onClick={() => move(i, 1)}><ArrowDown size={13} /></button>
        <button aria-label="Bỏ bài" onClick={() => setDraft({ ...draft, tracks: draft.tracks.filter((_, j) => j !== i) })}><X size={13} /></button></li>)}</ol>
      {draft.tracks.length < 50 && <div className="album-pick"><input value={pick} onChange={e => setPick(e.target.value)} placeholder="Gõ tên bài để thêm…" aria-label="Thêm bài" />
        {suggestions.length > 0 && <ul>{suggestions.map(r => <li key={key(r)}><button onClick={() => { setDraft({ ...draft, tracks: [...draft.tracks, { songId: r.songId, singer: r.singer, genre: r.genre }] }); setPick(''); }}>
          <Plus size={12} /> {r.title} <small>{r.singer}{r.hasLyrics ? '' : ' · chưa có lời'}</small></button></li>)}</ul>}</div>}
    </div>
  </div>;

  return <div className="album-list">
    <div className="mini-toolbar"><b>{albums.length} album</b><span className="grow" />
      <button onClick={() => void run(async () => { const n = await bridge.importOldAlbums!(); return n ? `Đã lấy ${n} album tuyển chọn từ kho cũ sang.` : 'Không còn album cũ nào chưa lấy.'; })}><Import size={14} /> Lấy album tuyển chọn cũ</button>
      <button className="primary" onClick={() => setDraft({ ...EMPTY })}><Plus size={14} /> Tạo album</button></div>
    <ul className="album-cards">{albums.map(a => <li key={a.id}>
      <div><b>{a.name}</b><small>{a.tracks.length} bài{a.youtubeEnabled ? ' · YouTube' : ''}{a.tuneCore ? ' · TuneCore' : ''}{a.note ? ` · ${a.note}` : ''}</small>
        <p>{a.tracks.slice(0, 4).map(t => t.titleSnapshot).join(' · ')}{a.tracks.length > 4 ? ' …' : ''}</p></div>
      <button onClick={() => setDraft({ id: a.id, name: a.name, tracks: a.tracks, youtubeEnabled: a.youtubeEnabled, youtubeUrl: a.youtubeUrl, tuneCore: a.tuneCore, note: a.note })}><Pencil size={13} /> Sửa</button>
      <button onClick={() => void run(async () => `Đã xuất ${await bridge.albumDocx!(a.id, true)}`)}><FileText size={13} /> Word</button>
      <button aria-label={`Xóa album ${a.name}`} onClick={() => { if (window.confirm(`Xóa album "${a.name}"? (bài trong kho không bị xóa)`)) void run(async () => { await bridge.removeAlbum!(a.id); return `Đã xóa album "${a.name}".`; }); }}><Trash2 size={13} /></button>
    </li>)}</ul>
    {!albums.length && <p className="apps-note">Chưa có album. Bấm "Lấy album tuyển chọn cũ" để chuyển album từ kho cũ sang, hoặc "Tạo album".</p>}
  </div>;
}
