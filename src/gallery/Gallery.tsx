import { useEffect, useState } from 'react';
import { Disc3, ExternalLink, Music4, Play, Radio, Tv, X } from 'lucide-react';
import type { Account, AccountView, YoutubeChannel } from '../apps/types';
import { message } from '../apps/format';
import LiveWindow from './LiveWindow';
import { KENH_TIKTOK, KENH_YOUTUBE, MO_TAB_THUONG, kenhDung, profileDung, tiktokDung } from './kenh';
import './gallery.css';

// Mỗi trang đăng / phát hành là một vật trưng bày. Bấm vào: chọn profile (kênh) đã đăng nhập trang đó, rồi trang mở ngay trong app.
const EXHIBITS = [
  { id: 'youtube', name: 'YouTube', caption: 'Đăng video · YouTube Studio', url: 'https://studio.youtube.com/', glow: '#ff5a4f', Icon: Play },
  { id: 'tiktok', name: 'TikTok', caption: 'Đăng clip ngắn', url: 'https://www.tiktok.com/tiktokstudio/upload', glow: '#57e3e0', Icon: Music4 },
  { id: 'bilibili', name: 'Bilibili', caption: 'Đăng video · bìa 4:3', url: 'https://member.bilibili.com/platform/upload/video/frame', glow: '#4fc3f7', Icon: Tv },
  { id: 'distrokid', name: 'DistroKid', caption: 'Phát hành nhạc lên các nền tảng', url: 'https://distrokid.com/new/', glow: '#ffd27a', Icon: Disc3 },
  { id: 'tunecore', name: 'TuneCore', caption: 'Phát hành nhạc lên các nền tảng', url: 'https://www.tunecore.com/dashboard', glow: '#9f8cff', Icon: Radio },
] as const;
type Exhibit = typeof EXHIBITS[number];

