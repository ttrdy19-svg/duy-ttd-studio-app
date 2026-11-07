import { Fragment, useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Coins, ExternalLink, FolderOpen, KeyRound, LogIn, Plus, Puzzle, RefreshCw, Trash2, X } from 'lucide-react';
import type { Account, AccountView, ProfileConnect, Service, Site, SitePatch } from '../apps/types';
import { message } from '../apps/format';
import { CreditTag, LoiDialog, LoiMark, ScanLine, loiCua } from './chung';
import SachPhep, { coWebGL, docCaiDatSach, luuCaiDatSach } from './SachPhep';
import { TheProfile, hanhDongTrang } from './TheProfile';
import './hall.css';

// Giữ tên xuất cũ cho nơi khác đang dùng (ViecNgay).
export { choKiem, loiCua } from './chung';
export type { AccountLoi } from './chung';

const WORK_SITES: string[] = ['flow', 'chatgpt'];
const DAY = 86400000;
// Số ngày còn lại của gói (âm = đã hết hạn); không ghi hạn thì null.
function daysLeft(until?: string) { return until ? Math.ceil((Date.parse(`${until}T23:59:59`) - Date.now()) / DAY) : null; }
function shortDate(until: string) { const [y, m, d] = until.split('-'); return `${d}/${m}/${y.slice(2)}`; }
function untilClass(left: number | null) { return left === null ? '' : left < 0 ? 'expired' : left <= 7 ? 'soon' : ''; }

// Một ô trong bảng: chọn gói (hoặc "—" = chưa đăng nhập trang này). Cookie dò được thì hiện chấm xanh/đỏ.
function SiteCell({ account, site, busy, onPlan, onWork, onLoi }: { account: Account; site: Site; busy: boolean; onPlan: (plan: string | null) => void; onWork: () => void; onLoi: () => void }) {
  const entry = account.sites[site.id];
  const mark = <LoiMark list={loiCua(account, site.id)} label={`${site.name} của ${account.label}`} onOpen={onLoi} />;
  const state = !entry ? '' : entry.loggedIn === false ? 'lost' : entry.loggedIn ? 'ok' : 'manual';
  const title = state === 'lost' ? 'Đã ghi nhưng lần kiểm tra gần nhất không thấy đăng nhập' : state === 'ok' ? 'Đã đăng nhập (kiểm tra tự động)' : state === 'manual' ? (site.detect ? 'Tự đánh dấu, chưa kiểm tra' : 'Tự đánh dấu') : 'Chưa đăng nhập trang này';
  // YouTube/TikTok: không có gói, chỉ hiện kênh / tài khoản dùng để đăng.
  if (site.channel) return <td className={`hall-site hall-channel-cell ${state}`} title={title}>
    {entry ? <span className="hall-channel"><i />{entry.channel || 'Đã đăng nhập'}</span> : <span className="hall-channel none">—</span>}{mark}
  </td>;
  return <td className={`hall-site ${state}`} title={title}>
    <select value={entry?.plan || ''} disabled={busy} aria-label={`${site.name} của ${account.label}`} onChange={e => onPlan(e.target.value || null)}>
      <option value="">—</option>
      {site.plans.map(plan => <option key={plan} value={plan}>{plan}</option>)}
    </select>{mark}
    {account.credits?.[site.id] && <CreditTag site={site.id} found={account.credits[site.id]!} />}
    {entry?.until && <small className={`hall-until ${untilClass(daysLeft(entry.until))}`}>{daysLeft(entry.until)! < 0 ? 'hết hạn' : 'đến'} {shortDate(entry.until)}{entry.autoRenew === true ? ' ↻' : ''}</small>}
    {entry && WORK_SITES.includes(site.id) && <label className="hall-work"><input type="checkbox" checked={account.services.includes(site.id as Service)} onChange={onWork} /> chạy việc</label>}
  </td>;
}


