import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Box, Clapperboard, FolderOpen, Play, RefreshCw, Square } from 'lucide-react';
import './mv.css';
import type { CatalogSong as Song } from '../apps/types';

export interface MvScene { id: string; name: string; license: string; credit: string; board: string | null; thumb: string | null }
export interface MvCharacter { id: string; name: string; gender: 'nam' | 'nữ'; license: string; credit: string; thumb: string | null }
export interface MvLibrary { projects: { id: string; name: string; scenes: string[] }[]; scenes: MvScene[]; characters: MvCharacter[] }
export interface MvJob { id: string; request: MvRequest; step: string; percent: number; state: 'running' | 'done' | 'failed' | 'cancelled'; output: string | null; error: string | null }
export interface MvRequest { songId: string; title: string; singer: string; audio: string; scene: string; character: string; lip: number; quality: '720' | '4k'; preview?: boolean }
export interface MvShot { start: number; end: number; section: string; camera: string; action: string; sing: boolean }
export interface MvScript { source: 'gemini' | 'mau'; style: string; seed: number; lip: number; shots: MvShot[] }
export interface MvPrepared { duration: number; sections: { name: string; kind: string; start: number; end: number; line: string }[]; script: MvScript }

export interface MvBridge {
  library(): Promise<MvLibrary>; make(request: MvRequest): Promise<MvJob>; jobs(): Promise<MvJob[]>; cancel(id: string): Promise<boolean>; show(file: string): Promise<boolean>;
  onJob(callback: (job: MvJob) => void): () => void;
  prepare?(request: { songId: string; title: string; singer: string; audio: string; lip: number; sceneName?: string }): Promise<MvPrepared>;
  script?(songId: string, seed: number, lip: number, sceneName?: string): Promise<MvScript>;
  previewUrl?(scene: string, character: string): Promise<string>;
  onPrep?(callback: (prep: { songId: string; step: string; percent: number }) => void): () => void;
}
declare global { interface Window { manorMv?: MvBridge } }

