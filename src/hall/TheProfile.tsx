import type { FocusEvent, KeyboardEvent, ReactNode } from 'react';
import { CheckCheck, LogIn } from 'lucide-react';
import type { Account, AccountView, AppsBridge, Site } from '../apps/types';
import { LoiMark, choKiem, loiCua } from './chung';
import './the-profile.css';

// Thẻ profile trực quan (cl-022): tên + mail che bớt, dãy biểu tượng trang (xanh = đã vào, xám = chưa, đỏ "!" = lỗi),
// tín dụng to, nút chính "Mở trang trắng để đăng nhập" + "Xong, kiểm lại", và ô "Dùng làm gì" dưới tên từng trang.
// Dùng chung cho dạng bảng (AccountBook) và dạng sách phép (SachPhep).

// "nguoi-dung@example.com" → "tt•••nguoi-dung@example.com": nhìn đủ để nhận ra mail nào, không lộ cả địa chỉ khi chụp màn hình.
export function cheMail(email?: string) {
  const [ten, mien] = String(email || '').split('@');
  if (!ten || !mien) return '';
  return `${ten.length <= 4 ? ten.slice(0, 1) : `${ten.slice(0, 2)}`}•••${ten.length > 4 ? ten.slice(-2) : ''}@${mien}`;
}

// Trạng thái một trang của profile: lỗi tài khoản còn mới → đỏ; đã ghi và không mất đăng nhập → xanh; còn lại xám.
export function trangThaiTrang(account: Account, site: Site): 'loi' | 'ok' | 'chua' {
  const loi = loiCua(account, site.id);
  if (loi.length && !loi.every(choKiem)) return 'loi';
  const entry = account.sites[site.id];
  return entry?.loggedIn === true ? 'ok' : 'chua';
}

// Dãy biểu tượng: mỗi trang một ô chữ cái đầu, rê chuột xem tên + trạng thái.
export function DayTrang({ account, sites }: { account: Account; sites: Site[] }) {
  return <ul className="the-day" aria-label={`Trang của ${account.label}`}>
    {sites.map(site => {
      const s = trangThaiTrang(account, site), entry = account.sites[site.id];
      const chu = s === 'loi' ? 'lỗi tài khoản' : s === 'ok' ? 'đã đăng nhập' : entry?.loggedIn === false ? 'mất đăng nhập' : 'chưa đăng nhập';
      return <li key={site.id} className={`the-icon ${s}`} title={`${site.name}: ${chu}${entry?.dungLam ? ` · ${entry.dungLam}` : ''}`} aria-label={`${site.name}: ${chu}`}>
        {site.name.slice(0, 1).toUpperCase()}{s === 'loi' && <em>!</em>}
      </li>;
    })}
  </ul>;
}

// Tín dụng đọc được từ trang, chữ to. Dreamina dưới 300 = chưa đủ một đoạn nhép môi 25 s → vàng.
const TEN_TIN_DUNG: Record<string, string> = { flow: 'Flow', dreamina: 'Dreamina' };
export function TinDungLon({ account }: { account: Account }) {
  const list = Object.entries(account.credits || {}).filter(([, f]) => typeof f?.credits === 'number');
  if (!list.length) return null;
  return <div className="the-tin-dung">{list.map(([site, f]) => <span key={site} className={site === 'dreamina' && f!.credits! < 300 ? 'thap' : ''}>
    <b>{f!.credits!.toLocaleString('vi-VN')}</b><small>tín dụng {TEN_TIN_DUNG[site] || site}</small>
  </span>)}</div>;
}

// Hai nút chính: mở tab trắng trong profile máy của dòng này; "Xong, kiểm lại" hỏi tiện ích các trang vừa vào để ghi Sổ.
export function NutDangNhap({ account, busy, onBlank, onXong }: { account: Account; busy: string; onBlank: () => void; onXong: () => void }) {
  return <div className="the-nut">
    <button className="the-nut-chinh" disabled={Boolean(busy)} title="Mở một tab trắng trong đúng profile máy của dòng này. Vào trang cần đăng nhập (mail, Suno, Kling…), đăng nhập một lần là profile nhớ; app tự nhận trang đó trong 30 phút."
      onClick={onBlank}><LogIn size={18} /> {busy === `trang-${account.id}` ? 'Đang mở…' : 'Mở trang trắng để đăng nhập'}</button>
    <button className="the-nut-phu" disabled={Boolean(busy) || !account.online} title={account.online ? 'Hỏi tiện ích các trang vừa vào trong profile này, trang nào có đăng nhập thì ghi vào Sổ' : 'Profile đang tắt: mở trang trắng trước (profile sẽ bật)'}
      onClick={onXong}><CheckCheck size={16} /> {busy === `nhan-${account.id}` ? 'Đang kiểm…' : 'Xong, kiểm lại'}</button>
  </div>;
}