// Hàng chi tiết của một profile: ghi chú chung, và với từng trang đã đăng nhập: hạn gói, tự gia hạn, ghi chú, tên kênh YouTube.
function AccountDetail({ account, sites, profiles, onSite, onNote, onAddSite, onProfile, onWake }: { account: Account; sites: Site[]; profiles: { dir: string; name: string }[]; onSite: (patch: SitePatch) => void; onNote: (note: string) => void; onAddSite: (link: string) => Promise<void>; onProfile: (patch: { profileDir?: string; dedicated?: boolean }) => void; onWake: () => void }) {
  const owned = sites.filter(site => account.sites[site.id]);
  const [link, setLink] = useState('');
  const guessed = account.profileDir || profiles.find(p => p.name.toLowerCase() === account.label.toLowerCase())?.dir || '';
  return <div className="hall-detail">
    {/* Profile riêng cho kênh (không dùng lướt web): app được tự bật ngầm khi cần, không mở cửa sổ, không đụng tab của công tử. */}
    <div className="hall-profile">
      <label>Profile Cốc Cốc<select value={guessed} aria-label={`Profile Cốc Cốc của ${account.label}`} onChange={e => onProfile({ profileDir: e.target.value })}>
        <option value="">Chưa chọn</option>{profiles.map(p => <option key={p.dir} value={p.dir}>{p.name} ({p.dir})</option>)}
      </select></label>
      <label className="hall-tick"><input type="checkbox" checked={Boolean(account.dedicated)} disabled={!guessed} onChange={e => onProfile({ profileDir: guessed, dedicated: e.target.checked })} /> Chỉ dùng cho kênh: app được tự bật ngầm</label>
      {account.dedicated && !account.online && <button onClick={onWake}>Bật ngầm ngay</button>}
    </div>
    {/* Trang khác profile này đã đăng nhập bằng Google: dán link, app thêm cột trang đó và Kiểm tra tự quét đăng nhập/gói. */}
    <div className="hall-add hall-detail-add">
      <input value={link} onChange={e => setLink(e.target.value)} placeholder="Trang khác profile này đã đăng nhập bằng Google: dán link (vd. klingai.com)" aria-label={`Thêm trang cho ${account.label}`}
        onKeyDown={e => { if (e.key === 'Enter' && link.trim()) { void onAddSite(link).then(() => setLink('')); } }} />
      <button disabled={!link.trim()} onClick={() => onAddSite(link).then(() => setLink(''))}><Plus size={13} /> Thêm & quét</button>
    </div>
    <label className="hall-detail-note">Ghi chú profile
      <textarea key={account.note} defaultValue={account.note || ''} rows={2} placeholder="vd. mail phụ, chỉ dùng làm kênh YouTube…" onBlur={e => e.target.value !== (account.note || '') && onNote(e.target.value)} />
    </label>
    {owned.length ? <div className="hall-detail-sites">{owned.map(site => {
      const entry = account.sites[site.id], left = daysLeft(entry.until);
      return <fieldset key={site.id} aria-label={`Chi tiết ${site.name}`}>
        <legend>{site.channel ? site.name : `${site.name} · ${entry.plan}`}</legend>
        <ScanLine account={account} site={site} />
        {/* Một mail có thể có nhiều kênh: chọn đúng một kênh dùng để đăng. Chưa đọc được kênh nào thì gõ tay. */}
        {site.id === 'youtube' && (entry.channels?.length
          ? <label>Kênh dùng để đăng<select value={entry.channel || entry.channels.find(c => c.selected)?.name || entry.channels[0].name} onChange={e => onSite({ id: site.id, channel: e.target.value })}>
              {entry.channels.map(c => <option key={`${c.name}${c.handle}`} value={c.name}>{c.name}{c.handle ? ` (${c.handle})` : ''}</option>)}
            </select></label>
          : <label>Tên kênh<input key={entry.channel} defaultValue={entry.channel || ''} placeholder="Bấm Kiểm tra để tự đọc" onBlur={e => e.target.value !== (entry.channel || '') && onSite({ id: site.id, channel: e.target.value })} /></label>)}
        {site.id === 'youtube' && entry.channels && entry.channels.length > 1 && <small className="hall-channels">Mail này có {entry.channels.length} kênh</small>}
        {site.id === 'tiktok' && <label>Tài khoản đăng<input key={entry.channel} defaultValue={entry.channel || ''} placeholder="Bấm Kiểm tra để tự đọc" onBlur={e => e.target.value !== (entry.channel || '') && onSite({ id: site.id, channel: e.target.value })} /></label>}
        {!site.channel && entry.plan !== 'Free' && <>
        <label>Gói đến ngày<input type="date" key={entry.until} defaultValue={entry.until || ''} onBlur={e => e.target.value !== (entry.until || '') && onSite({ id: site.id, until: e.target.value })} /></label>
        {left !== null && <small className={`hall-until ${untilClass(left)}`}>{left < 0 ? `Đã hết hạn ${-left} ngày` : `Còn ${left} ngày`}</small>}
        <label>Tự gia hạn<select value={entry.autoRenew == null ? '' : String(entry.autoRenew)} onChange={e => onSite({ id: site.id, autoRenew: e.target.value === '' ? null : e.target.value === 'true' })}>
          <option value="">Chưa rõ</option><option value="true">Có</option><option value="false">Không</option>
        </select></label></>}
        <label>Ghi chú<input key={entry.note} defaultValue={entry.note || ''} placeholder="vd. gói năm, thẻ Visa…" onBlur={e => e.target.value !== (entry.note || '') && onSite({ id: site.id, note: e.target.value })} /></label>
      </fieldset>;
    })}</div> : <p className="hall-muted">Chọn gói ở các ô trong bảng để ghi chi tiết từng trang.</p>}
  </div>;
}


