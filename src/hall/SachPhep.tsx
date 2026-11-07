import { useEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { Coins, ExternalLink, RefreshCw, Table2, X } from 'lucide-react';
import type { Account, AccountView, AppsBridge, Site, SiteQuota } from '../apps/types';
import { CreditTag, LoiDialog, LoiMark, ScanLine, choKiem, loiCua, type Feedback } from './chung';
import { taoHatSach, type CanhHat } from './sach-hat';
import { DayTrang, DungLam, NutDangNhap, TinDungLon, cheMail, hanhDongTrang } from './TheProfile';
import './sach-phep.css';

// Sổ tài khoản kiểu sách phép (cl-015): sách bìa da mở ra, mỗi profile (mail) là một chùm sáng lơ lửng; bấm chùm xem trang đã đăng nhập + hạn mức + lỗi.
// Sách là CSS 3D, chùm là nút DOM (bấm, rê chuột, đọc màn hình được); three.js chỉ vẽ hạt sáng (sach-hat.ts). Không có WebGL thì Sổ dùng dạng bảng cũ.

// Cài đặt lưu ở máy: dạng hiển thị và có chạy hoạt cảnh mở sách không.
export type CaiDatSach = { dang: 'sach' | 'bang'; intro: boolean };
const KHOA = 'duy.so-tai-khoan';
export function docCaiDatSach(): CaiDatSach {
  try { const v = JSON.parse(localStorage.getItem(KHOA) || '{}'); return { dang: v.dang === 'bang' ? 'bang' : 'sach', intro: v.intro !== false }; }
  catch { return { dang: 'sach', intro: true }; }
}
export function luuCaiDatSach(v: CaiDatSach) { try { localStorage.setItem(KHOA, JSON.stringify(v)); } catch { /* máy chặn lưu thì thôi */ } }

let webgl: boolean | null = null;
export function coWebGL() {
  if (webgl !== null) return webgl;
  try { const c = document.createElement('canvas'); return (webgl = Boolean(c.getContext('webgl2') || c.getContext('webgl'))); }
  catch { return (webgl = false); }
}
// Chỉ dùng trong test: dò lại WebGL.
export function _quenWebGL() { webgl = null; }

// Màu chùm theo mã profile: ổn định giữa các lần mở, các profile cạnh nhau khác màu rõ.
export function mauProfile(id: string) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `hsl(${Math.round(((h >>> 0) % 360 + 360) % 360)}, 85%, 66%)`;
}
// Vị trí chùm (% khung): xếp trên một vòng cung phía trên sách; nhiều chùm thì xen kẽ trong/ngoài.
export function viTriChum(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (n === 1 ? 270 : 200 + (140 * i) / (n - 1)) * Math.PI / 180, k = n > 7 && i % 2 ? 0.72 : 1;
    return { x: 50 + Math.cos(a) * 40 * k, y: 64 + Math.sin(a) * 46 * k };
  });
}

// Trang mở cho từng dịch vụ (trong đúng profile Cốc Cốc của mail đó). Trang tự thêm dùng địa chỉ đã lưu.
const TRANG: Record<string, string> = {
  flow: 'https://labs.google/fx/tools/flow', chatgpt: 'https://chatgpt.com/', dreamina: 'https://dreamina.capcut.com/ai-tool/home',
  youtube: 'https://studio.youtube.com/', tiktok: 'https://www.tiktok.com/tiktokstudio', bilibili: 'https://member.bilibili.com/platform/home',
  distrokid: 'https://distrokid.com/dashboard/', tunecore: 'https://www.tunecore.com/dashboard',
};
// Hạn mức đã biết để gợi ý trong ô nhập tay.
const GOI_Y: Record<string, { ngay?: string; thang?: string }> = {
  flow: { ngay: 'PRO ~50 tín dụng/ngày, làm mới ~07:57', thang: '+ tín dụng tháng của gói' },
  dreamina: { ngay: 'tín dụng theo tài khoản; nhép ~200/lượt', thang: 'tín dụng gói (nếu có)' },
  chatgpt: { ngay: 'theo gói (Plus/Pro)', thang: 'theo gói' },
};
const luc = (iso?: string) => iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';

interface Props {
  view: AccountView; bridge: AppsBridge; busy: string; error: string; notice: string;
  act: (label: string, work: () => Promise<AccountView | void>) => Promise<void>;
  onCheck: (account: Account) => void;
  onFeedback: (account: Account, loiId: string, feedback: Feedback) => void;
  onLink: (account: Account, url: string) => void;
  onTable: () => void;
  say: (text: string) => void;
}