// Ô "Dùng làm gì" ngay dưới tên trang: sửa trực tiếp, rời ô hoặc Enter là lưu.
const GOI_Y_DUNG: Record<string, string> = { flow: 'vd. làm Veo MV', dreamina: 'vd. nhép môi', chatgpt: 'vd. vẽ thumbnail', youtube: 'vd. kênh Xing', tiktok: 'vd. đăng clip ngắn' };
export function DungLam({ account, site, onSave }: { account: Account; site: Site; onSave: (text: string) => void }) {
  const cu = account.sites[site.id]?.dungLam || '';
  const luu = (e: FocusEvent<HTMLInputElement>) => { if (e.target.value.trim() !== cu) onSave(e.target.value); };
  const enter = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };
  return <input className="the-dung-lam" key={cu} defaultValue={cu} placeholder={`Dùng làm gì? ${GOI_Y_DUNG[site.id] || 'vd. tạo nhạc, lấy ảnh'}`}
    aria-label={`Dùng làm gì ${site.name} của ${account.label}`} onBlur={luu} onKeyDown={enter} />;
}

// Hành động dùng chung của hai dạng Sổ. act: chạy việc + báo lỗi; say: dòng báo xanh.
type Act = (label: string, work: () => Promise<AccountView | void>) => Promise<void>;
export function hanhDongTrang(bridge: AppsBridge, act: Act, say: (text: string) => void) {
  return {
    moTrangTrang: (account: Account) => act(`trang-${account.id}`, async () => {
      if (!bridge.openBlank) throw new Error('Bản app này chưa có nút trang trắng.');
      const r = await bridge.openBlank(account.id);
      say(`Đã mở tab trắng trong profile máy "${r.dir}" của ${account.label}. Vào trang cần đăng nhập, đăng nhập xong cứ để đó: app tự nhận trang mới (hỏi mỗi 15 giây), hoặc bấm "Xong, kiểm lại".`);
    }),
    xongKiemLai: (account: Account) => act(`nhan-${account.id}`, async () => {
      if (!bridge.nhanTrang) throw new Error('Bản app này chưa có nút nhận trang.');
      const r = await bridge.nhanTrang(account.id);
      say(r.them.length ? `✓ ${account.label}: đã nhận ${r.them.join(', ')} (đã đăng nhập). Ghi "Dùng làm gì" dưới tên trang cho dễ nhớ.`
        : `${account.label}: chưa thấy trang mới nào có đăng nhập. Đăng nhập xong hẳn (vào được trang chính) rồi bấm lại.`);
      return r.view;
    }),
    luuDungLam: (account: Account, site: Site, dungLam: string) => act('dung-lam', () => bridge.updateAccount(account.id, { site: { id: site.id, dungLam } })),
  };
}

// Thẻ lớn của một profile ở dạng bảng.
export function TheProfile({ account, sites, busy, onBlank, onXong, onDungLam, onLoi, children }: {
  account: Account; sites: Site[]; busy: string; onBlank: () => void; onXong: () => void; onDungLam: (site: Site, text: string) => void; onLoi: () => void; children?: ReactNode;
}) {
  const owned = sites.filter(s => account.sites[s.id]);
  return <article className={`the-profile${account.online ? ' online' : ''}`} aria-label={`Thẻ ${account.label}`}>
    <header>
      <span className={`hall-dot ${account.online ? 'on' : ''}`} title={account.online ? 'Profile đang mở' : 'Profile đang tắt'} />
      <div className="the-ten"><h4>{account.label}</h4><span>{cheMail(account.email) || 'chưa có mail'}</span></div>
      <LoiMark list={loiCua(account)} label={`thẻ ${account.label}`} onOpen={onLoi} />
    </header>
    <DayTrang account={account} sites={sites} />
    <TinDungLon account={account} />
    {owned.length > 0 && <ul className="the-trang">{owned.map(site => {
      const entry = account.sites[site.id], at = entry.checkedAt || entry.nhanLuc;
      return <li key={site.id} className={trangThaiTrang(account, site)}>
        <b>{site.name}</b>
        <small className="the-trang-luc">{entry.loggedIn === true
          ? `Đã đăng nhập${at ? ` · ${new Date(at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}`
          : entry.loggedIn === false ? 'Mất đăng nhập' : 'Chưa đăng nhập'}</small>
        <DungLam account={account} site={site} onSave={text => onDungLam(site, text)} />
      </li>;
    })}</ul>}
    <NutDangNhap account={account} busy={busy} onBlank={onBlank} onXong={onXong} />
    {children}
  </article>;
}
