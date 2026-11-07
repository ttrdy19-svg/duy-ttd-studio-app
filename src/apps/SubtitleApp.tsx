import { useEffect, useState } from 'react';
import { BadgeCheck, Cpu, Download, Mic, Play, RefreshCw, Save } from 'lucide-react';
import type { Cue, Project, SubtitleDraft, SubtitleStyle } from './types';
import { clock, message, parseClock } from './format';

// Font hệ thống; app nạp thêm 47 font phụ đề đủ tiếng Việt từ G:AI Fonts (tools/fonts) qua subtitleFonts().
const FONTS = ['Arial', 'Segoe UI', 'Times New Roman', 'Tahoma'];
const DEFAULT_STYLE: SubtitleStyle = { width: 1920, font: 'Arial', size: 5.5, color: '#FFFFFF', highlight: '#F2C14E', karaoke: false };

// Mini app Phụ đề: đọc lời → khớp với lời chuẩn → sửa → lưu SRT + ASS.
export default function SubtitleApp({ project, currentTime, onSeek, autoRun = false }: { project: Project; currentTime: number; onSeek: (seconds: number) => void; autoRun?: boolean }) {
  const bridge = window.manorApps!;
  const [draft, setDraft] = useState<SubtitleDraft | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [style, setStyle] = useState<SubtitleStyle>(DEFAULT_STYLE);
  const [fonts, setFonts] = useState<string[]>(FONTS);
  useEffect(() => { bridge.subtitleFonts?.().then(list => setFonts([...FONTS, ...list.filter(f => !FONTS.includes(f))]), () => {}); }, [bridge]);
  const [lyrics, setLyrics] = useState(project.lyrics);
  // Bài chưa có lời (thường là file nhập ngoài): mở sẵn ô dán lời, vì có lời chuẩn thì phụ đề mới chuẩn.
  const [showLyrics, setShowLyrics] = useState(!project.lyrics);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  function apply(next: SubtitleDraft) { setDraft(next); setCues(next.cues); if (next.style) setStyle({ ...DEFAULT_STYLE, ...next.style }); setDirty(!next.saved && next.cues.length > 0); }
  useEffect(() => {
    setDraft(null); setCues([]); setLyrics(project.lyrics); setShowLyrics(!project.lyrics); setNotice(''); setError('');
    bridge.subtitles(project.id).then(apply, e => setError(message(e)));
    // Rời bài (đổi bài, đóng Bàn nhạc) thì bỏ ASS tạm nếu bài chưa đem đi làm video.
    return () => { void bridge.dropTempAss?.(project.id).catch(() => {}); };
    // Chỉ nạp lại khi đổi bài; cập nhật trạng thái bài không được ghi đè bản đang sửa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  async function run(label: string, work: () => Promise<void>) {
    setBusy(label); setError(''); setNotice('');
    try { await work(); } catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  const transcribe = (force = false, engine: 'gemini' | 'local' = 'gemini') => run(engine === 'local' ? 'local' : 'transcribe', async () => {
    // Lời vừa dán phải được lưu trước, để lần khớp đầu tiên dùng đúng lời này.
    if (lyrics !== project.lyrics) await bridge.updateProject(project.id, { lyrics });
    await bridge.transcribe(project.id, force, engine); apply(await bridge.subtitles(project.id, true));
  });
  const approve = () => run('approve', async () => {
    const next = await bridge.approveSubtitles(project.id, { cues, mode: draft?.mode || 'heard', coverage: draft?.coverage || 0, style });
    setDirty(false); setNotice(`Đã duyệt vào kho SRT · phiên bản ${next.approved?.version ?? ''}. Lần sau mở bài này sẽ dùng thẳng bản duyệt, không gọi API.`);
  });
  const rebuild = () => run('rebuild', async () => {
    if (lyrics !== project.lyrics) await bridge.updateProject(project.id, { lyrics });
    apply(await bridge.subtitles(project.id, true));
  });
  const save = () => run('save', async () => {
    await bridge.saveSubtitles(project.id, { cues, mode: draft?.mode || 'heard', coverage: draft?.coverage || 0, style });
    setDirty(false); setNotice('Đã lưu captions.srt và captions.ass trong thư mục bài.');
  });
  const exportFile = (kind: 'srt' | 'ass') => run(kind, async () => {
    if (dirty) await bridge.saveSubtitles(project.id, { cues, mode: draft?.mode || 'heard', coverage: draft?.coverage || 0, style });
    setDirty(false);
    const target = await bridge.exportSubtitles(project.id, kind);
    if (target) setNotice(`Đã lưu ${target}`);
  });

  function edit(index: number, patch: Partial<Cue>) {
    // Sửa chữ thì mốc từng từ cũ không còn đúng: câu đó chỉ hiện thường, không karaoke.
    setCues(list => list.map((cue, i) => i === index ? { ...cue, ...patch, ...(patch.text !== undefined ? { words: undefined } : {}) } : cue));
    setDirty(true);
  }
  function editTime(index: number, key: 'start' | 'end', text: string) { const value = parseClock(text); if (value !== null) edit(index, { [key]: value }); }
  function remove(index: number) { setCues(list => list.filter((_, i) => i !== index)); setDirty(true); }
  function merge(index: number) {
    setCues(list => { const a = list[index], b = list[index + 1]; if (!b) return list; return [...list.slice(0, index), { start: a.start, end: b.end, text: `${a.text} ${b.text}`, words: a.words && b.words ? [...a.words, ...b.words] : undefined }, ...list.slice(index + 2)]; });
    setDirty(true);
  }
  // Họa thất mở bảng SRT là tự đọc lời luôn, chỉ một lần cho mỗi bài.
  const [autoStarted, setAutoStarted] = useState('');
  useEffect(() => {
    if (autoRun && draft?.needsTranscription && autoStarted !== project.id && !busy) { setAutoStarted(project.id); transcribe(project.words); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, draft, project.id]);
  const active = cues.findIndex(cue => currentTime >= cue.start && currentTime < cue.end);
  const invalid = cues.findIndex((cue, i) => !(cue.end > cue.start) || !cue.text.trim() || (i > 0 && cue.start < cues[i - 1].end - 0.001));

  return <section className="mini-app subtitle-app" aria-label="Phụ đề">
    <div className="mini-toolbar">
      <button onClick={() => transcribe(project.words)} disabled={Boolean(busy)}><Mic size={14} /> {busy === 'transcribe' ? 'Gemini đang đọc lời…' : project.words ? 'Đọc lại lời' : 'Đọc lời bằng Gemini'}</button>
      <button onClick={() => transcribe(true, 'local')} disabled={Boolean(busy) || !lyrics.trim()} title={lyrics.trim() ? 'Căn lời chuẩn vào nhạc ngay trên máy (card đồ hoạ, ~1 phút/bài), không tốn hạn mức Gemini' : 'Cần dán lời chuẩn trước'}><Cpu size={14} /> {busy === 'local' ? 'Máy đang căn lời…' : 'Căn lời trên máy'}</button>
      <button onClick={rebuild} disabled={Boolean(busy) || !project.words}><RefreshCw size={14} /> Khớp lại từ đầu</button>
      <button onClick={() => setShowLyrics(v => !v)} aria-expanded={showLyrics}>Lời chuẩn {project.lyrics ? '' : '(trống)'}</button>
      <span className="grow" />
      <button onClick={save} disabled={Boolean(busy) || !cues.length || invalid >= 0}><Save size={14} /> Lưu</button>
      <button className="primary" onClick={approve} disabled={Boolean(busy) || !cues.length || invalid >= 0}><BadgeCheck size={14} /> Duyệt vào kho SRT</button>
      <button onClick={() => exportFile('srt')} disabled={Boolean(busy) || !cues.length || invalid >= 0}><Download size={14} /> SRT</button>
      <button onClick={() => exportFile('ass')} disabled={Boolean(busy) || !cues.length || invalid >= 0}><Download size={14} /> ASS</button>
    </div>
    {busy === 'transcribe' && <p className="apps-note">Đang tải bản nén giọng hát lên Gemini (miễn phí). Bài 4–5 phút thường mất khoảng một phút.</p>}
    {draft?.mode === 'library' && <p className="apps-note ok">Đang dùng bản đã duyệt trong kho SRT (phiên bản {draft.version}). Không gọi API. Bấm “Khớp lại từ đầu” nếu muốn làm lại.</p>}
    {project.approved && draft?.mode !== 'library' && <p className="apps-note">Bài này đã có bản duyệt v{project.approved.version} trong kho SRT; duyệt lần nữa sẽ thành phiên bản mới, bản cũ vẫn giữ.</p>}
    {!project.lyrics && !draft?.cues.length && <p className="apps-note warn">Bài chưa có lời. Dán lời vào ô bên dưới trước khi đọc lời: chữ sẽ lấy từ lời của bản này, Gemini chỉ lấy mốc thời gian. Không có lời thì Gemini nghe và chép lời luôn.</p>}
    {draft?.mode === 'lyrics' &&<p className="apps-note ok">Chữ lấy từ lời chuẩn, mốc thời gian lấy từ Gemini · khớp {Math.round(draft.coverage * 100)}% từ{draft.missing?.length ? ` · ${draft.missing.length} dòng không nghe thấy trong bản thu (đã bỏ)` : ''}.</p>}
    {draft?.mode === 'heard' && <p className="apps-note warn">{project.lyrics ? `Lời chuẩn chỉ khớp ${Math.round(draft.coverage * 100)}% với bản thu nên đang dùng lời Gemini nghe được. Kiểm tra lời chuẩn có đúng bài/đúng ngôn ngữ không.` : 'Bài chưa có lời chuẩn: đang dùng lời Gemini nghe được, nên nghe soát lại.'}</p>}
    {draft?.needsTranscription && <p className="apps-note">Bấm “Đọc lời bằng Gemini” để lấy mốc thời gian. Kết quả được lưu lại, lần sau không tốn lượt gọi.</p>}
    {notice && <p className="apps-note ok" role="status">{notice}</p>}
    {error && <p className="apps-error" role="alert">{error}</p>}
    {invalid >= 0 && <p className="apps-error">Câu {invalid + 1} sai mốc thời gian hoặc trống chữ.</p>}

    {showLyrics && <div className="lyrics-editor">
      <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={10} aria-label="Lời chuẩn" placeholder="Dán lời bài hát, mỗi câu một dòng…" />
      <small>Sửa lời rồi bấm “Khớp lại từ đầu”. Lời này chỉ lưu trong bài của AI Manor, không ghi vào Tàng Âm Các.</small>
    </div>}

    <div className="subtitle-style">
      <label>Khung<select value={style.width} onChange={e => setStyle({ ...style, width: Number(e.target.value) as 1920 | 1080 })}><option value={1920}>Ngang 16:9</option><option value={1080}>Dọc 9:16</option></select></label>
      <label>Font<select value={style.font} onChange={e => setStyle({ ...style, font: e.target.value })}>{fonts.map(f => <option key={f} style={{ fontFamily: f }}>{f}</option>)}</select></label>
      <label>Cỡ chữ<input type="number" min={2} max={12} step={0.5} value={style.size} onChange={e => setStyle({ ...style, size: Number(e.target.value) })} /></label>
      <label>Màu chữ<input type="color" value={style.color} onChange={e => setStyle({ ...style, color: e.target.value.toUpperCase() })} /></label>
      <label className="check"><input type="checkbox" checked={style.karaoke} onChange={e => setStyle({ ...style, karaoke: e.target.checked })} /> Karaoke (ASS)</label>
      {style.karaoke && <label>Màu đã hát<input type="color" value={style.highlight} onChange={e => setStyle({ ...style, highlight: e.target.value.toUpperCase() })} /></label>}
    </div>

    <ol className="cue-list">
      {cues.map((cue, index) => <li key={index} className={index === active ? 'playing' : ''}>
        <button className="icon" aria-label={`Nghe câu ${index + 1}`} onClick={() => onSeek(cue.start)}><Play size={12} /></button>
        <input className="time" defaultValue={clock(cue.start)} key={`s${index}-${cue.start}`} onBlur={e => editTime(index, 'start', e.target.value)} aria-label={`Bắt đầu câu ${index + 1}`} />
        <input className="time" defaultValue={clock(cue.end)} key={`e${index}-${cue.end}`} onBlur={e => editTime(index, 'end', e.target.value)} aria-label={`Kết thúc câu ${index + 1}`} />
        <input className="text" value={cue.text} onChange={e => edit(index, { text: e.target.value })} aria-label={`Lời câu ${index + 1}`} />
        <button className="icon" title="Gộp với câu sau" onClick={() => merge(index)} disabled={index === cues.length - 1}>⤓</button>
        <button className="icon" title="Xóa câu" onClick={() => remove(index)}>×</button>
      </li>)}
    </ol>
  </section>;
}