// Phòng trưng bày (trước là Thư phòng).
export default function Gallery() {
  const bridge = window.manorApps;
  const [view, setView] = useState<AccountView | null>(null);
  const [picked, setPicked] = useState<Exhibit | null>(null);
  const [open, setOpen] = useState<{ account: Account; exhibit: Exhibit } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    if (!bridge) return;
    bridge.accounts().then(setView, e => setError(message(e)));
    return bridge.onAccounts(setView);
  }, [bridge]);
  if (!bridge) return <section className="gallery"><p className="gallery-muted">Phòng trưng bày cần bản Windows.</p></section>;

  async function openReal(account: Account, exhibit: Exhibit, channel: YoutubeChannel | null, key: string) {
    setBusy(key); setError('');
    try { await bridge!.openInAccount(account.id, channel ? { channel, cuaSo: true } : { url: exhibit.url, cuaSo: !MO_TAB_THUONG.has(exhibit.id) }); }
    catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  // TikTok chỉ dùng tài khoản Duy TTD: profile nào đăng nhập TikTok khác thì không hiện.
  const owners = (exhibit: Exhibit) => (view?.accounts || []).filter(account => account.sites[exhibit.id] && account.sites[exhibit.id].loggedIn !== false
    && (exhibit.id !== 'tiktok' || tiktokDung(account.sites.tiktok?.channel || ''))
    && profileDung(exhibit.id, account.label, account.email));
  const pickedOwners = picked ? owners(picked) : [];
  // Kênh quét được của một profile, lọc còn các kênh trong KENH_YOUTUBE, tên hiện theo đúng danh sách.
  const youtubeRows = (account: Account): YoutubeChannel[] => {
    const entry = account.sites.youtube;
    const found = entry?.channels?.length ? entry.channels : entry?.channel ? [{ name: entry.channel, handle: '', selected: true }] : [];
    return found.flatMap(c => { const name = kenhDung(c.name); return name ? [{ ...c, name }] : []; });
  };
  // Một kênh có thể hiện ở nhiều profile (tài khoản Google phụ đăng nhập chung một profile, không có handle) → chỉ giữ một dòng
  // ở profile chính của kênh: ưu tiên dòng có handle, rồi dòng đang chọn (kiểm tra 03/11/2026: profile Xing có 3 tài khoản phụ).
  const score = (c: YoutubeChannel) => (c.handle ? 2 : 0) + (c.selected ? 1 : 0);
  const bestYoutube = new Map<string, { id: string; score: number }>();
  for (const a of owners(EXHIBITS[0])) for (const c of youtubeRows(a)) { const cur = bestYoutube.get(c.name); if (!cur || score(c) > cur.score) bestYoutube.set(c.name, { id: a.id, score: score(c) }); }
  const missingChannels = KENH_YOUTUBE.filter(k => !bestYoutube.has(k));

  return <section className="gallery" aria-label="Phòng trưng bày">
    <header className="gallery-title"><small>MỘC NGƯ TRANG</small><h2>Phòng trưng bày</h2><p>Đăng video và phát hành nhạc. Trang mở ngay trong app, chạy bằng profile Cốc Cốc đã đăng nhập sẵn; nút đăng cuối cùng công tử tự bấm.</p></header>
    {error && <p className="gallery-error" role="alert">{error}</p>}
    <div className="gallery-wall">
      {EXHIBITS.map(exhibit => {
        const count = exhibit.id === 'youtube' ? bestYoutube.size : owners(exhibit).length;
        return <button key={exhibit.id} className={`gallery-exhibit ${picked?.id === exhibit.id ? 'picked' : ''} ${count ? '' : 'empty'}`} style={{ '--glow': exhibit.glow } as React.CSSProperties} aria-label={`${exhibit.name}: ${exhibit.caption}`} onClick={() => setPicked(exhibit)}>
          <span className="gallery-light" aria-hidden="true" />
          <span className="gallery-frame"><exhibit.Icon size={46} strokeWidth={1.4} /></span>
          <span className="gallery-plinth"><b>{exhibit.name}</b><small>{exhibit.caption}</small><em>{count ? `${count} ${exhibit.id === 'youtube' ? 'kênh' : 'tài khoản'}` : 'Chưa có tài khoản'}</em></span>
        </button>;
      })}
    </div>
    {picked && <aside className="gallery-pick" role="dialog" aria-label={`Chọn tài khoản ${picked.name}`}>
      <header><div><small>{picked.caption.toUpperCase()}</small><h3>{picked.name}</h3></div><button className="gallery-close" aria-label="Đóng chọn tài khoản" onClick={() => setPicked(null)}><X size={16} /></button></header>
      <ul>
        {pickedOwners.flatMap(account => { const entry = account.sites[picked.id];
          const ready = account.online || account.dedicated;
          // YouTube: mỗi kênh một dòng (một mail có thể có nhiều kênh), chỉ giữ 5 kênh chủ tịch dùng. Trang khác: mỗi profile một dòng.
          const rows: (YoutubeChannel | null)[] = picked.id === 'youtube' ? youtubeRows(account).filter(c => bestYoutube.get(c.name)?.id === account.id) : [null];
          return rows.map(channel => { const key = `${account.id}-${channel?.name || ''}`;
            // Cửa sổ trong app chỉ chiếu được kênh đang chọn của profile; kênh khác mở thẳng ở Cốc Cốc.
            const liveOk = ready && (!channel || channel.selected || channel.name === kenhDung(entry.channel || ''));
            return <li key={key} className="gallery-row">
              <div><strong>{channel?.name || entry.channel || account.label}</strong>
                <span>{[channel?.handle, account.label, account.email].filter(Boolean).join(' · ')}</span></div>
              <div className="gallery-row-actions">
                <button disabled={busy === key} title={MO_TAB_THUONG.has(picked.id) ? 'Mở trang này thành tab trong profile Cốc Cốc thật (có nút dịch trang và tải lại)' : 'Mở đúng trang này trong profile Cốc Cốc thật, cửa sổ riêng một tab'} onClick={() => openReal(account, picked, channel, key)}><ExternalLink size={13} /> {busy === key ? 'Đang mở…' : 'Mở ở Cốc Cốc'}</button>
                <button disabled={!liveOk} title={liveOk ? 'Chiếu trang chạy ngầm vào cửa sổ trong app' : ready ? 'Cửa sổ trong app chỉ chiếu kênh đang chọn của profile' : 'Profile này chưa mở Cốc Cốc'} onClick={() => { setOpen({ account, exhibit: picked }); setPicked(null); }}>Xem trong app</button>
              </div>
            </li>; }); })}
        {!pickedOwners.length && picked.id === 'tiktok' && <li className="gallery-muted">Chưa thấy TikTok {KENH_TIKTOK}: đăng nhập TikTok {KENH_TIKTOK} trong một profile Cốc Cốc rồi bấm Kiểm tra ở Sổ tài khoản (app đọc tên tài khoản TikTok khi kiểm tra).</li>}
        {!pickedOwners.length && picked.id !== 'tiktok' && <li className="gallery-muted">Chưa profile nào đăng nhập {picked.name}. Đăng nhập trong Cốc Cốc rồi bấm Kiểm tra ở Sổ tài khoản (Đại sảnh).</li>}
        {picked.id === 'youtube' && missingChannels.length > 0 && <li className="gallery-muted">Chưa thấy kênh: {missingChannels.join(', ')}. Đăng nhập kênh đó trong một profile Cốc Cốc rồi bấm Kiểm tra ở Sổ tài khoản.</li>}
      </ul>
    </aside>}
    {open && <LiveWindow accountId={open.account.id} url={open.exhibit.url} title={`${open.exhibit.name} · ${open.account.sites[open.exhibit.id]?.channel || open.account.label}`} onClose={() => setOpen(null)} />}
  </section>;
}
