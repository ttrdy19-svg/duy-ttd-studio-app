import { useEffect, useMemo, useState } from 'react';
import { FileAudio, FolderOpen, Music4, Search } from 'lucide-react';
import type { Catalog, Project, SrtEntry } from './types';
import { duration, message } from './format';

// Bảng Danh sách nhạc dùng chung: chọn bài từ Tàng Âm Các hoặc nhập file, mở thành "Bài" cho các mini app.
export default function SongList({ projects, activeId, onOpen }: { projects: Project[]; activeId: string; onOpen: (project: Project) => void }) {
  const bridge = window.manorApps!;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<'catalog' | 'projects' | 'srt'>('catalog');
  const [srt, setSrt] = useState<SrtEntry[]>([]);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { bridge.catalog().then(setCatalog, e => setError(message(e))); }, [bridge]);
  // Kho SRT đọc lại mỗi khi có bài vừa được duyệt.
  const approvals = projects.map(p => p.approved?.version || 0).join();
  useEffect(() => { bridge.srtLibrary().then(setSrt, () => {}); }, [bridge, approvals]);
  const bySong = useMemo(() => new Map(projects.filter(p => p.source.kind === 'catalog').map(p => [(p.source as { songId: string }).songId, p])), [projects]);
  const genres = useMemo(() => [...new Set((catalog?.songs || []).map(s => s.genre).filter(Boolean))].sort(), [catalog]);
  const needle = query.trim().toLocaleLowerCase('vi');
  const songs = (catalog?.songs || []).filter(song => (!genre || song.genre === genre) &&
    (!needle || [song.title, song.singer, song.genre, ...song.themes].join(' ').toLocaleLowerCase('vi').includes(needle)));
  const opened = projects.filter(p => !needle || [p.title, p.singer, p.genre].join(' ').toLocaleLowerCase('vi').includes(needle));

  async function run(label: string, work: () => Promise<Project | null>) {
    setBusy(label); setError('');
    try { const project = await work(); if (project) onOpen(project); }
    catch (e) { setError(message(e)); }
    finally { setBusy(''); }
  }
  // Ký âm: chạy trên máy (~1–2 phút/bài), file PDF/MusicXML/MIDI/hợp âm .docx nằm cạnh file nhạc của bài.
  async function kyAm(songId: string, title: string) {
    setBusy(`ky-${songId}`); setError(''); setNotice('');
    try { const r = await bridge.kyAm(songId); setNotice(`✓ Đã ký âm "${title}": ${r.info.so_trang} trang, giọng ${r.info.giong_vi}, ♩=${r.info.bpm}, ${r.info.so_hop_am} lần đổi hợp âm — Ký âm.pdf, .musicxml, .mid và Hợp âm.docx nằm cạnh file nhạc.`); }
    catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  async function pick() { setError(''); try { setCatalog(await bridge.pickCatalog()); } catch (e) { setError(message(e)); } }

  return <aside className="song-list" aria-label="Danh sách nhạc">
    <header>
      <div className="song-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'catalog'} onClick={() => setTab('catalog')}>Tàng Âm Các {catalog && <small>{catalog.songs.length}</small>}</button>
        <button role="tab" aria-selected={tab === 'projects'} onClick={() => setTab('projects')}>Bài đã mở <small>{projects.length}</small></button>
        <button role="tab" aria-selected={tab === 'srt'} onClick={() => setTab('srt')}>Kho SRT <small>{srt.length}</small></button>
      </div>
      <label className="song-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên bài, ca sĩ, chủ đề…" aria-label="Tìm bài" /></label>
      {tab === 'catalog' && genres.length > 1 && <select value={genre} onChange={e => setGenre(e.target.value)} aria-label="Lọc thể loại"><option value="">Mọi thể loại</option>{genres.map(g => <option key={g}>{g}</option>)}</select>}
      <div className="song-actions">
        <button onClick={() => run('file', bridge.openFile)} disabled={Boolean(busy)}><FileAudio size={14} /> Nhập file nhạc</button>
        <button onClick={pick} title="Chọn thư mục kho Mộc Ngữ Quán"><FolderOpen size={14} /> {catalog ? 'Đổi kho' : 'Chọn kho'}</button>
      </div>
      {error && <p className="apps-error" role="alert">{error}</p>}
      {notice && <p className="apps-notice" role="status">{notice}</p>}
    </header>
    <ul>
      {tab === 'catalog' && !catalog && <li className="song-empty">Chưa chọn kho Tàng Âm Các. Bấm “Chọn kho” và trỏ tới thư mục có file danh-muc-bai-hat.json.</li>}
      {tab === 'catalog' && songs.map(song => {
        const project = bySong.get(song.id);
        return <li key={song.id}>
          <button className={project?.id === activeId ? 'active' : ''} disabled={!song.audio.length || Boolean(busy)} onClick={() => run(song.id, () => bridge.openCatalogSong(song.id, song.audio[0]?.stage))}>
            <strong>{song.title}</strong>
            <span>{[song.singer, song.genre].filter(Boolean).join(' · ')}</span>
            <span className="song-flags">
              {song.lyrics ? <i className="ok">Có lời</i> : <i>Chưa có lời</i>}
              {song.audio[0] ? <i>{song.audio[0].label}</i> : <i className="warn">Thiếu file nhạc</i>}
              {project?.approved ? <i className="ok">SRT đã duyệt v{project.approved.version}</i> : project?.captions && <i>SRT nháp</i>}
              {project?.chosen && <i className="ok">Đã chốt ảnh</i>}
              {project && project.thumbs > 0 && <i className="ok">Thumb</i>}
              {busy === song.id && <i>Đang mở…</i>}
            </span>
          </button>
          <button className="song-kyam" disabled={!song.audio.length || !song.lyrics || Boolean(busy)} title={song.lyrics ? 'Ký âm: bản nhạc có lời (PDF A4 để nộp đăng ký quyền tác giả) + MusicXML + MIDI + bản hợp âm .docx, lưu cạnh file nhạc' : 'Cần có lời để ký âm'}
            onClick={() => kyAm(song.id, song.title)}><Music4 size={13} /> {busy === `ky-${song.id}` ? 'Đang ký âm…' : 'Ký âm'}</button>
        </li>;
      })}
      {tab === 'projects' && opened.map(project => <li key={project.id}>
        <button className={project.id === activeId ? 'active' : ''} onClick={() => onOpen(project)}>
          <strong>{project.title}</strong>
          <span>{[project.singer, duration(project.audio.duration)].filter(Boolean).join(' · ')}</span>
          <span className="song-flags">
            {project.words ? <i className="ok">Đã đọc lời</i> : <i>Chưa đọc lời</i>}
            {project.approved ? <i className="ok">SRT đã duyệt v{project.approved.version}</i> : project.captions && <i>SRT nháp</i>}
            {project.candidates > 0 && <i>{project.candidates} ảnh</i>}
            {project.thumbs > 0 && <i className="ok">Thumb</i>}
          </span>
        </button>
      </li>)}
      {tab === 'projects' && !opened.length && <li className="song-empty">Chưa mở bài nào.</li>}
      {tab === 'srt' && srt.filter(e => !needle || [e.title, e.singer, e.genre].join(' ').toLocaleLowerCase('vi').includes(needle)).map(entry => {
        const project = projects.find(p => p.id === entry.projectId);
        return <li key={entry.key}>
          <button className={project?.id === activeId ? 'active' : ''} disabled={!project} onClick={() => project && onOpen(project)} title={project ? 'Mở bài' : 'Bài chưa mở trong máy này'}>
            <strong>{entry.title}</strong>
            <span>{[entry.singer, entry.genre].filter(Boolean).join(' · ') || entry.audioName}</span>
            <span className="song-flags"><i className="ok">v{entry.active}</i>{entry.versions > 1 && <i>{entry.versions} phiên bản</i>}<i>{new Date(entry.approvedAt).toLocaleDateString('vi-VN')}</i></span>
          </button>
        </li>;
      })}
      {tab === 'srt' && !srt.length && <li className="song-empty">Kho SRT trống. Bấm “Duyệt vào kho SRT” ở mini app Phụ đề để đưa bản đạt chuẩn vào kho.</li>}
    </ul>
  </aside>;
}