// Dòng tóm tắt: mỗi trang có bao nhiêu profile, theo từng gói.
function summary(view: AccountView) {
  return view.sites.map(site => {
    if (site.channel) { const n = view.accounts.filter(account => account.sites[site.id]).length; return n ? `${site.name}: ${n} tài khoản` : ''; }
    const plans = new Map<string, number>();
    for (const account of view.accounts) { const plan = account.sites[site.id]?.plan; if (plan) plans.set(plan, (plans.get(plan) || 0) + 1); }
    return plans.size ? `${site.name}: ${[...plans].map(([plan, n]) => `${n} ${plan}`).join(', ')}` : '';
  }).filter(Boolean).join(' · ');
}
// Gói sắp hết hạn (≤ 7 ngày) hoặc đã hết hạn mà không tự gia hạn: nhắc ngay đầu bảng.
function expiring(view: AccountView) {
  return view.accounts.flatMap(account => view.sites.flatMap(site => {
    const entry = account.sites[site.id], left = daysLeft(entry?.until);
    return left !== null && left <= 7 && entry.autoRenew !== true ? [`${account.label} · ${site.name} ${left < 0 ? 'đã hết hạn' : `còn ${left} ngày`}`] : [];
  }));
}

// Sổ tài khoản ở Đại sảnh: profile Cốc Cốc, các trang đã đăng nhập kèm gói, và API key. Chỉ lưu trên máy này, mã hóa bằng Windows.
// Mọi profile Cốc Cốc trên máy (kể cả chưa cài tiện ích): mở tab trắng để đăng nhập trang mới, hoặc dán link mở thẳng trong profile đó.
// Đăng nhập gì là Cốc Cốc tự lưu vào profile; app chỉ giữ thông tin hiển thị.
// "https://www.suno.com/x" / "suno.com" → "suno.com" để báo cho dễ đọc.
function hostName(link: string) { try { return new URL(/^https?:/i.test(link.trim()) ? link.trim() : `https://${link.trim()}`).hostname.replace(/^www\./, ''); } catch { return link.trim(); } }

