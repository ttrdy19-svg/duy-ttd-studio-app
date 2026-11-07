import { useEffect, useRef, useState } from 'react';
import { FolderOpen, ImageIcon, Subtitles } from 'lucide-react';
import SongList from './SongList';
import SubtitleApp from './SubtitleApp';
import ImageApp from './ImageApp';
import type { Project } from './types';
import { duration, message } from './format';
import './apps.css';

// Bàn nhạc: bảng danh sách bên trái dùng chung, mini app bên phải làm việc trên cùng một "Bài".
export default function MiniApps({ initialTab = 'subtitles' }: { initialTab?: 'subtitles' | 'images' } = {}) {
  const bridge = window.manorApps;
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [tab, setTab] = useState<'subtitles' | 'images'>(initialTab);
  const [audioUrl, setAudioUrl] = useState('');
  const [time, setTime] = useState(0);
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!bridge) return;
    bridge.projects().then(setProjects, e => setError(message(e)));
    return bridge.onProject(change => {
      if (!('sourceKey' in change)) return;
      const project = change as Project;
      setProjects(list => [project, ...list.filter(p => p.id !== project.id)]);
      setActive(current => current?.id === project.id ? project : current);
    });
  }, [bridge]);
  useEffect(() => {
    setAudioUrl('');
    if (active && bridge) bridge.audioUrl(active.id).then(setAudioUrl, () => setAudioUrl(''));
  }, [active?.id, bridge]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!bridge) return <div className="mini-apps unavailable"><p>Bàn nhạc cần bản Windows (Electron) để đọc kho nhạc và gọi Gemini/Flow.</p></div>;

  function open(project: Project) { setActive(project); setProjects(list => [project, ...list.filter(p => p.id !== project.id)]); setError(''); }
  function seek(seconds: number) { if (audio.current) { audio.current.currentTime = seconds; void audio.current.play().catch(() => {}); } }

  return <div className="mini-apps">
    <SongList projects={projects} activeId={active?.id || ''} onOpen={open} />
    <main className="mini-workspace">
      {!active && <div className="mini-welcome"><h2>Bàn nhạc</h2><p>Chọn một bài trong Tàng Âm Các hoặc nhập file nhạc. Mỗi bài dùng chung cho hai mini app: <b>Phụ đề</b> (SRT/ASS chuẩn để ghép video) và <b>Họa ảnh</b> (5 ảnh để chọn và 5 khung thumbnail).</p>{error && <p className="apps-error">{error}</p>}</div>}
      {active && <>
        <header className="mini-project">
          <div>
            <h2>{active.title}</h2>
            <small>{[active.singer, active.genre, duration(active.audio.duration), active.audio.name].filter(Boolean).join(' · ')}</small>
          </div>
          <button onClick={() => bridge.openFolder(active.id).catch(e => setError(message(e)))}><FolderOpen size={14} /> Thư mục bài</button>
        </header>
        {audioUrl && <audio ref={audio} src={audioUrl} controls onTimeUpdate={e => setTime(e.currentTarget.currentTime)} className="mini-audio" />}
        <nav className="mini-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'subtitles'} onClick={() => setTab('subtitles')}><Subtitles size={15} /> Phụ đề</button>
          <button role="tab" aria-selected={tab === 'images'} onClick={() => setTab('images')}><ImageIcon size={15} /> Họa ảnh</button>
        </nav>
        {error && <p className="apps-error">{error}</p>}
        {tab === 'subtitles' ? <SubtitleApp key={active.id} project={active} currentTime={time} onSeek={seek} /> : <ImageApp key={active.id} project={active} />}
      </>}
    </main>
  </div>;
}
