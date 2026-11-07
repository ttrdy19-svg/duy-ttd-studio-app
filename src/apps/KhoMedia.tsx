import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, FolderOpen, Link2, Minus, Plus, RefreshCw, Search, Upload, X } from 'lucide-react';
import type { CatalogSong, MediaItem } from './types';
import './kho-media.css';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const bareTitle = (t: string) => t.replace(/\s*\([^)]*\)\s*$/, '');
type Loai = '' | 'minhhoa' | 'thumb' | 'anh' | 'rieng' | 'video';
const LOAI: [Loai, string, string][] = [['', 'Tất cả', 'Mọi ảnh và video'], ['minhhoa', 'Ảnh minh họa', 'Ảnh minh họa đã chọn của từng bài (ảnh gốc làm thumbnail)'],
  ['thumb', 'Thumbnail', 'Thumbnail có tên bài: 16:9, 9:16, 1:1, 2:3, 4:3 và thumb MV / TikTok / DistroKid'], ['anh', 'Ảnh khác trong bài', 'Ảnh khác nằm trong thư mục bài'],
  ['rieng', 'Ảnh riêng', 'Ảnh chủ tịch đưa riêng, nằm trong thư mục Kho media'], ['video', 'Video', 'Video trong thư mục bài hoặc Kho media']];
const KIND_LABEL: Record<MediaItem['kind'], string> = { minhhoa: 'Ảnh minh họa', thumb: 'Thumbnail', anh: 'Ảnh', rieng: 'Ảnh riêng', video: 'Video' };

// Ô lưới: chỉ xin ảnh nhỏ khi ô lọt vào màn hình (ảnh gốc 1920×1080 cả trăm cái làm app nặng).
function Thumb({ item, onOpen, title, sub }: { item: MediaItem; onOpen: () => void; title: string; sub: string }) {
  const ref = useRef<HTMLButtonElement>(null), [src, setSrc] = useState('');
  useEffect(() => {
    const el = ref.current, bridge = window.manorApps; if (!el || !bridge?.khoMediaNho) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect(); bridge.khoMediaNho!(item.path).then(setSrc, () => setSrc(item.loai === 'anh' ? item.url : '')); }, { rootMargin: '300px' });
    io.observe(el); return () => io.disconnect();
  }, [item.path, item.url, item.loai]);
  return <button ref={ref} className="km-tile" onClick={onOpen} title={`${title}\n${item.name}${item.songs.length > 1 ? `\nDùng cho ${item.songs.length} bài` : ''}${item.note ? `\nGhi chú: ${item.note}` : ''}`}>
    <span className="km-img">{src ? <img src={src} alt="" /> : <i />}{item.loai === 'video' && <em>▶ Video</em>}{item.ratio && <em className="ratio">{item.ratio}</em>}</span>
    <b>{title}</b><small>{sub}{item.songs.length > 1 ? ` · ${item.songs.length} bài` : ''}</small></button>;
}

