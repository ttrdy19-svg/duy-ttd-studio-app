import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Project } from '../apps/types';
import type { CreationDraft } from '../creation/types';
import { duration, message, songName } from '../apps/format';
import { buildDraft } from '../hoathat/draft';

// Vào thẳng Lưu Ảnh Thất từ trang viên: chọn một bài đã làm ở Họa thất (đã chọn ảnh) là có đủ ảnh, nhạc và phụ đề để chiếu.
export default function SongShelf({ currentId, onPick, onClose }: { currentId?: string; onPick: (draft: CreationDraft) => void; onClose: () => void }) {
  const bridge = window.manorApps;
  const [songs, setSongs] = useState<Project[] | null>(null);
  const [opening, setOpening] = useState(''), [error, setError] = useState('');
  useEffect(() => { bridge?.projects().then(setSongs, e => setError(message(e))); }, [bridge]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', key, { capture: true });
    return () => window.removeEventListener('keydown', key, { capture: true });
  }, [onClose]);
  async function pick(project: Project) {
    if (!bridge || !project.chosen) return;
    setOpening(project.id); setError('');
    try { onPick(await buildDraft(bridge, project, project.chosen)); onClose(); }
    catch (e) { setError(message(e)); } finally { setOpening(''); }
  }
  const ready = songs?.filter(song => song.chosen) || [], waiting = songs?.filter(song => !song.chosen) || [];

  return createPortal(<div className="song-shelf" role="dialog" aria-modal="true" aria-label="Chọn bài để chiếu">
    <section>
      <header><div><small>LƯU ẢNH THẤT · LỊCH CHIẾU</small><h3>Chọn bài để chiếu</h3></div><button className="shelf-close" aria-label="Đóng chọn bài" onClick={onClose}><X size={17} /></button></header>
      {!songs && !error && <p className="shelf-muted">Đang mở danh sách…</p>}
      {error && <p className="shelf-error" role="alert">{error}</p>}
      <ul className="song-cards">
        {ready.map(song => <li key={song.id}>
          <button className={song.id === currentId ? 'current' : ''} disabled={Boolean(opening)} onClick={() => void pick(song)}>
            <strong>{songName(song.title, song.genre)}</strong>
            <span>{[song.singer, song.genre, duration(song.audio.duration)].filter(Boolean).join(' · ')}</span>
            <small>{opening === song.id ? 'Đang mang nhạc, ảnh và phụ đề sang…' : [song.approved ? `Phụ đề đã duyệt (bản ${song.approved.version})` : song.captions ? 'Phụ đề đã lưu' : 'Chưa có phụ đề', song.thumbs ? `${song.thumbs}/5 thumbnail` : 'Chưa có thumbnail'].join(' · ')}</small>
          </button>
        </li>)}
        {songs && !ready.length && <li className="shelf-muted">Chưa có bài nào chọn ảnh. Vào Họa thất tạo ảnh, chọn một ảnh rồi quay lại đây.</li>}
      </ul>
      {waiting.length > 0 && <p className="shelf-muted">{waiting.length} bài khác chưa chọn ảnh ở Họa thất: {waiting.map(song => songName(song.title, song.genre)).join(', ')}.</p>}
    </section>
  </div>, document.body);
}
