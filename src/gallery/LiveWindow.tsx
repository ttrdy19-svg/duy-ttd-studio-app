import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, RotateCw, X } from 'lucide-react';
import type { LiveInput } from '../apps/types';
import { message } from '../apps/format';

const WIDTH = 1280, HEIGHT = 800;
const BUTTON = ['left', 'middle', 'right'] as const;
const modifiers = (e: { altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0);
// Phím đặc biệt gửi thẳng vào trang; chữ thường đi qua ô nhập ẩn để bộ gõ tiếng Việt (Unikey, Telex) ghép dấu đúng.
const SPECIAL = new Set(['Backspace', 'Delete', 'Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

// Cửa sổ sống: trang thật (YouTube Studio, TikTok, DistroKid…) chạy ngầm trong profile Cốc Cốc đã đăng nhập;
// đây là hình trực tiếp của trang, bấm chuột, cuộn, gõ chữ đều đi vào trang. Không mở cửa sổ trình duyệt nào ra màn hình.
export default function LiveWindow({ accountId, url, title, onClose }: { accountId: string; url: string; title: string; onClose: () => void }) {
  const bridge = window.manorApps!;
  const [id, setId] = useState('');
  const [frame, setFrame] = useState('');
  const [page, setPage] = useState({ url, title: '', loading: true });
  const [address, setAddress] = useState(url);
  const [error, setError] = useState('');
  const screen = useRef<HTMLDivElement>(null), keys = useRef<HTMLTextAreaElement>(null), session = useRef('');
  const composing = useRef(false), lastMove = useRef(0), buttons = useRef(0);

  useEffect(() => {
    let alive = true;
    const offFrame = bridge.onLiveFrame(f => { if (f.id === session.current) setFrame(f.data); });
    const offMeta = bridge.onLiveMeta(meta => {
      if (meta.id !== session.current) return;
      if (meta.error) setError(meta.error);
      if (meta.closed) { setError(current => current || 'Trang đã đóng.'); return; }
      if (meta.url) { setPage({ url: meta.url, title: meta.title || '', loading: Boolean(meta.loading) }); setAddress(meta.url); }
    });
    bridge.openLive(accountId, url).then(value => { if (!alive) { void bridge.closeLive(value); return; } session.current = value; setId(value); }, e => setError(message(e)));
    return () => { alive = false; offFrame(); offMeta(); if (session.current) void bridge.closeLive(session.current); };
  }, [bridge, accountId, url]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && document.activeElement !== keys.current) { event.preventDefault(); event.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', key, { capture: true });
    return () => window.removeEventListener('keydown', key, { capture: true });
  }, [onClose]);

  const input = (event: LiveInput) => { if (session.current) void bridge.liveInput(session.current, event); };
  const point = (e: { clientX: number; clientY: number }) => {
    const box = screen.current!.getBoundingClientRect();
    return { x: Math.round((e.clientX - box.left) * WIDTH / box.width), y: Math.round((e.clientY - box.top) * HEIGHT / box.height) };
  };
  const mouse = (type: 'mousePressed' | 'mouseReleased' | 'mouseMoved', e: React.PointerEvent) => input({ kind: 'mouse', type, ...point(e), button: type === 'mouseMoved' ? (buttons.current ? 'left' : 'none') : BUTTON[e.button] || 'left', buttons: buttons.current, clickCount: type === 'mouseMoved' ? 0 : e.detail || 1, modifiers: modifiers(e) });
  function keyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (composing.current) return;
    const shortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() !== 'v';
    if (!SPECIAL.has(e.key) && !shortcut) return;
    e.preventDefault();
    const text = e.key === 'Enter' ? '\r' : undefined;
    input({ kind: 'key', type: text ? 'keyDown' : 'rawKeyDown', key: e.key, code: e.code, text, keyCode: e.keyCode, modifiers: modifiers(e) });
    input({ kind: 'key', type: 'keyUp', key: e.key, code: e.code, keyCode: e.keyCode, modifiers: modifiers(e) });
  }
  function typed() { const box = keys.current!; if (composing.current || !box.value) return; input({ kind: 'text', text: box.value }); box.value = ''; }

  return createPortal(<div className="live-window" role="dialog" aria-modal="true" aria-label={`Cửa sổ ${title}`}>
    <section>
      <header>
        <button aria-label="Trang trước" onClick={() => input({ kind: 'nav', action: 'back' })}><ArrowLeft size={16} /></button>
        <button aria-label="Trang sau" onClick={() => input({ kind: 'nav', action: 'forward' })}><ArrowRight size={16} /></button>
        <button aria-label="Tải lại trang" onClick={() => input({ kind: 'nav', action: 'reload' })}><RotateCw size={15} className={page.loading ? 'spin' : ''} /></button>
        <form onSubmit={e => { e.preventDefault(); const next = /^https?:\/\//.test(address) ? address : `https://${address}`; input({ kind: 'nav', action: 'url', url: next }); }}>
          <input aria-label="Địa chỉ trang" value={address} onChange={e => setAddress(e.target.value)} spellCheck={false} />
        </form>
        <strong title={page.title}>{title}</strong>
        <button className="live-close" aria-label="Đóng cửa sổ" onClick={onClose}><X size={17} /></button>
      </header>
      <div className="live-screen" ref={screen} tabIndex={-1}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); buttons.current = 1; mouse('mousePressed', e); keys.current?.focus(); }}
        onPointerUp={e => { buttons.current = 0; mouse('mouseReleased', e); keys.current?.focus(); }}
        onPointerMove={e => { const now = Date.now(); if (now - lastMove.current < 40) return; lastMove.current = now; mouse('mouseMoved', e); }}
        onWheel={e => input({ kind: 'mouse', type: 'mouseWheel', ...point(e), deltaX: e.deltaX, deltaY: e.deltaY, modifiers: modifiers(e) })}
        onContextMenu={e => e.preventDefault()}>
        {frame ? <img src={`data:image/jpeg;base64,${frame}`} alt={`Trang ${page.title || title}`} draggable={false} /> : <p className="live-wait">{error || (id ? 'Đang mở trang…' : 'Đang nối tới profile Cốc Cốc…')}</p>}
        {frame && error && <p className="live-error" role="alert">{error}</p>}
        <textarea ref={keys} className="live-keys" aria-label="Gõ vào trang" onKeyDown={keyDown} onInput={typed}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; typed(); }} />
      </div>
    </section>
  </div>, document.body);
}
