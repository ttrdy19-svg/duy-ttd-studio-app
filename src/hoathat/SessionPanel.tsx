import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Project } from '../apps/types';
import { duration, message, songName } from '../apps/format';

const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Phiên làm việc cũ: mỗi bài đã mở ở Họa thất giữ nguyên file nhạc, phụ đề và bộ ảnh; bấm vào là làm tiếp đúng chỗ đã dừng.
export default function SessionPanel({ currentId, onPick, onClose }: { currentId?: string; onPick: (project: Project) => void; onClose: () => void }) {
  const bridge = window.manorApps!;
  const [sessions, setSessions] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { bridge.projects().then(setSessions, e => setError(message(e))); }, [bridge]);

  return <div className="ht-picker ht-glass ht-sessions" role="dialog" aria-label="Phiên làm việc cũ">
    <header><h3>Phiên làm việc</h3><button className="ht-icon" aria-label="Đóng" onClick={onClose}><X size={16} /></button></header>
    {!sessions && !error && <p className="ht-muted">Đang mở…</p>}
    {error && <p className="ht-error">{error}</p>}
    <ul className="ht-song-list">
      {sessions?.map(item => <li key={item.id}>
        <button className={item.id === currentId ? 'current' : ''} onClick={() => onPick(item)}>
          <strong>{songName(item.title, item.genre)}</strong>
          <span>{[item.singer, item.genre, duration(item.audio.duration), item.audio.name].filter(Boolean).join(' · ')}</span>
          <small>{[
            item.approved ? `Phụ đề đã duyệt (bản ${item.approved.version})` : item.captions ? 'Phụ đề đã lưu' : 'Chưa có phụ đề',
            item.candidates ? `${item.candidates} ảnh${item.chosen ? ' · đã chọn ảnh' : ''}` : 'Chưa tạo ảnh',
            `Sửa lần cuối ${when(item.updatedAt)}`,
          ].join(' · ')}</small>
        </button>
      </li>)}
      {sessions && !sessions.length && <li className="ht-muted">Chưa có phiên nào. Giao một bản nhạc để bắt đầu.</li>}
    </ul>
  </div>;
}
