import { useEffect, useState } from 'react';
import { Maximize2, Sparkles, X } from 'lucide-react';
import type { Candidate, ImageState, Preset, Project } from '../apps/types';
import type { CreationDraft } from '../creation/types';
import { message } from '../apps/format';
import ImageViewer from './ImageViewer';
import { buildDraft } from './draft';
import './image-panel.css';

// Năm phong cách thành năm quả cầu sáng; tên huyền huyễn và màu ánh sáng chỉ là lớp giao diện.
export const ORBS: Record<string, { title: string; glow: string }> = {
  'eastern-bard': { title: 'Phong Trần Lãng Ca', glow: '#9fc3ff' },
  swordsman: { title: 'Huyết Mặc Kiếm Hồn', glow: '#ff6b6b' },
  'minh-nhi': { title: 'Nguyệt Hạ Mỹ Nhân', glow: '#d7a6ff' },
  'western-bard': { title: 'Tây Mạc Du Ca', glow: '#ffb35c' },
  'xing-dog': { title: 'Xuân Dã Linh Khuyển', glow: '#8ff0b0' },
};
// Bảng tạo ảnh: chọn quả cầu → bấm Tạo ảnh → 4 ô ChatGPT chạy nền → chọn 1 ảnh → sang Lưu Ảnh Thất (ảnh đó cũng là thumbnail của bài).
export default function ImagePanel({ project, onClose, onToWorkshop }: { project: Project; onClose: () => void; onToWorkshop?: (draft: CreationDraft) => void }) {
  const bridge = window.manorApps!;
  const [presets, setPresets] = useState<Preset[]>([]);
  const [state, setState] = useState<ImageState | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Khung hình trực tiếp của trang Flow/ChatGPT đang chạy ngầm, theo từng ô.
  const [frames, setFrames] = useState<Record<number, string>>({});
  const [watch, setWatch] = useState<number | null>(null);
  // Ảnh đang mở trong cửa sổ xem riêng.
  const [view, setView] = useState<{ url: string; title: string } | null>(null);
  const [moving, setMoving] = useState(false);
  useEffect(() => bridge.onImageFrame?.(frame => {
    if (frame.id !== project.id) return;
    setFrames(current => { const next = { ...current }; for (const slot of frame.slots) next[slot] = `data:image/jpeg;base64,${frame.data}`; return next; });
  }), [bridge, project.id]);
  useEffect(() => { bridge.imagePresets().then(setPresets, e => setError(message(e))); }, [bridge]);
  useEffect(() => {
    bridge.images(project.id).then(next => { setState(next); setPicked(current => current ?? next.set?.presetId ?? null); }, e => setError(message(e)));
    return bridge.onImages(change => { if (change.id === project.id) setState(change); });
  }, [bridge, project.id]);

  async function act(work: () => Promise<ImageState | void>) {
    setError('');
    try { const next = await work(); if (next) setState(next); } catch (e) { setError(message(e)); }
  }
  // Việc đang chạy có stage; việc đã xong hoặc lỗi thì không.
  const running = state?.run?.stage && !state.run.error ? state.run.kind : null;
  const set = state?.set, byId = new Map((state?.candidates || []).map(c => [c.id, c]));
  const chosenInSet = set?.slots.some(slot => slot.candidateId && slot.candidateId === state?.chosen);
  const shown = presets.find(p => p.id === (hover || picked));
  let chatIndex = 0;

  // Sang Lưu Ảnh Thất mang theo trọn bài: ảnh đã chọn, bản nhạc và phụ đề làm ở Họa thất, bên kia không phải chọn lại.
  async function toWorkshop(candidate: Candidate) {
    setMoving(true);
    try {
      onToWorkshop?.(await buildDraft(bridge, project, candidate.id));
      // Ảnh đã chọn mặc định là thumbnail: làm ngầm luôn bộ 5 khung, xem và tải ở quả cầu Thumb bên Lưu Ảnh Thất.
      if (state?.thumbs?.sourceId !== candidate.id && !running) bridge.makeThumbnails(project.id, { adapterId: 'chatgpt', title: project.title, font: 'Arial', mode: 'ai' }).catch(() => {});
    } finally { setMoving(false); }
  }

  return <section className="ht-glass ht-panel ht-panel-image" aria-label="Bảng tạo ảnh">
    <header><h3>Tạo ảnh</h3><button className="ht-icon" aria-label="Đóng bảng" onClick={onClose}><X size={16} /></button></header>
    {error && <p className="ht-error" role="alert">{error}</p>}

    <div className={`ht-orbs ${picked ? 'has-pick' : ''}`} onMouseLeave={() => setHover(null)}>
      {presets.map(preset => { const orb = ORBS[preset.id] || { title: preset.name, glow: '#ffe2a8' };
        return <button key={preset.id} className={`ht-plain ht-orb ${picked === preset.id ? 'picked' : ''}`} style={{ ['--glow' as string]: orb.glow }} aria-pressed={picked === preset.id}
          disabled={Boolean(running)} onMouseEnter={() => setHover(preset.id)} onFocus={() => setHover(preset.id)} onClick={() => setPicked(current => current === preset.id ? null : preset.id)}>
          <span className="ht-orb-sphere" /><span className="ht-orb-name">{orb.title}</span>
        </button>; })}
    </div>
    {shown && <div className="ht-orb-intro" style={{ ['--glow' as string]: ORBS[shown.id]?.glow }}>
      {shown.sample && <img src={shown.sample} alt={`Ảnh mẫu ${ORBS[shown.id]?.title || shown.name}`} />}
      <div><strong>{ORBS[shown.id]?.title || shown.name}</strong><span>{shown.name}</span><small>{shown.description}</small></div>
    </div>}
    {picked && !running && <button className="ht-plain ht-forge" onClick={() => act(() => bridge.generateImageSet(project.id, { presetId: picked }))}><Sparkles size={18} /> Tạo ảnh</button>}

    {watch !== null && frames[watch] && set?.slots[watch]?.status === 'running' && <ImageViewer src={frames[watch]} title={`Đang chạy · ${set.slots[watch].stage}`} onClose={() => setWatch(null)} />}
    {view && <ImageViewer src={view.url} title={view.title} onClose={() => setView(null)} />}
    {set && <div className={`ht-tiles ${chosenInSet ? 'has-chosen' : ''}`} aria-label="Các ô tạo ảnh">
      {set.slots.map((slot, index) => {
        const label = `ChatGPT ${++chatIndex}`;
        const candidate = slot.candidateId ? byId.get(slot.candidateId) : undefined, chosen = Boolean(candidate && candidate.id === state?.chosen);
        return <div key={index} className={`ht-tile ${slot.status} ${chosen ? 'chosen' : ''}`} style={{ ['--p' as string]: `${slot.status === 'done' ? 100 : slot.percent}%` }}>
          {candidate ? <><button className="ht-plain ht-tile-image" aria-label={`Chọn ảnh ${label}`} title="Nhấp: chọn ảnh · Nhấp đúp: mở cửa sổ xem ảnh"
              onDoubleClick={() => setView({ url: candidate.url, title: label })}
              onClick={() => act(() => bridge.chooseImage(project.id, candidate.id))}><img src={candidate.url} alt={label} /></button>
            <button className="ht-plain ht-tile-zoom" aria-label={`Xem ảnh ${label}`} onClick={() => setView({ url: candidate.url, title: label })}><Maximize2 size={14} /></button></>
            : slot.status === 'running' && frames[index]
              ? <button className="ht-plain ht-tile-live" aria-label={`Xem trực tiếp ${label}`} onClick={() => setWatch(index)}><img src={frames[index]} alt={`${label} đang chạy`} /><small>{slot.stage}</small></button>
              : <div className="ht-tile-progress" title={slot.error || slot.stage}><b>{slot.status === 'error' ? '!' : slot.status === 'waiting' ? '…' : `${Math.round(slot.percent)}%`}</b><small>{slot.status === 'error' ? slot.error : slot.status === 'waiting' ? 'Chờ lượt' : slot.stage}</small></div>}
          <span className="ht-tile-label">{label}{slot.account && ` · ${slot.account}`}</span>
          {chosen && <div className="ht-tile-actions">
            <button className="ht-plain" disabled={moving} title="Ảnh này cũng là thumbnail của bài" onClick={() => act(() => toWorkshop(candidate!))}>{moving ? 'Đang chuyển nhạc và phụ đề…' : 'Sang Lưu Ảnh Thất'}</button>
          </div>}
        </div>;
      })}
    </div>}
    {running && <p className="ht-muted ht-run"><span className="ht-spinner" />{state?.run?.stage}<button className="ht-link" onClick={() => act(() => bridge.cancelImages(project.id))}>Hủy</button></p>}
    {state?.run?.error && <p className="ht-error">{state.run.error}</p>}

  </section>;
}
