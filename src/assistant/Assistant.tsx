import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, Sparkles, Square, X } from 'lucide-react';
import './assistant.css';

type Event = { kind: 'text' | 'tool' | 'error' | 'done'; text?: string };
type Line = { who: 'me' | 'tien' | 'tool' | 'error'; text: string };
export type AssistantBridge = {
  ask: (text: string) => Promise<boolean>; cancel: () => Promise<boolean>; reset: () => Promise<boolean>; fairy: (who: 'tien' | 'nhi') => Promise<Uint8Array>; weather: () => Promise<import('../world/WorldClock').LiveWeather>;
  onEvent: (callback: (event: Event) => void) => () => void; openExternal: (id: string) => Promise<boolean>;
};
declare global { interface Window { manorAssistant?: AssistantBridge } }

const OPEN = /\[\[mo:([a-z-]+)\]\]/g;

// Khung chat với Tiên Nhỏ: nhắn việc bằng lời; trả lời có thẻ [[mo:<app>]] thì mở mini app đó.
export default function Assistant({ onClose, onOpenApp }: { onClose: () => void; onOpenApp: (id: string) => void }) {
  const bridge = window.manorAssistant;
  const [lines, setLines] = useState<Line[]>([{ who: 'tien', text: 'Tao là Tiên Nhỏ. Nhắn tao việc cần làm, vd: "lấy bài Một chén cho sầu làm SRT", "mở Xưởng MV".' }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null), openRef = useRef(onOpenApp);
  openRef.current = onOpenApp;

  useEffect(() => bridge?.onEvent(event => {
    if (event.kind === 'done') { setBusy(false); return; }
    let text = event.text || '';
    if (event.kind === 'text') { for (const [, id] of text.matchAll(OPEN)) openRef.current(id); text = text.replace(OPEN, '').trim(); if (!text) return; }
    const who: Line['who'] = event.kind === 'text' ? 'tien' : event.kind;
    setLines(list => [...list, { who, text }]);
  }), [bridge]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [lines]);

  async function send() {
    const text = draft.trim(); if (!text || busy || !bridge) return;
    setLines(list => [...list, { who: 'me', text }]); setDraft(''); setBusy(true);
    try { await bridge.ask(text); } catch (e) { setBusy(false); setLines(list => [...list, { who: 'error', text: e instanceof Error ? e.message : String(e) }]); }
  }

  return <section className="assistant" role="dialog" aria-label="Trợ lý Tiên Nhỏ">
    <header><Sparkles size={16} /><b>Tiên Nhỏ</b><small>Claude · làm việc trong app</small>
      <button aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" onClick={() => { void bridge?.reset(); setLines(list => list.slice(0, 1)); }}><RotateCcw size={14} /></button>
      <button aria-label="Đóng" onClick={onClose}><X size={16} /></button>
    </header>
    <div className="assistant-log" ref={log}>
      {lines.map((line, i) => <p key={i} className={`assistant-${line.who}`}>{line.who === 'tool' ? `⚙ ${line.text}` : line.text}</p>)}
      {busy && <p className="assistant-tien assistant-typing">…</p>}
      {!bridge && <p className="assistant-error">Trợ lý chỉ chạy trong bản Windows (Electron) của app.</p>}
    </div>
    <form onSubmit={e => { e.preventDefault(); void send(); }}>
      <textarea value={draft} rows={2} placeholder="Nhắn Tiên Nhỏ…" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} />
      {busy ? <button type="button" aria-label="Dừng" onClick={() => void bridge?.cancel()}><Square size={15} /></button> : <button type="submit" aria-label="Gửi" disabled={!draft.trim()}><Send size={15} /></button>}
    </form>
  </section>;
}