export default function SachPhep({ view, bridge, busy, error, notice, act, onCheck, onFeedback, onLink, onTable, say }: Props) {
  const [caiDat, setCaiDat] = useState(docCaiDatSach);
  const giam = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [giai, setGiai] = useState<'mo' | 'xong'>(() => caiDat.intro && !giam ? 'mo' : 'xong');
  const [chon, setChon] = useState('');
  const [loiMo, setLoiMo] = useState<{ id: string; dichVu?: string } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const canh = useRef<CanhHat | null>(null);
  const accounts = view.accounts;
  const viTri = useMemo(() => viTriChum(accounts.length), [accounts.length]);
  const diem = useMemo(() => accounts.map((a, i) => ({ ...viTri[i], color: mauProfile(a.id) })), [accounts, viTri]);

  // Hạt sáng: dựng một lần, đổi danh sách chùm thì chỉ đổi màu/đích.
  useEffect(() => {
    if (!canvas.current) return;
    try { canh.current = taoHatSach(canvas.current, { chum: diem, intro: giai === 'mo' }); } catch { canh.current = null; }
    return () => { canh.current?.huy(); canh.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { canh.current?.capNhat(diem); }, [diem]);
  useEffect(() => { if (giai !== 'mo') return; const t = setTimeout(() => setGiai('xong'), 3400); return () => clearTimeout(t); }, [giai]);
  const boQua = () => { if (giai === 'mo') { setGiai('xong'); canh.current?.boQua(); } };
  useEffect(() => {
    const phim = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (giai === 'mo') boQua(); else if (loiMo) setLoiMo(null); else setChon(''); };
    window.addEventListener('keydown', phim); return () => window.removeEventListener('keydown', phim);
  });
  const doiIntro = (intro: boolean) => { const next = { ...caiDat, intro }; setCaiDat(next); luuCaiDatSach(next); };

  const account = accounts.find(a => a.id === chon);
  const trang = hanhDongTrang(bridge, act, say);
  return <section className="hall sach-phep" aria-label="Sổ tài khoản">
    <header className="sach-head">
      <h2>Sổ tài khoản</h2>
      <span className="sach-head-actions">
        <label className="hall-tick" title="Tắt thì lần sau mở Sổ hiện ngay các chùm sáng, không chạy đoạn sách mở"><input type="checkbox" checked={caiDat.intro} onChange={e => doiIntro(e.target.checked)} /> Hoạt cảnh mở sách</label>
        <button onClick={onTable} title="Về bảng profile × trang như cũ (đủ mọi chức năng: thêm trang, key API, cài tiện ích…)"><Table2 size={14} /> Dạng bảng cũ</button>
      </span>
    </header>
    {error && <p className="hall-error" role="alert">{error}</p>}
    {notice && <p className="hall-ok" role="status">{notice}</p>}
    <div className={`sach-san ${giai}`} onClick={boQua}>
      <canvas ref={canvas} className="sach-hat" aria-hidden="true" />
      <div className="sach-sach" aria-hidden="true">
        <div className="sach-trang"><i /><i /><i /><i /><i /></div>
        <div className="sach-bia"><div className="sach-bia-ngoai"><b>Sổ</b><small>tài khoản</small></div><div className="sach-bia-trong" /></div>
      </div>
      {giai === 'mo' && <button className="sach-boqua" onClick={e => { e.stopPropagation(); boQua(); }}>Bỏ qua</button>}
      {!accounts.length && giai === 'xong' && <p className="sach-trong">Chưa có profile nào. Bấm "Dạng bảng cũ" để cài tiện ích vào profile Cốc Cốc.</p>}
      {accounts.map((a, i) => {
        const loi = loiCua(a), cho = loi.length > 0 && loi.every(choKiem), da = view.sites.filter(s => a.sites[s.id]?.loggedIn === true).length;
        const tip = `${a.label}${a.email ? ` · ${a.email}` : ''} · ${da} trang đã đăng nhập${a.online ? ' · đang mở' : ''}${loi.length ? ` · ${loi.length} lỗi tài khoản${cho ? ' (chờ Claude kiểm lại)' : ''}` : ''}. Bấm để xem trang, hạn mức, lỗi.`;
        return <button key={a.id} type="button" className={`sach-chum${loi.length ? (cho ? ' cho-kiem' : ' co-loi') : ''}${chon === a.id ? ' chon' : ''}${a.online ? ' online' : ''}`}
          style={{ left: `${viTri[i].x}%`, top: `${viTri[i].y}%`, ['--mau' as string]: diem[i].color, ['--tre' as string]: `${i * 0.12}s`, ['--chu-ky' as string]: `${5 + (i % 4) * 0.9}s` }}
          aria-label={`Mở ${a.label}`} title={tip} onClick={e => { e.stopPropagation(); setChon(chon === a.id ? '' : a.id); setLoiMo(null); }}>
          <span className="sach-chum-loi">{loi.length > 0 && <em>!</em>}</span>
          <span className="sach-chum-ten"><b>{a.label}</b>{a.email && <small>{cheMail(a.email)}</small>}</span>
        </button>;
      })}
      {account && <BangChum account={account} sites={view.sites} busy={busy} mau={mauProfile(account.id)}
        onClose={() => { setChon(''); setLoiMo(null); }} onCheck={() => onCheck(account)} onLoi={dichVu => setLoiMo({ id: account.id, dichVu })}
        onCredits={() => act(`credits-${account.id}`, async () => {
          const r = (await bridge.scanCredits([account.id])).find(x => x.id === account.id);
          const ra = r ? (['flow', 'dreamina'] as const).filter(k => r[k]).map(k => `${k === 'flow' ? 'Flow' : 'Dreamina'}: ${r[k]!.credits ?? (r[k]!.error || 'không đọc được số')}`) : [];
          say(`✓ Dò tín dụng xong ${account.label}${ra.length ? ` · ${ra.join(' · ')}` : r?.error ? ` · ${r.error}` : ''}.`);
          return bridge.accounts();
        })}
        onOpen={site => act('mo-trang', async () => {
          const entry = account.sites[site.id], kenh = site.id === 'youtube' ? entry?.channels?.find(c => c.name === entry.channel) || entry?.channels?.find(c => c.selected) : undefined;
          const r = await bridge.openInAccount(account.id, kenh ? { channel: kenh, cuaSo: true } : { url: site.url || TRANG[site.id], cuaSo: true });
          say(`Đã mở ${site.name} trong profile Cốc Cốc ${r?.dir || ''} của ${account.label}.`);
        })}
        onBlank={() => trang.moTrangTrang(account)} onXong={() => trang.xongKiemLai(account)} onDungLam={(site, text) => trang.luuDungLam(account, site, text)}
        onQuota={(siteId, hanMuc) => act('han-muc', () => bridge.updateAccount(account.id, { site: { id: siteId, hanMuc } }))}>
        {loiMo?.id === account.id && <LoiDialog account={account} dichVu={loiMo.dichVu} sites={view.sites} onClose={() => setLoiMo(null)}
          onFeedback={(loiId, fb) => onFeedback(account, loiId, fb)} onLink={url => onLink(account, url)} />}
      </BangChum>}
    </div>
  </section>;
}

// Bảng kính mờ của một chùm: mọi trang mail này đã lưu trong Sổ, trạng thái đăng nhập, gói, tín dụng dò được, hạn mức ghi tay, lỗi "!".
function BangChum({ account, sites, busy, mau, onClose, onCheck, onCredits, onOpen, onQuota, onLoi, onBlank, onXong, onDungLam, children }: {
  account: Account; sites: Site[]; busy: string; mau: string; onClose: () => void; onCheck: () => void; onCredits: () => void;
  onBlank: () => void; onXong: () => void; onDungLam: (site: Site, text: string) => void;
  onOpen: (site: Site) => void; onQuota: (siteId: string, hanMuc: SiteQuota) => void; onLoi: (dichVu?: string) => void; children?: ReactNode;
}) {
  const owned = sites.filter(s => account.sites[s.id]);
  const dangKiem = busy === `check-${account.id}`, dangDo = busy === `credits-${account.id}`;
  return <div className="sach-bang" role="dialog" aria-label={`Tài khoản ${account.label}`} style={{ ['--mau' as string]: mau }} onClick={e => e.stopPropagation()}>
    <header>
      <span className="sach-bang-mau" />
      <div><h3>{account.label}</h3><small>{cheMail(account.email) || 'chưa đọc được mail'} · {account.online ? 'profile đang mở' : 'profile đang tắt'}</small></div>
      <LoiMark list={loiCua(account)} label={`tài khoản ${account.label}`} onOpen={() => onLoi()} />
      <button className="hall-icon" aria-label="Đóng bảng tài khoản" title="Đóng (Esc)" onClick={onClose}><X size={14} /></button>
    </header>
    <DayTrang account={account} sites={sites} />
    <TinDungLon account={account} />
    <NutDangNhap account={account} busy={busy} onBlank={onBlank} onXong={onXong} />
    <div className="sach-bang-nut">
      <button disabled={!account.online || Boolean(busy)} title={account.online ? 'Đọc email và các trang đã đăng nhập' : 'Mở profile Cốc Cốc này (có tiện ích AI Manor) thì mới kiểm tra được'} onClick={onCheck}><RefreshCw size={13} /> {dangKiem ? 'Đang kiểm tra…' : 'Kiểm tra'}</button>
      <button disabled={Boolean(busy)} title="Dò số tín dụng Dreamina và Google Flow còn lại của profile này (bật ngầm nếu cần, xong tự tắt)" onClick={onCredits}><Coins size={13} /> {dangDo ? 'Đang dò…' : 'Dò tín dụng'}</button>
    </div>
    {children}
    {owned.length ? <ul className="sach-bang-trang">{owned.map(site => {
      const entry = account.sites[site.id], found = account.credits?.[site.id], hm = entry.hanMuc || {}, goiY = GOI_Y[site.id] || {};
      const dn = entry.loggedIn === true ? ['ok', 'Đã đăng nhập'] : entry.loggedIn === false ? ['lost', 'Mất đăng nhập'] : ['manual', site.detect ? 'Tự đánh dấu, chưa kiểm' : 'Ghi tay'];
      const luu = (k: keyof SiteQuota) => (e: FocusEvent<HTMLInputElement>) => { if (e.target.value.trim() !== (hm[k] || '')) onQuota(site.id, { [k]: e.target.value }); };
      return <li key={site.id} aria-label={`Trang ${site.name}`}>
        <div className="sach-trang-dau">
          <b>{site.name}</b>
          <span className={`sach-dn ${dn[0]}`} title={entry.checkedAt ? `Kiểm lúc ${luc(entry.checkedAt)}` : 'Chưa kiểm tra lần nào'}>{dn[1]}</span>
          <small>{site.channel ? entry.channel || '' : `Gói ${entry.plan}`}{entry.until ? ` · đến ${entry.until.split('-').reverse().join('/')}` : ''}</small>
          <LoiMark list={loiCua(account, site.id)} label={`${site.name} của ${account.label}`} onOpen={() => onLoi(site.id)} />
          <button className="sach-mo" disabled={!site.url && !TRANG[site.id]} title={`Mở ${site.name} trong đúng profile Cốc Cốc của ${account.label}`} onClick={() => onOpen(site)}><ExternalLink size={12} /> Mở trang</button>
        </div>
        <DungLam account={account} site={site} onSave={text => onDungLam(site, text)} />
        <div className="sach-trang-dong"><ScanLine account={account} site={site} />{found && <CreditTag site={site.id} found={found} />}{found?.at && <small className="hall-muted">dò {luc(found.at)}</small>}</div>
        {!site.channel && <div className="sach-han-muc">
          <label>Định mức/ngày<input key={`n${hm.ngay}`} defaultValue={hm.ngay || ''} placeholder={goiY.ngay || 'vd. 50 tín dụng, làm mới 08:00'} aria-label={`Định mức/ngày ${site.name}`} onBlur={luu('ngay')} /></label>
          <label>Hạn mức tháng<input key={`t${hm.thang}`} defaultValue={hm.thang || ''} placeholder={goiY.thang || 'vd. 1000 tín dụng'} aria-label={`Hạn mức tháng ${site.name}`} onBlur={luu('thang')} /></label>
          <label>Ghi chú<input key={`g${hm.ghiChu}`} defaultValue={hm.ghiChu || ''} placeholder="vd. để dành cho MV" aria-label={`Ghi chú hạn mức ${site.name}`} onBlur={luu('ghiChu')} /></label>
        </div>}
      </li>;
    })}</ul> : <p className="hall-muted">Mail này chưa có trang nào trong Sổ. Bấm Kiểm tra (profile đang mở) để app tự đọc, hoặc chọn gói ở "Dạng bảng cũ".</p>}
  </div>;
}
