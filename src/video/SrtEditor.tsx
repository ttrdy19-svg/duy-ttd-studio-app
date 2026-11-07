import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Crosshair, FileText, Play, Plus, Save, Trash2, Undo2, X } from 'lucide-react';
import { clock, message, parseClock } from '../apps/format';
import type { Cue, SubtitleStyle } from '../apps/types';
import { parseSrt, srtText, validateSubtitleCues } from './subtitles';
import type { SubtitleCue } from './subtitles';

const STYLE: SubtitleStyle = { width: 1920, font: 'Arial', size: 5.5, color: '#FFFFFF', highlight: '#F2C14E', karaoke: false };
let serial = 0;
const fresh = (cue: Omit<SubtitleCue, 'id'>): SubtitleCue => ({ ...cue, id: `edit-${++serial}` });

// Ô mốc thời gian: gõ tự do (m:ss.mmm hoặc số giây), Enter hoặc rời ô mới áp dụng.
function TimeField({ label, value, onCommit }: { label: string; value: number; onCommit: (seconds: number) => void }) {
  const [text, setText] = useState(clock(value));
  useEffect(() => setText(clock(value)), [value]);
  const commit = () => { const seconds = parseClock(text); if (seconds === null) setText(clock(value)); else if (Math.abs(seconds - value) > 0.0005) onCommit(seconds); };
  return <input className="srt-time" aria-label={label} value={text} onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />;
}

interface Props {
  cues: SubtitleCue[]; duration: number; time: number; projectId?: string; title: string;
  onChange: (cues: SubtitleCue[]) => void; onSeek: (seconds: number, play?: boolean) => void; onClose: () => void;
}

