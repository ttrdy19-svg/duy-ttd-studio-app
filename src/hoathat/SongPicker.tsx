import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Catalog, CatalogSong } from '../apps/types';
import { message } from '../apps/format';

const FIELDS = [
  { key: 'singer', label: 'Ca sĩ', values: (s: CatalogSong) => [s.singer] },
  { key: 'theme', label: 'Chủ đề', values: (s: CatalogSong) => s.themes },
  { key: 'genre', label: 'Phong cách', values: (s: CatalogSong) => [s.genre] },
  { key: 'language', label: 'Ngôn ngữ', values: (s: CatalogSong) => s.languages },
] as const;

// Chọn nhạc từ Tàng Âm Các: lọc theo tên, ca sĩ, chủ đề, phong cách, ngôn ngữ.
export default function SongPicker({ onPick, onClose }: { onPick: (song: CatalogSong) => void; onClose: () => void }) {
  const bridge = window.manorApps!;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  useEffect(() => { bridge.catalog().then(setCatalog, e => setError(message(e))); }, [bridge]);

  const songs = catalog?.songs || [];
  const options = useMemo(() => Object.fromEntries(FIELDS.map(f => [f.key, [...new Set(songs.flatMap(f.values).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))])), [songs]);
  const needle = query.trim().toLocaleLowerCase('vi');
  const shown = songs.filter(song => (!needle || song.title.toLocaleLowerCase('vi').includes(needle)) &&
    FIELDS.every(f => !filters[f.key] || f.values(song).includes(filters[f.key])));

  return <div className="ht-picker ht-glass" role="dialog" aria-label="Chọn nhạc từ Tàng Âm Các">
    <header><h3>Tàng Âm Các</h3><button className="ht-icon" aria-label="Đóng" onClick={onClose}><X size={16} /></button></header>
    {!catalog && !error && <p className="ht-muted">Đang mở kho…</p>}
    {catalog === null && error && <p className="ht-error">{error}</p>}
    {catalog === null && !error && <button onClick={() => bridge.pickCatalog().then(setCatalog, e => setError(message(e)))}>Chọn thư mục kho</button>}
    <div className="ht-filters">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên bài…" aria-label="Lọc theo tên" />
      {FIELDS.map(f => <select key={f.key} value={filters[f.key] || ''} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })} aria-label={`Lọc theo ${f.label.toLowerCase()}`}>
        <option value="">{f.label}</option>{options[f.key].map(v => <option key={v}>{v}</option>)}
      </select>)}
    </div>
    <ul className="ht-song-list">
      {shown.map(song => <li key={song.id}>
        <button disabled={!song.audio.length} onClick={() => onPick(song)}>
          <strong>{song.title}</strong>
          <span>{[song.singer, song.genre, song.languages.join(', ')].filter(Boolean).join(' · ')}</span>
          {song.themes.length > 0 && <small>{song.themes.join(' · ')}</small>}
        </button>
      </li>)}
      {catalog && !shown.length && <li className="ht-muted">Không có bài nào khớp bộ lọc.</li>}
    </ul>
  </div>;
}