// Profile đã cài tiện ích mà mở trang mới → app ghi luôn trang đó vào sổ của profile và báo; chưa cài thì chỉ mở.
function ProfileOpener({ profiles, accounts, installDirectory, onError, onNotice, onView }: { profiles: { dir: string; name: string }[]; accounts: Account[]; installDirectory?: string; onError(text: string): void; onNotice(text: string): void; onView(view: AccountView): void }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [states, setStates] = useState<Record<string, ProfileConnect['state']>>({});
  const bridge = window.manorApps!;
  useEffect(() => bridge.onProfilesConnect?.(item => setStates(s => ({ ...s, [item.dir]: item.state }))), [bridge]);
  const open = async (p: { dir: string; name: string }, owner: Account | undefined, url?: string) => {
    onError(''); onNotice('');
    const raw = (url || '').trim(), link = raw && !/^https:\/\//i.test(raw) ? `https://${raw.replace(/^http:\/\//i, '')}` : raw;
    try {
      await bridge.openInProfile(p.dir, link || undefined, false); setLinks(l => ({ ...l, [p.dir]: '' }));
      if (!link) return onNotice(`Đã mở tab trắng trong profile ${p.name}.`);
      const host = hostName(link);
      if (!owner) return onNotice(`Đã mở ${host} trong profile ${p.name}. Profile này chưa cài tiện ích nên app chưa ghi được trang vào sổ — bấm "Cài tiện ích" ở dòng này.`);
      onView(await bridge.addSite(link, owner.id));
      onNotice(`✓ Đã thêm trang ${host} vào profile ${p.name}. Đăng nhập xong trên Cốc Cốc thì bấm Kiểm tra ở dòng ${owner.label} để app xác nhận.`);
    } catch (e) { onError(message(e)); }
  };
  // Cài tiện ích: mở trang tiện ích ngay trong profile đó + chép sẵn đường dẫn thư mục tiện ích để dán vào hộp chọn thư mục.
  // Không bật cửa sổ thư mục ra (chủ tịch dặn: việc phụ thì chạy ngầm, không mở thêm cửa sổ).
  const install = async (p: { dir: string; name: string }) => {
    onError(''); onNotice('');
    try {
      await bridge.openInProfile(p.dir, 'coccoc://extensions/', false);
      if (installDirectory) await navigator.clipboard?.writeText(installDirectory).catch(() => {});
      onNotice(`Đã mở trang tiện ích trong profile ${p.name}: bật "Chế độ dành cho nhà phát triển" → bấm "Tải tiện ích đã giải nén" → dán đường dẫn đã chép sẵn (Ctrl+V) vào ô thư mục → Chọn thư mục. Xong thì profile hiện trong bảng.`);
    } catch (e) { onError(message(e)); }
  };
  // Nối tất cả profile: app bật ngầm từng profile chưa có trong bảng, tiện ích nối về thì dòng hiện ngay, trạng thái từng profile cập nhật trực tiếp.
  const connect = async () => {
    onError(''); onNotice(''); setConnecting(true); setStates({});
    try {
      const result = await bridge.connectProfiles();
      const ok = result.filter(r => r.state === 'da-noi').length, fail = result.filter(r => r.state === 'khong-noi');
      onNotice(`✓ Nối xong: ${ok} profile mới vào bảng${fail.length ? ` · chưa nối được: ${fail.map(f => f.name).join(', ')} (tiện ích chưa cài/đang tắt, hoặc profile đang mở sẵn — mở profile đó lên là tự nối)` : ''}. Bấm Kiểm tra từng dòng để app đọc mail và kênh.`);
    } catch (e) { onError(message(e)); } finally { setConnecting(false); }
  };
  if (!profiles.length) return null;
  const ownerOf = (p: { dir: string; name: string }) => accounts.find(a => a.profileDir === p.dir || (!a.profileDir && a.label.trim().toLowerCase() === p.name.trim().toLowerCase()));
  const installed = profiles.filter(ownerOf).length;
  return <div className="hall-profiles">
    <header className="hall-profiles-head">
      <h4>Tất cả profile Cốc Cốc trên máy · {profiles.length} profile, {installed} đã nối vào app</h4>
      {installed < profiles.length && <button disabled={connecting} title="App bật ngầm từng profile chưa có trong bảng (không mở cửa sổ); tiện ích nối về thì profile hiện ngay vào bảng trên" onClick={connect}><RefreshCw size={13} /> {connecting ? 'Đang nối…' : 'Nối tất cả profile'}</button>}
    </header>
    <p className="hall-muted">Gõ trang muốn mở (vd. suno.com) rồi Mở — trang mở trong đúng profile đó, đăng nhập một lần là Cốc Cốc nhớ. Để trống = tab trắng. Profile chưa nối vào app: bấm "Nối tất cả profile"; nếu profile đó chưa cài tiện ích thì bấm "Cài tiện ích".</p>
    <ul>{profiles.map(p => { const owner = ownerOf(p), state = states[p.dir];
      return <li key={p.dir} className={owner ? 'has-ext' : 'no-ext'}>
        <span><b>{p.name}</b> <small>{p.dir}{owner?.email ? ` · ${owner.email}` : owner ? '' : ' · chưa nối vào app'}</small>
          {state && <em className={`hall-connect ${state}`}>{{ 'co-san': '', 'dang-noi': 'đang nối…', 'da-noi': '✓ đã nối', 'khong-noi': '✗ chưa nối được' }[state]}</em>}</span>
        <input value={links[p.dir] || ''} onChange={e => setLinks(l => ({ ...l, [p.dir]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && open(p, owner, links[p.dir])} placeholder="Trang muốn mở, vd. suno.com — để trống = tab trắng" aria-label={`Trang mở trong ${p.name}`} />
        <span className="hall-profile-actions">
          <button onClick={() => open(p, owner, links[p.dir])}><ExternalLink size={13} /> {links[p.dir]?.trim() ? 'Mở' : 'Tab trắng để đăng nhập'}</button>
          {!owner && <button onClick={() => install(p)}><Puzzle size={13} /> Cài tiện ích</button>}
        </span>
      </li>; })}</ul>
  </div>;
}

export default function AccountBook() {
  const bridge = window.manorApps;
  const [view, setView] = useState<AccountView | null>(null);
  const [keys, setKeys] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [siteName, setSiteName] = useState('');
  const [open, setOpen] = useState('');
  const [made, alertMade] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [profiles, setProfiles] = useState<{ dir: string; name: string }[]>([]);
  const [newProfile, setNewProfile] = useState('');
  // Hộp lỗi đang mở: tài khoản nào, dịch vụ nào (không có = mọi lỗi của tài khoản).
  const [loiMo, setLoiMo] = useState<{ id: string; dichVu?: string; the?: boolean } | null>(null);
  // Dạng sách phép (cl-015) khi máy có WebGL và chủ tịch chưa chọn "Dạng bảng cũ"; không có WebGL thì luôn dạng bảng.
  const [dang, setDang] = useState<'sach' | 'bang'>(() => coWebGL() && docCaiDatSach().dang === 'sach' ? 'sach' : 'bang');
  const doiDang = (next: 'sach' | 'bang') => { setDang(next); luuCaiDatSach({ ...docCaiDatSach(), dang: next }); };
  // Kiểm tra lần lượt: báo profile đang kiểm ngay khi tới lượt (từng profile một — chạy song song làm đơ máy).
  useEffect(() => bridge?.onAccountsCheck?.(item => {
    if (item.state === 'dang-kiem') setNotice(`Đang kiểm tra ${item.label}… (từng profile một, xong tự tắt profile app đã bật)`);
    else if (item.error) setError(`Không tự nhận trang của ${item.label}: ${item.error}`);
  }), [bridge]);
  // Danh sách profile cập nhật trực tiếp khi Cốc Cốc thêm/đổi tên profile.
  useEffect(() => { bridge?.browserProfiles?.().then(setProfiles, () => {}); return bridge?.onBrowserProfiles?.(setProfiles); }, [bridge]);
  useEffect(() => { if (!busy.startsWith('check-')) return; const started = Date.now(); setElapsed(0); const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);
  useEffect(() => {
    if (!bridge) return;
    bridge.accounts().then(setView, e => setError(message(e)));
    return bridge.onAccounts(setView);
  }, [bridge]);
  if (!bridge) return <section className="hall"><p className="hall-muted">Sổ tài khoản cần bản Windows.</p></section>;

  async function act(label: string, work: () => Promise<AccountView | void>) {
    setBusy(label); setError(''); setNotice('');
    try { const next = await work(); if (next) setView(next); } catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  // Kiểm tra một profile rồi báo trang nào đã xác nhận đăng nhập (và trang nào mới thấy lần này).
  const loggedSites = (v: AccountView | null, id: string) => (v?.sites || []).filter(s => { const e = v?.accounts.find(a => a.id === id)?.sites[s.id]; return e && e.loggedIn !== false; }).map(s => s.name);
  const checkAndReport = (account: Account, work?: () => Promise<AccountView>) => act(`check-${account.id}`, async () => {
    const before = new Set(loggedSites(view, account.id));
    const next = await (work ? work() : bridge.checkAccount(account.id));
    const now = loggedSites(next, account.id), added = now.filter(n => !before.has(n));
    setNotice(`✓ Kiểm tra xong ${account.label}: ${now.length ? `đã đăng nhập ${now.join(', ')}` : 'chưa thấy trang nào đăng nhập'}${added.length ? ` · mới thêm: ${added.join(', ')}` : ''}.`);
    return next;
  });
  const toggle = (account: Account, service: Service) => act(`svc-${account.id}`, () => bridge.updateAccount(account.id, { services: account.services.includes(service) ? account.services.filter(s => s !== service) : [...account.services, service] }));
  // Trang đăng video (YouTube, TikTok) đứng ngay sau email: đó là thứ cần nhìn nhất.
  const sites = [...(view?.sites || [])].sort((a, b) => Number(Boolean(b.channel)) - Number(Boolean(a.channel)));
  const guiPhanHoi = (account: Account, loiId: string, feedback: { daXuLy: boolean; nhanXet: string }) => act('loi', async () => { if (!bridge.accountErrorFeedback) throw new Error('Bản app này chưa có nút phản hồi lỗi.'); const next = await bridge.accountErrorFeedback(account.id, loiId, feedback); setNotice('Đã gửi cho Claude kiểm lại. Dấu "!" chuyển vàng tới khi Claude kiểm xong.'); return next; });
  const moLinkLoi = (account: Account, url: string) => act('loi-link', async () => { await bridge.openInAccount(account.id, { url, cuaSo: false }); setNotice(`Đã mở ${url} trong profile Cốc Cốc của ${account.label}.`); });

  const trang = hanhDongTrang(bridge, act, setNotice);

  if (dang === 'sach') return view
    ? <SachPhep view={{ ...view, sites }} bridge={bridge} busy={busy} error={error} notice={notice} act={act} say={setNotice}
        onCheck={account => checkAndReport(account)} onFeedback={guiPhanHoi} onLink={moLinkLoi} onTable={() => doiDang('bang')} />
    : <section className="hall" aria-label="Sổ tài khoản">{error ? <p className="hall-error" role="alert">{error}</p> : <p className="hall-muted">Đang mở sổ…</p>}</section>;

  return <section className="hall" aria-label="Sổ tài khoản">
    <div className="hall-book">
      <h2 className="hall-title">Sổ tài khoản<button disabled={!coWebGL()} title={coWebGL() ? 'Mở Sổ dạng sách phép: mỗi mail là một chùm sáng, bấm chùm xem trang + hạn mức + lỗi' : 'Máy/trình hiển thị này không có WebGL nên chỉ dùng được dạng bảng'} onClick={() => doiDang('sach')}><BookOpen size={14} /> Dạng sách phép</button></h2>
      <p className="hall-muted">Chỉ lưu trên máy này, mã hóa bằng Windows. Không có mật khẩu: app dùng đúng profile Cốc Cốc đã đăng nhập sẵn qua tiện ích AI Manor.</p>
      {error && <p className="hall-error" role="alert">{error}</p>}
      {notice && <p className="hall-ok" role="status">{notice}</p>}

      <section className="hall-section">
        <header><h3>Profile Cốc Cốc</h3><span className="hall-head-actions">
          <button disabled={Boolean(busy)} title="Kiểm tra từng profile một: profile đang tắt thì app bật ngầm, kiểm xong tự tắt" onClick={() => act('check-all', async () => { const r = await bridge.checkAllAccounts(); const v = await bridge.accounts(); setNotice(`✓ Kiểm tra xong ${r.checked} profile${r.errors.length ? ` · lỗi: ${r.errors.map(e => e.label).join(', ')}` : ''}. Profile app đã bật đều đã tắt lại.`); return v; })}><RefreshCw size={14} /> {busy === 'check-all' ? 'Đang kiểm tra lần lượt…' : 'Kiểm tra lần lượt tất cả'}</button>
          <button disabled={Boolean(busy)} title="Dò số tín dụng Dreamina và Google Flow còn lại, từng profile một, xong tự tắt" onClick={() => act('credits', async () => { const rows = await bridge.scanCredits(); const v = await bridge.accounts(); const low = rows.filter(r => r.dreamina?.credits != null && r.dreamina.credits < 300).map(r => r.label); setNotice(`✓ Dò tín dụng xong ${rows.length} profile${low.length ? ` · Dreamina dưới 300: ${low.join(', ')}` : ''}.`); return v; })}><Coins size={14} /> {busy === 'credits' ? 'Đang dò tín dụng…' : 'Dò tín dụng'}</button>
          <button onClick={() => act('folder', async () => { await bridge.openExtensionFolder(); })}><FolderOpen size={14} /> Mở thư mục tiện ích</button></span></header>
        <details className="hall-howto" open={!view?.accounts.length}><summary>Cách cài tiện ích vào profile Cốc Cốc</summary>
        <ol className="hall-steps">
          <li>Mở profile Cốc Cốc cần dùng, vào <code>coccoc://extensions</code>, bật <b>Chế độ dành cho nhà phát triển</b>.</li>
          <li>Bấm <b>Tải tiện ích đã giải nén</b>, chọn thư mục vừa mở{view?.installDirectory && <> (<code>{view.installDirectory}</code>)</>}.</li>
          <li>Profile hiện trong bảng dưới. Bấm <b>Kiểm tra</b>: app đọc email và tự đánh dấu trang nào đã đăng nhập. Gói đăng ký thì chọn trong ô.</li>
        </ol></details>
        {view && view.accounts.length > 0 && <p className="hall-summary">{summary(view)}</p>}
        {view && expiring(view).length > 0 && <p className="hall-expiring" role="status">Sắp hết hạn: {expiring(view).join(' · ')}</p>}
        {/* Thẻ lớn mỗi profile (cl-022): nhìn nhanh trang nào đã vào, tín dụng, mở trang trắng để đăng nhập. */}
        {view && view.accounts.length > 0 && <div className="the-luoi">{view.accounts.map(account => <TheProfile key={account.id} account={account} sites={sites} busy={busy}
          onBlank={() => trang.moTrangTrang(account)} onXong={() => trang.xongKiemLai(account)} onDungLam={(site, text) => trang.luuDungLam(account, site, text)}
          onLoi={() => setLoiMo(loiMo?.id === account.id && loiMo.the ? null : { id: account.id, the: true })}>
          {loiMo?.id === account.id && loiMo.the && <LoiDialog account={account} sites={sites} onClose={() => setLoiMo(null)}
            onFeedback={(loiId, feedback) => guiPhanHoi(account, loiId, feedback)} onLink={url => moLinkLoi(account, url)} />}
        </TheProfile>)}</div>}
        <details className="the-bang-cu" open><summary>Bảng chi tiết: gói, hạn gói, chạy việc, profile Cốc Cốc</summary>
        <div className="hall-table-wrap">
          <table className="hall-table">
            <thead>
              <tr><th>Profile</th><th>Email</th>{sites.map(site => <th key={site.id} className={`group-${site.group}`} title={site.url || undefined}>{site.name}{site.group === 'custom' && <button className="hall-icon" aria-label={`Bỏ trang ${site.name}`} onClick={() => act('site', () => bridge.removeSite(site.id))}><X size={11} /></button>}</th>)}<th>Dùng</th><th /></tr>
            </thead>
            <tbody>
              {view?.accounts.map(account => <Fragment key={account.id}><tr className={account.online ? 'online' : ''}>
                <td><div className="hall-name">
                  <span className={`hall-dot ${account.online ? 'on' : ''}`} title={account.online ? 'Đang trực tuyến' : 'Ngoại tuyến (profile chưa mở)'} />
                  <input defaultValue={account.label} aria-label="Tên profile" onBlur={e => e.target.value !== account.label && act('label', () => bridge.updateAccount(account.id, { label: e.target.value }))} />
                  <LoiMark list={loiCua(account)} label={`tài khoản ${account.label}`} onOpen={() => setLoiMo(loiMo?.id === account.id && !loiMo.dichVu ? null : { id: account.id })} />
                </div></td>
                <td><input className="hall-email" defaultValue={account.email} key={account.email} placeholder="nguoi-dung@example.com" aria-label={`Email của ${account.label}`} onBlur={e => e.target.value !== account.email && act('email', () => bridge.updateAccount(account.id, { email: e.target.value }))} /></td>
                {sites.map(site => <SiteCell key={site.id} account={account} site={site} busy={Boolean(busy)}
                  onPlan={plan => act('site', () => bridge.updateAccount(account.id, { site: { id: site.id, plan } }))}
                  onWork={() => toggle(account, site.id as Service)} onLoi={() => setLoiMo({ id: account.id, dichVu: site.id })} />)}
                <td><input type="checkbox" checked={account.enabled} aria-label={`Dùng ${account.label}`} onChange={e => act('enabled', () => bridge.updateAccount(account.id, { enabled: e.target.checked }))} /></td>
                <td><div className="hall-row-actions">
                  <button className={`hall-icon hall-more ${open === account.id ? 'open' : ''}`} aria-label={`Chi tiết ${account.label}`} title="Mở chi tiết: chọn profile Cốc Cốc, kênh dùng để đăng, hạn gói, ghi chú" aria-expanded={open === account.id} onClick={() => setOpen(open === account.id ? '' : account.id)}><ChevronDown size={13} /></button>
                  <button disabled={!account.online || Boolean(busy)} title={account.online ? 'Đọc email và các trang đã đăng nhập' : 'Mở profile Cốc Cốc này (có tiện ích AI Manor) thì mới kiểm tra được'} onClick={() => checkAndReport(account)}><RefreshCw size={13} /> {busy === `check-${account.id}` ? `Đang kiểm tra ${elapsed}s` : 'Kiểm tra'}</button>
                  <button disabled={Boolean(busy)} title="Mở profile của dòng này trong bản Cốc Cốc riêng của app (không đụng Cốc Cốc của mày): tab 1 cài tiện ích AI Manor, các tab sau đăng nhập từng trang. Làm một lần; xong app tự kiểm tra và gộp vào dòng này."
                    onClick={() => act('may', async () => { const r = await bridge.mayDangNhap!(account.id); await navigator.clipboard?.writeText(r.installDirectory).catch(() => {});
                      setNotice(`Đã mở profile máy "${r.dir}" cho ${account.label}. Tab 1: bật "Chế độ dành cho nhà phát triển" → "Tải tiện ích đã giải nén" → dán đường dẫn đã chép sẵn (Ctrl+V). Các tab sau: đăng nhập từng trang. Xong cứ để đó, app tự kiểm tra và gộp vào dòng ${account.label}.`); return bridge.accounts(); })}>
                    <LogIn size={13} /> Đăng nhập máy</button>
                  <button className="hall-icon" aria-label="Xóa khỏi sổ" onClick={() => act('remove', () => bridge.removeAccount(account.id))}><Trash2 size={13} /></button>
                </div>{account.outdated ? <small className="bad">Tiện ích bản cũ {account.version}: vào coccoc://extensions bấm ↻ một lần</small> : account.checks.cookies?.error && <small className="bad">{account.checks.cookies.error}</small>}</td>
              </tr>
              {loiMo?.id === account.id && !loiMo.the && <tr className="hall-detail-row"><td colSpan={sites.length + 4}>
                <LoiDialog account={account} dichVu={loiMo.dichVu} sites={sites} onClose={() => setLoiMo(null)}
                  onFeedback={(loiId, feedback) => guiPhanHoi(account, loiId, feedback)} onLink={url => moLinkLoi(account, url)} />
              </td></tr>}
              {open === account.id && <tr className="hall-detail-row"><td colSpan={sites.length + 4}>
                <AccountDetail account={account} sites={sites} profiles={profiles} onProfile={patch => act('profile', () => bridge.updateAccount(account.id, patch))} onWake={() => act(`check-${account.id}`, () => bridge.wakeAccount(account.id))} onNote={note => act('note', () => bridge.updateAccount(account.id, { note }))} onSite={site => act('detail', () => bridge.updateAccount(account.id, { site }))}
                  onAddSite={link => account.online
                    ? checkAndReport(account, async () => { await bridge.addSite(link, account.id); return bridge.checkAccount(account.id); })
                    : act(`check-${account.id}`, async () => { const next = await bridge.addSite(link, account.id); setNotice(`✓ Đã thêm trang ${hostName(link)} vào profile ${account.label}. Mở profile đó rồi bấm Kiểm tra để app xác nhận đăng nhập.`); return next; })} />
              </td></tr>}</Fragment>)}
              {view && !view.accounts.length && <tr><td colSpan={sites.length + 4} className="hall-muted">Chưa có profile nào. Cài tiện ích vào profile Cốc Cốc theo 3 bước trên.</td></tr>}
            </tbody>
          </table>
        </div></details>
        <div className="hall-add"><input value={newProfile} onChange={e => setNewProfile(e.target.value)} placeholder="Tạo profile Cốc Cốc mới cho một kênh: gõ tên kênh (app mở cửa sổ để đăng nhập Google và cài tiện ích một lần)" aria-label="Tên profile kênh mới" />
          <button disabled={!newProfile.trim()} onClick={() => act('newprofile', async () => { const made = await bridge.createBrowserProfile(newProfile); setNewProfile(''); setError(''); setProfiles(await bridge.browserProfiles()); alertMade(made.dir); })}><Plus size={13} /> Tạo profile kênh</button></div>
        <ProfileOpener profiles={profiles} accounts={view?.accounts || []} installDirectory={view?.installDirectory} onError={setError} onNotice={setNotice} onView={setView} />
        {made && <p className="hall-muted">Đã mở profile <code>{made}</code>: đăng nhập Google/YouTube/TikTok, rồi vào coccoc://extensions bật Chế độ nhà phát triển và Tải tiện ích đã giải nén như 3 bước trên. Xong thì profile hiện trong bảng.</p>}
        <div className="hall-add"><input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="Trang mới cho mọi profile: dán link để app tự quét (vd. klingai.com), hoặc chỉ gõ tên để ghi tay" aria-label="Tên trang mới" /><button disabled={!siteName.trim()} onClick={() => act('site', async () => { const next = await bridge.addSite(siteName); setSiteName(''); return next; })}><Plus size={13} /> Thêm trang</button></div>
      </section>

      <section className="hall-section">
        <header><h3><KeyRound size={16} /> API key</h3></header>
        <p className="hall-muted">Key Gemini dùng để chép lời và dò chính tả (gói miễn phí), tự đổi key khi hết hạn mức. {view && view.legacyKeys > 0 && `Đang dùng thêm ${view.legacyKeys} key từ key-pool.local.json.`}</p>
        <ul className="hall-keys">{view?.geminiKeys.map((key, index) => <li key={index}><code>{key}</code><button className="hall-icon" aria-label="Xóa key" onClick={() => act('key', () => bridge.removeGeminiKey(index))}><Trash2 size={13} /></button></li>)}</ul>
        <div className="hall-add"><textarea value={keys} onChange={e => setKeys(e.target.value)} placeholder="Dán một hoặc nhiều key Gemini, mỗi dòng một key" aria-label="Thêm key Gemini" rows={2} /><button disabled={!keys.trim()} onClick={() => act('add', async () => { const next = await bridge.addGeminiKeys(keys); setKeys(''); return next; })}>Thêm</button></div>
        <p className="hall-muted">Key Gemini trả phí để tạo ảnh qua API (không bắt buộc nếu dùng Flow): {view?.imageKey ? <code>{view.imageKey}</code> : 'chưa có'}</p>
        <div className="hall-add"><input type="password" value={imageKey} onChange={e => setImageKey(e.target.value)} placeholder="Key của project đã bật thanh toán" aria-label="Key Gemini trả phí" /><button disabled={!imageKey.trim()} onClick={() => act('img', async () => { const next = await bridge.setImageKey(imageKey); setImageKey(''); return next; })}>Lưu</button>{view?.imageKey && <button onClick={() => act('img', () => bridge.setImageKey(''))}>Xóa</button>}</div>
      </section>
    </div>
  </section>;
}
