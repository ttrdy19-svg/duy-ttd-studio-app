import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, RefreshCw, X } from 'lucide-react';
import type { ImageState, Project, Ratio, ThumbFrame } from '../apps/types';
import { displayTitle, duration, message, songName } from '../apps/format';
import ImageViewer from '../hoathat/ImageViewer';

const RATIOS: Ratio[] = ['16:9', '9:16', '1:1', '2:3', '4:3'];
const STATUS: Record<ThumbFrame['status'], string> = { waiting: 'Đang chờ', running: 'Đang tạo', checking: 'Đang dò chính tả', done: 'Xong', bad: 'Sai chính tả', error: 'Lỗi' };

// Ô khung đang làm: trạng thái, phần trăm, lần thử, thời gian đã chạy và tài khoản đang làm, để biết khung đó còn chạy hay đã kẹt.
function FrameProgress({ frame, now }: { frame?: ThumbFrame; now: number }) {
  if (!frame) return <>Đang làm…</>;
  const elapsed = frame.startedAt ? ((frame.endedAt || now) - frame.startedAt) / 1000 : 0;
  return <div className="thumb-progress" data-status={frame.status}>
    <b>{STATUS[frame.status]}{frame.status === 'running' && frame.percent ? ` · ${Math.round(frame.percent)}%` : ''}</b>
    {(frame.status === 'running' || frame.status === 'checking') && <i><span style={{ width: `${Math.max(4, Math.min(100, frame.percent || 0))}%` }} /></i>}
    {frame.text && frame.text !== STATUS[frame.status] && <small>{frame.text}</small>}
    <small>{[frame.attempt && frame.tries ? `lần ${frame.attempt}/${frame.tries}` : '', elapsed >= 1 ? duration(elapsed) : '', frame.account || ''].filter(Boolean).join(' · ')}</small>
  </div>;
}

// Quả cầu sáng ở Lưu Ảnh Thất: thumbnail làm ngầm từ ảnh đã chọn ở Họa thất; bấm vào để xem trước 5 khung và tải về, không phải quay lại Họa thất.
export default function ThumbOrb({ projectId }: { projectId: string }) {
  const bridge = window.manorApps;
  const [state, setState] = useState<ImageState | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ url: string; title: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!bridge) return;
    bridge.images(projectId).then(setState, e => setError(message(e)));
    bridge.project(projectId).then(setProject, () => {});
    return bridge.onImages(change => { if (change.id === projectId) setState(change); });
  }, [bridge, projectId]);
  useEffect(() => {
    if (!open || view) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setOpen(false); } };
    window.addEventListener('keydown', key, { capture: true });
    return () => window.removeEventListener('keydown', key, { capture: true });
  }, [open, view]);
  const making = state?.run?.kind === 'thumbs' && state.run.stage && !state.run.error;
  useEffect(() => { if (!making || !open) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [making, open]);
  if (!bridge) return null;

  const frames = making ? state?.run?.frames : undefined;
  const thumbs = state?.thumbs, ready = RATIOS.filter(ratio => thumbs?.urls?.[ratio]).length;
  async function act(work: () => Promise<ImageState | string | null | void>) {
    setError(''); setNotice('');
    try { const next = await work(); if (next && typeof next === 'object') setState(next); else if (typeof next === 'string') setNotice(`Đã lưu thumbnail vào ${next}`); }
    catch (e) { setError(message(e)); }
  }
  const remake = () => act(() => bridge.makeThumbnails(projectId, { adapterId: 'chatgpt', title: project?.title || '', font: 'Arial', mode: 'ai' }));

  return <>
    <button className={`thumb-orb ${making ? 'working' : ready ? 'ready' : ''}`} aria-label="Xem thumbnail" title={making ? state?.run?.stage : ready ? `${ready}/5 thumbnail` : 'Thumbnail'} onClick={() => setOpen(true)}>
      <span className="thumb-orb-sphere" /><span className="thumb-orb-label">Thumb<small>{making ? 'đang làm…' : `${ready}/5`}</small></span>
    </button>
    {open && createPortal(<div className="thumb-board" role="dialog" aria-modal="true" aria-label="Thumbnail của bài">
      <section>
        <header><h3>Thumbnail · {project ? songName(project.title, project.genre) : ''}</h3><button className="thumb-close" aria-label="Đóng thumbnail" onClick={() => setOpen(false)}><X size={17} /></button></header>
        {making && <p className="thumb-status" role="status">{frames ? `Đang làm · xong ${RATIOS.filter(r => frames[r]?.status === 'done').length}/5 khung` : state?.run?.stage}</p>}
        {state?.run?.kind === 'thumbs' && state.run.error && <p className="thumb-error">{state.run.error}</p>}
        {thumbs && project && !making && thumbs.title !== displayTitle(project.title, project.genre) && <p className="thumb-error">Chữ trên bộ thumbnail này là “{thumbs.title}”, chưa khớp tên bài “{displayTitle(project.title, project.genre)}”. Bấm “Làm lại cả bộ” để làm lại.</p>}
        {error && <p className="thumb-error" role="alert">{error}</p>}
        {notice && <p className="thumb-status">{notice}</p>}
        <div className="thumb-board-grid">{RATIOS.map(ratio => { const url = thumbs?.urls?.[ratio], check = thumbs?.checks?.[ratio];
          return <figure key={ratio} className={check?.ok ? 'ok' : check ? 'bad' : ''}>
            {url && making && frames?.[ratio] && frames[ratio]!.status !== 'done' && frames[ratio]!.status !== 'waiting' ? <div className="thumb-empty" data-ratio={ratio}><FrameProgress frame={frames[ratio]} now={now} /></div> : url ? <button aria-label={`Xem thumbnail ${ratio}`} onClick={() => setView({ url, title: `Thumbnail ${ratio}` })}><img src={url} alt={`Thumbnail ${ratio}`} /></button> : <div className="thumb-empty" data-ratio={ratio}>{making ? <FrameProgress frame={frames?.[ratio]} now={now} /> : 'Chưa có'}</div>}
            <figcaption>{ratio}{check && !check.ok && <small>{check.problems.join('; ')}</small>}
              {check && !check.ok && <button aria-label={`Làm lại khung ${ratio}`} disabled={Boolean(making)} onClick={() => act(() => bridge.retryThumbnail(projectId, ratio))}><RefreshCw size={12} /></button>}</figcaption>
          </figure>; })}</div>
        <footer>
          <button disabled={Boolean(making)} onClick={remake}><RefreshCw size={14} /> {thumbs ? 'Làm lại cả bộ' : 'Làm thumbnail'}</button>
          <button className="primary" disabled={!ready} onClick={() => act(() => bridge.exportThumbnails(projectId))}><Download size={14} /> Tải {ready || ''} thumbnail</button>
        </footer>
      </section>
    </div>, document.body)}
    {view && <ImageViewer src={view.url} title={view.title} onClose={() => setView(null)} />}
  </>;
}