// Kho media: mọi ảnh / video theo bài (ảnh minh họa, 5 thumbnail, ảnh khác, video) + ảnh / video riêng. Xem trước phóng to / thu nhỏ;
// lấy file = mở đúng thư mục đang chứa (thư mục bài, hoặc thư mục Kho media với file không theo bài). Một file gắn được nhiều bài.
export default function KhoMedia() {
  const bridge = window.manorApps;
  const [items, setItems] = useState<MediaItem[]>([]), [songs, setSongs] = useState<CatalogSong[]>([]);
  const [loai, setLoai] = useState<Loai>(''), [singer, setSinger] = useState(''), [ratio, setRatio] = useState(''), [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null), [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');

  async function load() {
    if (!bridge?.khoMedia) return;
    setBusy('tai'); setError('');
    try { const [list, catalog] = await Promise.all([bridge.khoMedia(), bridge.catalog()]); setItems(list); setSongs(catalog?.songs || []); }
    catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs]);
  const singers = useMemo(() => [...new Set(songs.map(s => s.singer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [songs]);
  const titleOf = (m: MediaItem) => { const s = m.songs.map(id => byId.get(id)).find(Boolean); return s ? bareTitle(s.title) : m.name.replace(/\.\w+$/, ''); };
  const needle = fold(query.trim());
  const shown = items.filter(m => (!loai || m.kind === loai) && (!ratio || m.ratio === ratio)
    && (!singer || m.songs.some(id => byId.get(id)?.singer === singer))
    && (!needle || fold([m.name, m.note, ...m.songs.map(id => byId.get(id)?.title || '')].join(' ')).includes(needle)));
  const count = (l: Loai) => items.filter(m => !l || m.kind === l).length;
  const index = shown.findIndex(m => m.path === open), current = index >= 0 ? shown[index] : null;

  async function nhap() {
    setError(''); setNotice('');
    try { const added = await bridge!.khoMediaNhap!([], ''); if (added.length) { setNotice(`Đã thêm ${added.length} file vào Kho media.`); await load(); } }
    catch (e) { setError(message(e)); }
  }

  if (!bridge?.khoMedia) return <section className="kho-media"><p className="apps-note warn">Kho media chỉ chạy trong bản Windows (Electron) của app.</p></section>;
  return <section className="kho-media" aria-label="Kho media">
    <aside className="km-rail">
      <label className="km-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên bài, tên file, ghi chú" aria-label="Tìm media" /></label>
      <button className="km-add" onClick={() => void nhap()} title="Chọn ảnh / video trên máy để chép vào thư mục Kho media (E:\AI Kho Media). Gắn bài sau trong khung xem."><Upload size={14} /> Thêm ảnh / video</button>
      <h3>Loại</h3>
      <ul>{LOAI.map(([id, name, tip]) => <li key={id || 'all'}><button aria-pressed={loai === id} title={tip} onClick={() => setLoai(id)}><span>{name}</span><small>{count(id)}</small></button></li>)}</ul>
      {(loai === '' || loai === 'thumb') && <><h3>Khung thumbnail</h3>
        <div className="km-chips">{['', '16:9', '9:16', '1:1', '2:3', '4:3'].map(r => <button key={r || 'all'} aria-pressed={ratio === r} title={r ? `Chỉ hiện thumbnail khung ${r}` : 'Mọi khung'} onClick={() => setRatio(r)}>{r || 'Tất cả'}</button>)}</div></>}
      <h3>Ca sĩ</h3>
      <ul>{['', ...singers].map(s => <li key={s || 'all'}><button aria-pressed={singer === s} title={s ? `Chỉ hiện media của bài ca sĩ ${s}` : 'Mọi ca sĩ'} onClick={() => setSinger(s)}><span>{s || 'Tất cả ca sĩ'}</span></button></li>)}</ul>
    </aside>
    <div className="km-main">
      <div className="km-bar"><b>{shown.length} file</b>
        <button onClick={() => void load()} disabled={busy === 'tai'} title="Đọc lại thư mục các bài và Kho media"><RefreshCw size={13} /> {busy === 'tai' ? 'Đang đọc…' : 'Làm mới'}</button></div>
      {error && <p className="apps-note warn">{error}</p>}
      {notice && <p className="apps-note">{notice}</p>}
      {!shown.length && busy !== 'tai' && <p className="km-empty">Chưa có ảnh / video nào khớp bộ lọc. Ảnh của bài có sau khi bấm “Làm ảnh + thumb” trong Kho nhạc.</p>}
      <div className="km-grid">{shown.map(m => <Thumb key={m.path} item={m} title={titleOf(m)} onOpen={() => setOpen(m.path)}
        sub={[KIND_LABEL[m.kind], m.songs[0] ? byId.get(m.songs[0])?.singer : 'Không theo bài'].filter(Boolean).join(' · ')} />)}</div>
    </div>
    {current && <Viewer key={current.path} item={current} songs={songs} byId={byId} title={titleOf(current)}
      onClose={() => setOpen(null)} onPrev={index > 0 ? () => setOpen(shown[index - 1].path) : undefined} onNext={index < shown.length - 1 ? () => setOpen(shown[index + 1].path) : undefined}
      onSaved={async () => { await load(); }} onError={setError} />}
  </section>;
}

// Khung xem: lăn chuột / nút +− để phóng to thu nhỏ quanh con trỏ, kéo để di ảnh, nhấp đúp về vừa khung; ← → chuyển file, Esc đóng.
function Viewer({ item, songs, byId, title, onClose, onPrev, onNext, onSaved, onError }: { item: MediaItem; songs: CatalogSong[]; byId: Map<string, CatalogSong>; title: string;
  onClose: () => void; onPrev?: () => void; onNext?: () => void; onSaved: () => Promise<void>; onError: (s: string) => void }) {
  const bridge = window.manorApps!;
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [linked, setLinked] = useState<string[]>(item.songs), [note, setNote] = useState(item.note), [find, setFind] = useState(''), [saving, setSaving] = useState(false), [copied, setCopied] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowLeft') onPrev?.(); else if (e.key === 'ArrowRight') onNext?.(); else if (e.key === '+' || e.key === '=') zoomBy(1.25); else if (e.key === '-') zoomBy(0.8); else if (e.key === '0') reset(); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const zoomBy = (k: number) => setZoom(z => Math.min(8, Math.max(0.2, z * k)));
  const wheel = (e: React.WheelEvent) => {
    const r = e.currentTarget.getBoundingClientRect(), cx = e.clientX - r.left - r.width / 2, cy = e.clientY - r.top - r.height / 2, k = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const next = Math.min(8, Math.max(0.2, zoom * k)), f = next / zoom;
    setPan(p => ({ x: cx - (cx - p.x) * f, y: cy - (cy - p.y) * f })); setZoom(next);
  };
  const owner = item.owner, needle = fold(find.trim());
  const matches = needle ? songs.filter(s => !linked.includes(s.id) && fold(`${s.title} ${s.singer}`).includes(needle)).slice(0, 8) : [];
  const dirty = note !== item.note || linked.join() !== item.songs.join();
  async function save() {
    setSaving(true);
    try { await bridge.khoMediaGan!(item.path, linked, note); await onSaved(); } catch (e) { onError(message(e)); } finally { setSaving(false); }
  }
  return <div className="km-viewer" role="dialog" aria-label={`Xem ${item.name}`}>
    <div className="km-stage" onWheel={item.loai === 'anh' ? wheel : undefined} onDoubleClick={reset}
      onPointerDown={e => { if (item.loai !== 'anh') return; drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { const d = drag.current; if (d) setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }); }}
      onPointerUp={() => { drag.current = null; }}>
      {item.loai === 'anh' ? <img src={item.url} alt={item.name} draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
        : <video src={item.url} controls autoPlay />}
      {onPrev && <button className="km-nav prev" aria-label="File trước" title="File trước (←)" onClick={e => { e.stopPropagation(); onPrev(); }}><ChevronLeft size={28} /></button>}
      {onNext && <button className="km-nav next" aria-label="File sau" title="File sau (→)" onClick={e => { e.stopPropagation(); onNext(); }}><ChevronRight size={28} /></button>}
      {item.loai === 'anh' && <div className="km-zoom">
        <button onClick={() => zoomBy(0.8)} aria-label="Thu nhỏ" title="Thu nhỏ (−)"><Minus size={14} /></button>
        <span title="Mức phóng">{Math.round(zoom * 100)}%</span>
        <button onClick={() => zoomBy(1.25)} aria-label="Phóng to" title="Phóng to (+)"><Plus size={14} /></button>
        <button onClick={reset} title="Vừa khung (0 hoặc nhấp đúp)">Vừa khung</button></div>}
    </div>
    <aside className="km-side">
      <button className="km-close" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)"><X size={16} /></button>
      <h2>{title}</h2>
      <p className="km-kind">{KIND_LABEL[item.kind]}{item.ratio ? ` · khung ${item.ratio}` : ''} · {(item.size / 1048576).toFixed(1)} MB</p>
      <p className="km-path" title={item.path}>{item.name}<small>{item.folder}</small></p>
      <div className="km-actions">
        <button className="primary" onClick={() => void bridge.khoMediaMo!(item.path).catch(e => onError(message(e)))}
          title={owner ? 'Mở thư mục bài đang chứa file này (file được chọn sẵn)' : 'Mở thư mục Kho media đang chứa file này (file được chọn sẵn)'}><FolderOpen size={14} /> Lấy file (mở thư mục)</button>
        <button onClick={() => { void navigator.clipboard.writeText(item.path); setCopied(true); }} title="Chép đường dẫn đầy đủ của file"><Copy size={14} /> {copied ? 'Đã chép' : 'Chép đường dẫn'}</button>
      </div>
      <h3><Link2 size={13} /> Dùng cho bài</h3>
      <ul className="km-songs">{linked.map(id => { const s = byId.get(id); return <li key={id}><span>{s ? `${bareTitle(s.title)} · ${s.singer}` : id}</span>
        {id !== owner ? <button onClick={() => setLinked(l => l.filter(x => x !== id))} aria-label="Bỏ gắn bài" title="Bỏ gắn bài này"><X size={12} /></button> : <small title="File nằm trong thư mục bài này">thư mục bài</small>}</li>; })}
        {!linked.length && <li className="muted">Chưa gắn bài nào</li>}</ul>
      <label className="km-find"><input value={find} onChange={e => setFind(e.target.value)} placeholder="Gắn thêm bài: gõ tên bài hoặc ca sĩ" aria-label="Gắn thêm bài" /></label>
      {matches.length > 0 && <ul className="km-matches">{matches.map(s => <li key={s.id}><button onClick={() => { setLinked(l => [...l, s.id]); setFind(''); }}>{bareTitle(s.title)} · {s.singer}</button></li>)}</ul>}
      <h3>Ghi chú</h3>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="VD: ảnh này kéo cho cả album, video này lặp liên tục hết album" aria-label="Ghi chú" />
      <button className="km-save" disabled={!dirty || saving} onClick={() => void save()} title="Lưu danh sách bài gắn và ghi chú của file này">{saving ? 'Đang lưu…' : 'Lưu gắn bài + ghi chú'}</button>
    </aside>
  </div>;
}
