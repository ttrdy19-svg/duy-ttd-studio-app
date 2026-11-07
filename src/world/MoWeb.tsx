import { useEffect, useState } from 'react';
import { Globe, X } from 'lucide-react';
import type { AccountView } from '../apps/types';
import './viec-ngay.css';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const SITES: [string, string][] = [
  ['ChatGPT', 'https://chatgpt.com/'], ['Flow', 'https://labs.google/fx/tools/flow'], ['Dreamina', 'https://dreamina.capcut.com/ai-tool/home'],
  ['YouTube Studio', 'https://studio.youtube.com/'], ['TikTok', 'https://www.tiktok.com/'], ['Gmail', 'https://mail.google.com/'],
];

// Mở web bằng profile riêng của app (chủ tịch 04/11/2026: "muốn mở trang web bằng profile riêng ở đâu"): nút trên màn hình chính,
// mỗi tài khoản một dòng, bấm tên trang là mở đúng trang đó trong profile máy của tài khoản (cửa sổ Cốc Cốc thường), hoặc dán link bất kỳ.
export default function MoWeb() {
  const bridge = window.manorApps;
  const [open, setOpen] = useState(false), [view, setView] = useState<AccountView | null>(null);
  const [link, setLink] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => { if (open && bridge?.accounts) bridge.accounts().then(setView, e => setError(message(e))); }, [open, bridge]);
  if (!bridge?.openInAccount) return null;
  const go = async (accountId: string, label: string, url: string) => {
    setError(''); setNotice('');
    if (!/^https:\/\//i.test(url)) { setError('Link phải bắt đầu bằng https://'); return; }
    try { await bridge.openInAccount(accountId, { url, cuaSo: false }); setNotice(`Đã mở ${url.replace(/^https:\/\//, '').split('/')[0]} trong profile máy của ${label} (cửa sổ Cốc Cốc riêng của app).`); }
    catch (e) { setError(message(e)); }
  };
  const accounts = (view?.accounts || []).filter(a => a.may && a.enabled !== false);
  return <>
    <button className="vn-orb mw-orb" onClick={() => setOpen(o => !o)} title="Mở trang web bằng profile riêng của từng tài khoản (Cốc Cốc riêng của app, không đụng Cốc Cốc của mày)"><Globe size={17} /> Mở web</button>
    {open && <section className="vn-panel mw-panel" aria-label="Mở web bằng profile máy">
      <button className="vn-close" aria-label="Đóng" onClick={() => setOpen(false)}><X size={16} /></button>
      <h2>Mở web bằng profile máy</h2>
      <p className="vn-why">Bấm tên trang ở dòng tài khoản cần dùng. Trang mở trong Cốc Cốc riêng của app, đã đăng nhập sẵn mail đó. Muốn trang khác thì dán link vào ô dưới rồi bấm tên tài khoản.</p>
      <input className="mw-link" value={link} onChange={e => setLink(e.target.value)} placeholder="Dán link bất kỳ (https://…), rồi bấm nút “Mở link này” ở dòng tài khoản" aria-label="Link cần mở" />
      {error && <p className="vn-error">{error}</p>}
      {notice && <p className="vn-why">✓ {notice}</p>}
      <ol className="vn-list">{accounts.map(a => <li key={a.id} className="mw-row">
        <span><b>{a.label}</b><small>{a.email || '—'}{a.online ? ' · đang bật' : ''}</small></span>
        <div className="mw-sites">{SITES.map(([name, url]) => <button key={name} onClick={() => void go(a.id, a.label, url)} title={`Mở ${name} bằng mail ${a.email || a.label}`}>{name}</button>)}
          <button className="mw-own" disabled={!link.trim()} onClick={() => void go(a.id, a.label, link.trim())} title="Mở link vừa dán bằng tài khoản này">Mở link này</button></div>
      </li>)}</ol>
      {!accounts.length && <p className="vn-why">Chưa có tài khoản nào trong profile máy. Bấm nút đỏ “Việc cần làm ngay” để đăng nhập máy trước.</p>}
    </section>}
  </>;
}
