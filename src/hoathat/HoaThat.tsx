import { useEffect, useRef, useState } from 'react';
import { FileAudio, History, Library, Music2, Pencil, X } from 'lucide-react';
import SubtitleApp from '../apps/SubtitleApp';
import type { CatalogSong, Project } from '../apps/types';
import type { AudioDelivery, CreationDraft } from '../creation/types';
import { message, songName } from '../apps/format';
import SongPicker from './SongPicker';
import ImagePanel from './ImagePanel';
import SessionPanel from './SessionPanel';
import { createHoaThatScene, type HoaThatScene } from './scene';
import room from '../assets/hoa-that-room.jpg';
import roomDepth from '../assets/hoa-that-depth.png';
import introVideo from '../assets/hoa-that-intro.mp4';
import '../apps/apps.css';
import './hoathat.css';

type Stage = 'idle' | 'choice' | 'picker' | 'sessions' | 'panels';
// Kích thước ảnh gian phòng; nốt nhạc được neo vào vòng hoa văn theo tỉ lệ ảnh này.
const ROOM_SIZE = { width: 1672, height: 941 };

function readBytes(file: Blob) {
  return new Promise<Uint8Array>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer)); reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(file); });
}

// Họa thất: gian phòng có nốt nhạc huyền bí ở giữa. Bấm nốt nhạc để giao nhạc, giao xong bấm lần nữa để mở các bảng làm việc.
export default function HoaThat({ active = true, incomingAudio, onToWorkshop }: { active?: boolean; incomingAudio?: AudioDelivery; onToWorkshop?: (draft: CreationDraft) => void }) {
  const bridge = window.manorApps;
  const host = useRef<HTMLDivElement>(null), sceneRef = useRef<HoaThatScene | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [webgl, setWebgl] = useState(true);
  const [room3d, setRoom3d] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [project, setProject] = useState<Project | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftLyrics, setDraftLyrics] = useState('');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState('');
  // Cảnh mở màn: mỗi lần bước vào Họa thất, video vòng chạy liên tục; bấm phím bất kỳ hoặc nhấp chuột thì tan dần về gian phòng có nốt nhạc.
  const [intro, setIntro] = useState<'playing' | 'leaving' | null>('playing');
  useEffect(() => { if (active) setIntro('playing'); }, [active]);
  useEffect(() => {
    if (intro !== 'playing' || !active) return;
    // Esc vẫn để trang viên đóng bàn làm việc như cũ; phím khác chỉ dùng để vào phòng, không lọt xuống các ô bên dưới.
    const leave = (event: KeyboardEvent) => { if (event.key === 'Escape') return; event.preventDefault(); event.stopPropagation(); setIntro('leaving'); };
    window.addEventListener('keydown', leave, { capture: true });
    return () => window.removeEventListener('keydown', leave, { capture: true });
  }, [intro, active]);
  useEffect(() => { if (intro !== 'leaving') return; const timer = setTimeout(() => setIntro(null), 700); return () => clearTimeout(timer); }, [intro]);

  const noteClicked = useRef<() => void>(() => {});
  noteClicked.current = () => setStage(current => project ? (current === 'panels' ? 'idle' : 'panels') : (current === 'choice' ? 'idle' : 'choice'));
  useEffect(() => {
    try { sceneRef.current = createHoaThatScene(host.current!, { onNote: () => noteClicked.current(), imageSize: ROOM_SIZE, room: { image: room, depth: roomDepth }, onRoomReady: () => setRoom3d(true) }); }
    catch { setWebgl(false); }
    return () => { sceneRef.current?.dispose(); sceneRef.current = null; };
  }, []);
  useEffect(() => { sceneRef.current?.setLoaded(Boolean(project)); }, [project]);
  useEffect(() => bridge?.onProject(change => { if ('sourceKey' in change) setProject(current => current?.id === change.id ? change as Project : current); }), [bridge]);
  useEffect(() => { setAudioUrl(''); if (project && bridge) bridge.audioUrl(project.id).then(setAudioUrl, () => {}); }, [project?.id, bridge]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deliver(work: () => Promise<Project | null>) {
    setBusy('Đang nhận bản nhạc…'); setError(''); setStage('idle');
    try {
      let next = await work();
      if (!next) return;
      setProject(next);
      // File ngoài chưa có lời: tự chép lời bằng API, công tử đọc thấy sai thì sửa sau.
      if (!next.lyrics) { setBusy('Minh Nhi đang nghe và chép lời…'); next = await bridge!.autoLyrics(next.id); setProject(next); }
    } catch (e) { setError(message(e)); }
    finally { setBusy(''); }
  }
  const pickSong = (song: CatalogSong) => deliver(() => bridge!.openCatalogSong(song.id, song.audio[0]?.stage));
  // Mở lại phiên cũ: bài, phụ đề và bộ ảnh đều nằm sẵn trong bài, vào thẳng các bảng làm việc.
  async function resume(item: Project) {
    setError('');
    try { setProject(await bridge!.project(item.id)); setStage('panels'); } catch (e) { setError(message(e)); }
  }
  async function pickFile(file: File) { deliver(async () => bridge!.openBytes(file.name, await readBytes(file))); }
  useEffect(() => {
    if (!incomingAudio || !bridge) return;
    const { file, meta } = incomingAudio;
    deliver(async () => bridge.openBytes(file.name, await readBytes(file), meta));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingAudio?.id]);

  async function saveLyrics() {
    try { setProject(await bridge!.updateProject(project!.id, { lyrics: draftLyrics })); setEditing(false); }
    catch (e) { setError(message(e)); }
  }

  if (!bridge) return <section className="hoathat"><p className="ht-unavailable">Họa thất cần bản Windows để đọc nhạc và gọi Gemini, Flow.</p></section>;

  const lyricsNote = project?.lyricsSource === 'catalog' ? 'Lời từ Tàng Âm Các' : project?.lyricsSource === 'api' ? 'Lời do Gemini chép · đọc thấy sai thì sửa' : project?.lyricsSource === 'manual' ? 'Lời đã sửa tay' : '';
  return <section className="hoathat" aria-label="Họa thất" onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); const next = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 }; setTilt(next); sceneRef.current?.setTilt(next.x, next.y); }}>
    {/* Khi khối phòng 3D đã dựng xong thì camera lo việc nghiêng nhìn; ảnh phẳng chỉ là bản dự phòng lúc đang tải. */}
    <div className={`ht-world ${room3d ? 'is-3d' : ''}`} style={room3d ? undefined : { transform: `translate(${tilt.x * -18}px, ${tilt.y * -12}px)` }}>
      {!room3d && <div className="ht-room" style={{ backgroundImage: `url(${room})` }} />}
      <div className="ht-vignette" />
      <div className="ht-stage" ref={host} />
    </div>
    {!webgl && <button className="ht-note-fallback" onClick={() => noteClicked.current()} aria-label="Nốt nhạc">♪</button>}
    {/* Thanh bài đang làm: luôn đổi được bài và mở lại phiên cũ, kể cả khi đang ở bảng phụ đề/tạo ảnh. */}
    <nav className="ht-glass ht-songbar" aria-label="Bài đang làm">
      {project ? <span className="ht-songbar-title" title={project.title}><Music2 size={15} />{songName(project.title, project.genre)}{project.singer && <small>{project.singer}</small>}</span> : <span className="ht-muted">Chưa chọn bài</span>}
      <button disabled={Boolean(busy)} onClick={() => setStage(current => current === 'choice' || current === 'picker' ? (project ? 'panels' : 'idle') : 'choice')}>{project ? 'Đổi bài' : 'Chọn bài'}</button>
      <button disabled={Boolean(busy)} onClick={() => setStage(current => current === 'sessions' ? (project ? 'panels' : 'idle') : 'sessions')}><History size={14} /> Phiên cũ</button>
    </nav>

    {!project && stage === 'idle' && !busy && <p className="ht-hint">Chạm vào nốt nhạc để giao bản nhạc</p>}
    {busy && <p className="ht-hint ht-busy" role="status"><span className="ht-spinner" />{busy}</p>}
    {error && <p className="ht-error ht-floating" role="alert">{error}</p>}

    {stage === 'choice' && <div className="ht-choice">
      <button className="ht-orb-button" onClick={() => fileInput.current?.click()}><FileAudio size={22} /><span>Nhập file nhạc<small>từ máy</small></span></button>
      <button className="ht-orb-button" onClick={() => setStage('picker')}><Library size={22} /><span>Tàng Âm Các<small>chọn bài trong kho</small></span></button>
    </div>}
    {stage === 'picker' && <SongPicker onPick={pickSong} onClose={() => setStage('choice')} />}
    {stage === 'sessions' && <SessionPanel currentId={project?.id} onPick={resume} onClose={() => setStage(project ? 'panels' : 'idle')} />}

    {project && (stage === 'idle' || stage === 'choice') && <aside className="ht-glass ht-song-card" style={{ transform: `perspective(900px) rotateY(${-8 + tilt.x * 6}deg) rotateX(${tilt.y * -4}deg)` }} aria-label="Thông tin bài hát">
      <h2>{project.title}</h2>
      <dl>
        {project.singer && <><dt>Ca sĩ</dt><dd>{project.singer}</dd></>}
        {project.genre && <><dt>Phong cách</dt><dd>{project.genre}</dd></>}
        {project.themes?.length > 0 && <><dt>Chủ đề</dt><dd>{project.themes.join(' · ')}</dd></>}
        {project.languages?.length > 0 && <><dt>Ngôn ngữ</dt><dd>{project.languages.join(', ')}</dd></>}
        {project.audio.trimmed && <><dt>Khoảng lặng</dt><dd>Đã cắt {project.audio.trimmed.head.toFixed(1).replace('.', ',')} giây đầu · {project.audio.trimmed.tail.toFixed(1).replace('.', ',')} giây cuối</dd></>}
      </dl>
      <div className="ht-lyrics-head"><small>{lyricsNote}</small>{!editing && project.lyrics && <button className="ht-icon" aria-label="Sửa lời" onClick={() => { setDraftLyrics(project.lyrics); setEditing(true); }}><Pencil size={13} /></button>}</div>
      {editing ? <div className="ht-lyrics-edit"><textarea value={draftLyrics} onChange={e => setDraftLyrics(e.target.value)} aria-label="Sửa lời bài hát" /><div><button onClick={saveLyrics}>Lưu lời</button><button onClick={() => setEditing(false)}>Hủy</button></div></div>
        : <pre className="ht-lyrics">{project.lyrics || (busy ? '…' : 'Chưa có lời.')}</pre>}
      <button className="ht-link" onClick={() => setStage('choice')}>Đổi bài khác</button>
    </aside>}

    {project && stage === 'idle' && !busy && <p className="ht-hint">Chạm nốt nhạc để mở bảng phụ đề và tạo ảnh</p>}
    {project && stage === 'panels' && <div className="ht-panels">
      <section className="ht-glass ht-panel ht-panel-srt" aria-label="Bảng phụ đề" style={{ transform: `perspective(1200px) rotateY(${10 + tilt.x * 5}deg)` }}>
        <header><h3>Phụ đề</h3><button className="ht-icon" aria-label="Đóng bảng" onClick={() => setStage('idle')}><X size={16} /></button></header>
        {audioUrl && <audio ref={audio} src={audioUrl} controls onTimeUpdate={e => setTime(e.currentTarget.currentTime)} />}
        <div className="mini-apps ht-embedded"><SubtitleApp key={project.id} project={project} currentTime={time} onSeek={s => { if (audio.current) { audio.current.currentTime = s; void audio.current.play().catch(() => {}); } }} autoRun /></div>
      </section>
      <ImagePanel key={project.id} project={project} onClose={() => setStage('idle')} onToWorkshop={onToWorkshop} />
    </div>}
    {active && intro && <div className={`ht-intro ${intro === 'leaving' ? 'leaving' : ''}`} role="button" tabIndex={-1} aria-label="Vào Họa thất" onPointerDown={() => setIntro('leaving')}>
      <video src={introVideo} autoPlay muted loop playsInline onError={() => setIntro(null)} />
      <span className="ht-intro-hint">Nhấp chuột hoặc bấm phím bất kỳ để vào Họa thất</span>
    </div>}
    <input ref={fileInput} type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" hidden aria-label="File nhạc" onChange={e => { const file = e.target.files?.[0]; if (file) pickFile(file); e.target.value = ''; }} />
  </section>;
}