const message = (e: unknown) => e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(e);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fileUrl = (file: string) => 'file:///' + encodeURI(file.replace(/\\/g, '/')).replace(/#/g, '%23');

// Dựng MV 3D, hai cột. Trái theo thứ tự làm việc: chọn bài → app chuẩn bị ngầm (căn lời trên máy, chia đoạn) và ra kịch bản quay
// (có nút đổi kịch bản) → chọn cảnh và nhân vật → dựng. Phải: khung xem lớn — 3D cảnh + nhân vật xoay được, hoặc video preview 10 giây.
export default function MvStudio({ onBack }: { onBack?: () => void }) {
  const mv = window.manorMv, apps = window.manorApps;
  const [library, setLibrary] = useState<MvLibrary | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [project, setProject] = useState('');
  const [scene, setScene] = useState('');
  const [character, setCharacter] = useState('');
  const [gender, setGender] = useState<'all' | 'nam' | 'nữ'>('all');
  const [singer, setSinger] = useState('');
  const [query, setQuery] = useState('');
  const [songId, setSongId] = useState('');
  const [lip, setLip] = useState(25);
  const [quality, setQuality] = useState<'720' | '4k'>('720');
  const [jobs, setJobs] = useState<MvJob[]>([]);
  const [prep, setPrep] = useState<{ step: string; percent: number } | null>(null);
  const [prepared, setPrepared] = useState<MvPrepared | null>(null);
  const [script, setScript] = useState<MvScript | null>(null);
  const [scriptBusy, setScriptBusy] = useState(false);
  const [stageUrl, setStageUrl] = useState('');
  const [view, setView] = useState<'3d' | 'video'>('3d');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mv) return;
    mv.library().then(lib => { setLibrary(lib); setProject(lib.projects[0]?.id || ''); }, e => setError(message(e)));
    mv.jobs().then(setJobs, () => {});
    apps?.catalog().then(c => setSongs((c?.songs || []).filter(s => s.audio.length)), () => {});
    const offJob = mv.onJob(job => setJobs(list => [job, ...list.filter(j => j.id !== job.id)]));
    const offPrep = mv.onPrep?.(p => setPrep(current => (p.songId === pickedRef.id ? { step: p.step, percent: p.percent } : current)));
    return () => { offJob(); offPrep?.(); };
  }, [mv, apps]);

  const scenes = useMemo(() => { const ids = library?.projects.find(p => p.id === project)?.scenes || []; return (library?.scenes || []).filter(s => ids.includes(s.id)); }, [library, project]);
  const characters = (library?.characters || []).filter(c => gender === 'all' || c.gender === gender);
  const singers = [...new Set(songs.map(s => s.singer).filter(Boolean))].sort();
  const shown = songs.filter(s => (!singer || s.singer === singer) && (!query || s.title.toLowerCase().includes(query.toLowerCase())));
  const pickedScene = library?.scenes.find(s => s.id === scene), pickedSong = songs.find(s => s.id === songId);
  const pickedCharacter = library?.characters.find(c => c.id === character);
  pickedRef.id = songId;
  // Mọi cảnh đều dựng được: quay theo kịch bản (bộ quay chung); cảnh có bộ quay viết tay cho đúng bài thì dùng bộ đó.
  const ready = !!(pickedScene && character && pickedSong);
  const previews = jobs.filter(j => j.request.preview), films = jobs.filter(j => !j.request.preview);
  const preview = previews.find(j => j.request.songId === songId && j.request.scene === scene && j.request.character === character) || null;

  // Chọn bài: chuẩn bị ngầm ngay (lần đầu ~1–2 phút: tách giọng + căn lời trên máy; các lần sau dùng lại).
  useEffect(() => {
    setPrepared(null); setScript(null); setPrep(null);
    if (!mv?.prepare || !pickedSong) return;
    let alive = true;
    setPrep({ step: 'Bắt đầu', percent: 0 });
    mv.prepare({ songId: pickedSong.id, title: pickedSong.title, singer: pickedSong.singer, audio: pickedSong.audio[0].path, lip, sceneName: pickedScene?.name })
      .then(r => { if (alive) { setPrepared(r); setScript(r.script); setPrep(null); } }, e => { if (alive) { setError(message(e)); setPrep(null); } });
    return () => { alive = false; };
  }, [songId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Khung xem 3D: có cả cảnh và nhân vật thì nạp sân khấu xem thử.
  useEffect(() => {
    setStageUrl('');
    if (!mv?.previewUrl || !scene || !character) return;
    let alive = true;
    mv.previewUrl(scene, character).then(url => { if (alive) { setStageUrl(url); setView('3d'); } }, e => alive && setError(message(e)));
    return () => { alive = false; };
  }, [mv, scene, character]);
  useEffect(() => { if (preview?.state === 'done') setView('video'); }, [preview?.state]);

  if (!mv) return <div className="mv-studio"><p className="mv-note">Dựng MV cần bản Windows (Electron) để đọc thư viện và dựng phim.</p></div>;

  async function another() {
    if (!mv?.script || !script) return;
    setScriptBusy(true); setError('');
    try { setScript(await mv.script(songId, script.seed + 1, lip, pickedScene?.name)); } catch (e) { setError(message(e)); } finally { setScriptBusy(false); }
  }
  async function make(previewOnly: boolean) {
    if (!pickedSong || !pickedScene) return;
    setError('');
    try { await mv!.make({ songId: pickedSong.id, title: pickedSong.title, singer: pickedSong.singer, audio: pickedSong.audio[0].path, scene: pickedScene.id, character, lip, quality: previewOnly ? '720' : quality, ...(previewOnly ? { preview: true } : {}) }); }
    catch (e) { setError(message(e)); }
  }
  const sung = script ? script.shots.filter(s => s.sing).reduce((t, s) => t + (s.end - s.start), 0) : 0;

  return <div className="mv-studio mv-two">
    <header className="mv-head">
      {onBack && <button className="mv-back" onClick={onBack}><ArrowLeft size={15} /> Về Mộc Ngư Trang</button>}
      <div><small>MỘC NGƯ TRANG · XƯỞNG MV</small><h2>Dựng MV 3D</h2></div>
    </header>
    {error && <p className="mv-error" role="alert">{error}</p>}
    <div className="mv-cols">
      <div className="mv-left">
        <section className="mv-block" aria-label="Bài hát">
          <h3>1 · Bài hát</h3>
          <div className="mv-song-tools">
            <select value={singer} onChange={e => setSinger(e.target.value)} aria-label="Ca sĩ"><option value="">Mọi ca sĩ</option>{singers.map(s => <option key={s}>{s}</option>)}</select>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên bài…" aria-label="Tìm bài" />
          </div>
          <ul className="mv-songs">
            {shown.map(s => <li key={s.id}><button aria-pressed={songId === s.id} onClick={() => setSongId(s.id)}><b>{s.title}</b><small>{s.singer} · {s.genre}</small></button></li>)}
            {!shown.length && <li className="mv-note">Không có bài có file nhạc khớp.</li>}
          </ul>
        </section>

        <section className="mv-block" aria-label="Kịch bản">
          <h3>2 · Kịch bản quay <span className="mv-sub">máy quay, động tác, nhép môi chạy đúng theo bảng này</span> {script && <span className="mv-sub">{script.source === 'gemini' ? `Gemini · ${script.style}` : 'mẫu dựng sẵn (Gemini hết key)'}</span>}</h3>
          {!pickedSong && <p className="mv-note">Chọn bài: app tự căn lời trên máy, chia đoạn nhạc rồi viết kịch bản.</p>}
          {prep && <div className="mv-prep"><progress max={100} value={prep.percent} /><span>{prep.step}…</span></div>}
          {script && <>
            <ol className="mv-script">{script.shots.map((s, i) => <li key={i} className={s.sing ? 'sing' : ''}>
              <time>{clock(s.start)}–{clock(s.end)}</time><b>{s.section}</b>
              <span>{s.camera}</span><span>{s.action}</span>{s.sing && <i>nhép môi</i>}
            </li>)}</ol>
            <div className="mv-script-tools">
              <label className="mv-lip"><span>Nhép môi <b>{lip}%</b></span><input type="range" min={10} max={40} step={1} value={lip} onChange={e => setLip(Number(e.target.value))} /></label>
              <small>Kịch bản này: {prepared ? Math.round(sung / prepared.duration * 100) : 0}% hát</small>
              <button onClick={another} disabled={scriptBusy}><RefreshCw size={14} /> {scriptBusy ? 'Đang viết…' : 'Kịch bản khác'}</button>
            </div>
          </>}
        </section>

        <section className="mv-block" aria-label="Cảnh và nhân vật">
          <h3>3 · Cảnh & nhân vật</h3>
          <nav className="mv-projects" aria-label="Dự án con">
            {library?.projects.map(p => <button key={p.id} aria-pressed={p.id === project} onClick={() => { setProject(p.id); setScene(''); }}>{p.name}</button>)}
          </nav>
          <div className="mv-grid scenes">
            {scenes.map(s => <button key={s.id} className={`mv-card${scene === s.id ? ' picked' : ''}`} onClick={() => setScene(s.id)}>
              {s.thumb ? <img src={s.thumb} alt="" /> : <span className="mv-noimg" />}
              <b>{s.name}</b><em className="ok">Quay theo kịch bản</em>
            </button>)}
          </div>
          <div className="mv-filter">{(['all', 'nam', 'nữ'] as const).map(g => <button key={g} aria-pressed={gender === g} onClick={() => setGender(g)}>{g === 'all' ? 'Tất cả' : g === 'nam' ? 'Nam' : 'Nữ'}</button>)}</div>
          <div className="mv-grid people">
            {characters.map(c => <button key={c.id} className={`mv-card person${character === c.id ? ' picked' : ''}`} onClick={() => setCharacter(c.id)} title={`${c.license}${c.credit ? ' · ' + c.credit : ''}`}>
              {c.thumb ? <img src={c.thumb} alt="" /> : <span className="mv-noimg" />}
              <b>{c.name}</b><small>{c.gender}</small>
            </button>)}
          </div>
        </section>

        <section className="mv-block mv-make" aria-label="Dựng MV">
          <h3>4 · Dựng cả bài</h3>
          <div className="mv-filter">{(['720', '4k'] as const).map(q => <button key={q} aria-pressed={quality === q} onClick={() => setQuality(q)}>{q === '720' ? '720p (thử)' : '4K (phát hành)'}</button>)}</div>
          <button className="mv-go" disabled={!ready} onClick={() => make(false)}><Clapperboard size={16} /> Dựng MV</button>
          {!ready && <small className="mv-note">{!pickedSong ? 'Chọn bài hát.' : !pickedScene ? 'Chọn cảnh.' : 'Chọn nhân vật.'}</small>}
          {!!films.length && <ul className="mv-jobs">{films.map(j => <li key={j.id} className={j.state}>
            <div><b>{j.request.title}</b><small>{library?.characters.find(c => c.id === j.request.character)?.name} · {library?.scenes.find(s => s.id === j.request.scene)?.name} · {j.request.quality === '4k' ? '4K' : '720p'}</small></div>
            <progress max={100} value={j.percent} /><span>{j.state === 'failed' ? j.error : j.state === 'cancelled' ? 'Đã dừng' : `${j.step} · ${j.percent}%`}</span>
            {j.state === 'running' && <button onClick={() => mv.cancel(j.id)}><Square size={13} /> Dừng</button>}
            {j.output && <button onClick={() => mv.show(j.output!)}><FolderOpen size={13} /> Mở thư mục</button>}
          </li>)}</ul>}
        </section>
      </div>

      <aside className="mv-right" aria-label="Xem trước">
        <div className="mv-viewer">
          {view === 'video' && preview?.output ? <video key={preview.output} src={fileUrl(preview.output)} controls autoPlay />
            : stageUrl ? <iframe title="Xem thử cảnh và nhân vật" src={stageUrl} />
            : <div className="mv-viewer-empty">{pickedScene?.thumb ? <img src={pickedScene.thumb} alt="" /> : null}<p>{!scene ? 'Chọn cảnh và nhân vật để xem thử 3D ở đây.' : 'Chọn nhân vật để xem cùng cảnh.'}</p></div>}
        </div>
        <div className="mv-viewer-bar">
          <span>{[pickedSong?.title, pickedScene?.name, pickedCharacter?.name].filter(Boolean).join(' · ') || 'Chưa chọn'}</span>
          <span className="grow" />
          {preview?.output && <button aria-pressed={view === '3d'} onClick={() => setView(view === '3d' ? 'video' : '3d')}>{view === '3d' ? <><Play size={13} /> Xem video</> : <><Box size={13} /> Xem 3D</>}</button>}
          <button className="primary" disabled={!ready || preview?.state === 'running' || !prepared} onClick={() => make(true)} title="Quay 10 giây từ điệp khúc đầu tiên, 720p (khoảng 1–2 phút)">
            <Clapperboard size={14} /> {preview?.state === 'running' ? `Đang quay ${preview.percent}%` : 'Preview video 10 s'}</button>
        </div>
        {preview?.state === 'failed' && <p className="mv-error">{preview.error}</p>}
        {ready && !prepared && <small className="mv-note">Chờ chuẩn bị bài xong thì quay preview được.</small>}
      </aside>
    </div>
  </div>;
}
// Bài đang chọn, cho sự kiện tiến độ chuẩn bị (đăng ký một lần) bỏ qua tiến độ của bài đã đổi.
const pickedRef = { id: '' };
