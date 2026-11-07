import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';

const MIN = 1, MAX = 8;
const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value));

// Cửa sổ xem ảnh riêng, phẳng (gắn thẳng vào body để không bị nghiêng theo bảng 3D): cuộn chuột hoặc nút +/- để phóng, kéo để dời, Esc hoặc X để tắt.
export default function ImageViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    // Esc chỉ tắt ảnh, không lọt xuống trang viên (Esc ở đó đóng cả bàn làm việc).
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose(); }
      else if (event.key === '+' || event.key === '=') setScale(s => clamp(s * 1.25));
      else if (event.key === '-') setScale(s => clamp(s / 1.25));
      else if (event.key === '0') reset();
    };
    window.addEventListener('keydown', key, { capture: true });
    return () => window.removeEventListener('keydown', key, { capture: true });
  }, [onClose]);
  useEffect(() => { if (scale === 1) setOffset({ x: 0, y: 0 }); }, [scale]);
  function reset() { setScale(1); setOffset({ x: 0, y: 0 }); }

  return createPortal(<div className="image-viewer" role="dialog" aria-modal="true" aria-label={`Xem ảnh ${title}`}
    onWheel={e => setScale(s => clamp(s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))}>
    <div className="image-viewer-stage" onDoubleClick={() => setScale(s => s > 1 ? 1 : 2.5)}
      onPointerDown={e => { if (scale === 1) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; }}
      onPointerMove={e => { const d = drag.current; if (d) setOffset({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }); }}
      onPointerUp={() => { drag.current = null; }}>
      <img src={src} alt={title} draggable={false} style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, cursor: scale > 1 ? 'grab' : 'zoom-in' }} />
    </div>
    <div className="image-viewer-bar">
      <strong>{title}</strong>
      <button aria-label="Thu nhỏ" disabled={scale <= MIN} onClick={() => setScale(s => clamp(s / 1.25))}><Minus size={16} /></button>
      <output aria-label="Mức phóng">{Math.round(scale * 100)}%</output>
      <button aria-label="Phóng to" disabled={scale >= MAX} onClick={() => setScale(s => clamp(s * 1.25))}><Plus size={16} /></button>
      <button aria-label="Về cỡ vừa khung" onClick={reset}><RotateCcw size={15} /></button>
      <button ref={close} aria-label="Tắt ảnh" onClick={onClose}><X size={17} /></button>
    </div>
  </div>, document.body);
}