// Bàn sửa phụ đề ngay trong Lưu Ảnh Thất: nằm cạnh màn chiếu (không che), sửa chữ và mốc từng câu, lấy mốc theo nhạc đang phát,
// thêm/xóa câu, hoặc sửa thô cả file SRT. "Lưu vào bài" ghi lại vào bài ở Họa thất để hai bên dùng chung một bản.
export default function SrtEditor({ cues, duration, time, projectId, title, onChange, onSeek, onClose }: Props) {
  const [raw, setRaw] = useState<string | null>(null);
  const [saved, setSaved] = useState(cues);
  const [notice, setNotice] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const current = cues.findIndex(cue => time >= cue.start && time < cue.end);
  const problem = cues.length ? validateSubtitleCues(cues, duration || null) : null;
  const dirty = saved !== cues;
  useEffect(() => { list.current?.querySelector('.playing')?.scrollIntoView?.({ block: 'nearest' }); }, [current]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', key, { capture: true });
    return () => window.removeEventListener('keydown', key, { capture: true });
  }, [onClose]);

  const edit = (index: number, patch: Partial<SubtitleCue>) => { setNotice(''); onChange(cues.map((cue, i) => i === index ? { ...cue, ...patch } : cue)); };
  const remove = (index: number) => { setNotice(''); onChange(cues.filter((_, i) => i !== index)); };
  function insert(index: number) {
    const before = cues[index], after = cues[index + 1];
    const start = before ? before.end : 0, end = Math.min(after ? after.start : duration, start + 2);
    if (!(end > start)) { setError('Không còn chỗ trống giữa hai câu này. Rút mốc cuối câu trước lại rồi thêm.'); return; }
    setError(''); onChange([...cues.slice(0, index + 1), fresh({ start, end, text: 'Câu mới' }), ...cues.slice(index + 1)]);
  }
  function applyRaw() {
    try { onChange(parseSrt(raw || '')); setRaw(null); setError(''); setNotice('Đã áp dụng file SRT vừa sửa.'); }
    catch (e) { setError(message(e)); }
  }
  async function save() {
    const bridge = window.manorApps;
    if (!bridge || !projectId || problem) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const draft = await bridge.subtitles(projectId).catch(() => null);
      // Câu nào giữ nguyên chữ và mốc thì giữ luôn mốc từng chữ (karaoke) của bản cũ.
      const merged: Cue[] = cues.map(({ start, end, text }) => {
        const same = draft?.cues.find(cue => cue.text === text && Math.abs(cue.start - start) < 0.001 && Math.abs(cue.end - end) < 0.001);
        return same?.words ? { start, end, text, words: same.words } : { start, end, text };
      });
      await bridge.saveSubtitles(projectId, { cues: merged, mode: draft?.mode || 'lyrics', coverage: draft?.coverage ?? 1, style: draft?.style || STYLE });
      setSaved(cues); setNotice('Đã lưu phụ đề vào bài. Họa thất cũng thấy bản này.');
    } catch (e) { setError(message(e)); } finally { setSaving(false); }
  }

  return createPortal(<aside className="srt-editor" role="dialog" aria-label="Sửa phụ đề SRT">
    <header>
      <div><small>PHỤ ĐỀ · {cues.length} câu{dirty ? ' · chưa lưu' : ''}</small><h3>{title}</h3></div>
      <button className="srt-icon" aria-label="Đóng sửa phụ đề" onClick={onClose}><X size={17} /></button>
    </header>
    <nav className="srt-bar">
      <button aria-pressed={raw !== null} onClick={() => setRaw(raw === null ? srtText(cues) : null)}><FileText size={14} /> {raw === null ? 'Sửa thô SRT' : 'Về từng câu'}</button>
      <button disabled={!dirty} onClick={() => { onChange(saved); setNotice('Đã hoàn tác về bản đã lưu.'); }}><Undo2 size={14} /> Hoàn tác</button>
      {projectId && <button className="primary" disabled={!dirty || Boolean(problem) || saving || raw !== null} onClick={() => void save()}><Save size={14} /> {saving ? 'Đang lưu…' : 'Lưu vào bài'}</button>}
    </nav>
    {problem && <p className="srt-error" role="alert">{problem}</p>}
    {error && <p className="srt-error" role="alert">{error}</p>}
    {notice && <p className="srt-notice" role="status">{notice}</p>}
    {raw !== null ? <div className="srt-raw">
      <textarea aria-label="Nội dung file SRT" value={raw} spellCheck={false} onChange={e => setRaw(e.target.value)} />
      <button className="primary" onClick={applyRaw}><Check size={14} /> Áp dụng SRT</button>
    </div> : <ol className="srt-list" ref={list}>
      {cues.map((cue, index) => <li key={cue.id} className={index === current ? 'playing' : ''}>
        <div className="srt-row-head">
          <b>{index + 1}</b>
          <TimeField label={`Mốc đầu câu ${index + 1}`} value={cue.start} onCommit={start => edit(index, { start })} />
          <button className="srt-icon" aria-label={`Lấy mốc đầu câu ${index + 1} theo nhạc đang phát`} title="Lấy mốc đầu = chỗ nhạc đang phát" onClick={() => edit(index, { start: Math.round(time * 1000) / 1000 })}><Crosshair size={13} /></button>
          <span>→</span>
          <TimeField label={`Mốc cuối câu ${index + 1}`} value={cue.end} onCommit={end => edit(index, { end })} />
          <button className="srt-icon" aria-label={`Lấy mốc cuối câu ${index + 1} theo nhạc đang phát`} title="Lấy mốc cuối = chỗ nhạc đang phát" onClick={() => edit(index, { end: Math.round(time * 1000) / 1000 })}><Crosshair size={13} /></button>
          <span className="srt-spacer" />
          <button className="srt-icon" aria-label={`Nghe câu ${index + 1}`} onClick={() => onSeek(cue.start + 0.01, true)}><Play size={13} /></button>
          <button className="srt-icon" aria-label={`Thêm câu sau câu ${index + 1}`} onClick={() => insert(index)}><Plus size={13} /></button>
          <button className="srt-icon danger" aria-label={`Xóa câu ${index + 1}`} onClick={() => remove(index)}><Trash2 size={13} /></button>
        </div>
        <textarea aria-label={`Lời câu ${index + 1}`} rows={Math.min(3, cue.text.split('\n').length)} value={cue.text} onChange={e => edit(index, { text: e.target.value })} />
      </li>)}
      {!cues.length && <li className="srt-empty">Chưa có câu nào.<button onClick={() => insert(-1)}><Plus size={13} /> Thêm câu đầu tiên</button></li>}
    </ol>}
  </aside>, document.body);
}
