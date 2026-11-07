import { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, Loader2, X } from 'lucide-react';
import type { Account, AccountError, AccountView, ViecChuTich } from '../apps/types';
import AccountBook, { choKiem, loiCua } from '../hall/AccountBook';
import OViec from './OViec';
import './viec-ngay.css';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const TEN_VIEC: Record<string, string> = { veo: 'Video Veo (Flow)', nhep: 'Nhép môi (Dreamina)', anh: 'Vẽ ảnh (ChatGPT)', 'do-tin-dung': 'Dò tín dụng', 'kiem-tra': 'Kiểm tra' };
const TEN_DICH_VU: Record<string, string> = { profile: 'Profile Cốc Cốc' };
const lucVN = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }); };
// Ghi chú chủ tịch gõ trong popup: nối thêm vào ghi chú cũ của việc, kèm giờ; không đè chữ cũ.
const noiGhiChu = (cu: string, moi: string) => moi ? [cu.trim(), `[${lucVN(new Date().toISOString())}] Chủ tịch: ${moi}`].filter(Boolean).join('\n') : cu;
type Mo = { kind: 'loi'; accountId: string; loiId: string } | { kind: 'viec'; id: string };
// Tài khoản có ChatGPT trả phí (Plus/Pro/Business) / Flow PRO lên đầu: chúng gánh việc vẽ ảnh của cả kho.
const rank = (a: Account) => (['Plus', 'Pro', 'Business'].includes(a.sites?.chatgpt?.plan ?? '') ? 0 : 1) + (a.sites?.flow?.plan === 'Pro' || a.sites?.flow?.plan === 'Ultra' ? 0 : 0.5);

// Việc cần làm ngay (chủ tịch 04/11/2026): nút đỏ nổi trên màn hình chính, có số việc; bấm một việc là app làm luôn và chỉ từng bước bấm ở đâu.
// Hiện có (cl-021): mỗi lỗi tài khoản một dòng, mỗi việc Sổ việc chờ duyệt một dòng, "Đăng nhập máy" từng tài khoản; bấm dòng mở popup OViec.
export default function ViecNgay({ onSoViec }: { onSoViec?: () => void } = {}) {
  const bridge = window.manorApps;
  const [view, setView] = useState<AccountView | null>(null);
  const [open, setOpen] = useState(false), [doing, setDoing] = useState<Account | null>(null);
  const [path, setPath] = useState(''), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const [so, setSo] = useState(false);   // đang mở Sổ tài khoản ngay trong bảng (xem lỗi tài khoản)
  const [soViec, setSoViec] = useState<ViecChuTich[]>([]);
  const [mo, setMo] = useState<Mo | null>(null);   // vấn đề đang mở trong popup
  useEffect(() => {
    if (!bridge?.soViec) return;
    bridge.soViec().then(setSoViec, () => {});
    return bridge.onSoViec?.(setSoViec);
  }, [bridge]);
  useEffect(() => {
    if (!bridge?.accounts) return;
    const load = () => bridge.accounts().then(setView, () => {});
    void load();
    const off = bridge.onAccounts?.(setView);
    const timer = setInterval(load, doing ? 5000 : 60000);
    return () => { off?.(); clearInterval(timer); };
  }, [bridge, doing]);
  // Đang làm: tài khoản đã vào bản riêng khi dòng có cờ may (gộp theo email xong) và tiện ích đang nối.
  const live = doing && view?.accounts.find(a => a.label === doing.label || (doing.email && a.email === doing.email));
  const done = Boolean(live?.may && live.online);
  // Việc xong thì tắt luôn (chủ tịch 05/11/2026: "cái nào đã xong thì tắt đi, để chi"): đóng cửa sổ Cốc Cốc app vừa mở cho
  // tài khoản đó (chờ 20 giây cho app tự đăng nhập xong các trang AI, không đóng khi tiện ích đang chạy việc) rồi về danh sách.
  const liveId = done && live ? live.id : '', liveBusy = live?.busy || 0;
  useEffect(() => {
    if (!liveId || liveBusy) return;
    const timer = setTimeout(() => { void bridge?.mayXong?.(liveId).catch(() => {}); setDoing(null); }, 20000);
    return () => clearTimeout(timer);
  }, [bridge, liveId, liveBusy]);
  if (!bridge?.mayDangNhap || !view) return null;

  // Chỉ hiện việc còn phải làm: tài khoản đã đăng nhập máy xong thì không còn trong danh sách.
  const all = view.accounts.filter(a => a.enabled !== false && !/^Profile mới/.test(a.label)).sort((a, b) => rank(a) - rank(b));
  const todo = all.filter(a => !a.may);
  // Tiện ích của ĐÚNG profile máy đang làm (cùng thư mục), không phải dòng mới bất kỳ.
  const fresh = doing && view.accounts.find(a => a.may && a.online && a.profileDir === doing.profileDir && /^Profile mới/.test(a.label));
  // Tài khoản có lỗi do việc tự động ghi lại (chưa đăng nhập, hết tín dụng…): một dòng, bấm mở Sổ tài khoản.
  // Đếm cả lỗi mới lẫn lỗi chờ Claude kiểm lại; tài khoản chờ kiểm = mọi lỗi của nó đã được phản hồi.
  // cl-021: mỗi lỗi tài khoản là một dòng riêng (lỗi mới trước, lỗi chờ Claude kiểm sau), mỗi việc chờ duyệt một dòng.
  const loiDong = view.accounts.flatMap(a => loiCua(a).map(e => ({ a, e })))
    .sort((x, y) => Number(choKiem(x.e)) - Number(choKiem(y.e)) || y.e.luc.localeCompare(x.e.luc));
  const choDuyet = soViec.filter(v => v.trangThai === 'cho-duyet').sort((a, b) => b.luc.localeCompare(a.luc));
  const soViecLam = todo.length + loiDong.length + choDuyet.length;
  const tenDV = (id: string) => view.sites.find(s => s.id === id)?.name || TEN_DICH_VU[id] || id;
  const linkGo = (e: AccountError) => e.link || view.sites.find(s => s.id === e.dichVu)?.url || '';

  async function start(a: Account) {
    setError(''); setCopied(false); setDoing(a);
    try { const r = await bridge!.mayDangNhap!(a.id); setPath(r.installDirectory); await navigator.clipboard?.writeText(r.installDirectory).then(() => setCopied(true), () => {}); }
    catch (e) { setError(message(e)); }
  }
  // Popup của vấn đề đang mở. Vấn đề biến mất khỏi danh sách (đã xử lý ở chỗ khác) thì popup tự đóng.
  function popup() {
    if (!mo) return null;
    const dong = () => setMo(null);
    if (mo.kind === 'loi') {
      const a = view!.accounts.find(x => x.id === mo.accountId), e = a && loiCua(a).find(x => x.id === mo.loiId);
      if (!a || !e) return null;
      const url = linkGo(e);
      const gui = async (feedback: { daXuLy: boolean; nhanXet: string; giuMoi?: boolean }) => {
        if (!bridge?.accountErrorFeedback) throw new Error('Bản app này chưa có nút phản hồi lỗi.');
        setView(await bridge.accountErrorFeedback(a.id, e.id, feedback));
      };
      return <OViec loai={`Lỗi tài khoản · ${TEN_VIEC[e.viec] || e.viec || 'Việc tự động'}`} tieuDe={`Lỗi ${tenDV(e.dichVu)} · ${a.label}`}
        moTa={e.thongBao} goiY={e.goiY}
        trangThai={choKiem(e) ? 'Mày đã phản hồi, đang chờ Claude kiểm lại' : e.kiemLai?.ketQua === 'van-loi' ? `Claude kiểm lại lúc ${lucVN(e.kiemLai.luc)}: vẫn lỗi${e.kiemLai.ghiChu ? `. ${e.kiemLai.ghiChu}` : ''}` : undefined}
        dong={[
          { nhan: 'Tài khoản', noiDung: [a.label, a.email].filter(Boolean).join(' · ') },
          { nhan: 'Lúc', noiDung: `${lucVN(e.luc)}${e.soLan > 1 ? ` · ${e.soLan} lần (từ ${lucVN(e.dau)})` : ''}` },
          { nhan: 'Việc gặp lỗi', noiDung: TEN_VIEC[e.viec] || e.viec || 'Việc tự động' },
          { nhan: 'Đã ổn lại?', noiDung: e.daOnLai ? `Có vẻ ổn lại lúc ${lucVN(e.daOnLai)}` : '' },
          { nhan: 'Mày đã ghi', noiDung: e.phanHoi ? `${lucVN(e.phanHoi.luc)}: ${[e.phanHoi.daXuLy ? 'đã xử lý' : '', e.phanHoi.nhanXet].filter(Boolean).join(' · ')}` : '' },
        ]}
        moTrang={url ? { nhan: `Mở trang trong profile ${a.label}`, onMo: () => bridge!.openInAccount(a.id, { url, cuaSo: false }) } : undefined}
        nhanSubmit="Submit · Đã xử lý" giaiSubmit="Lưu nhận xét và báo đã gỡ xong; Claude kiểm lại rồi mới xoá lỗi"
        onNote={nhanXet => gui({ daXuLy: false, nhanXet, giuMoi: true })}
        onSubmit={nhanXet => gui({ daXuLy: true, nhanXet })}
        phu={{ nhan: 'Mở Sổ tài khoản', onBam: () => { dong(); setSo(true); } }}
        onDong={dong} />;
    }
    const v = soViec.find(x => x.id === mo.id);
    if (!v) return null;
    const luu = async (input: Partial<ViecChuTich>) => {
      if (!bridge?.soViecLuu) throw new Error('Bản app này chưa có Sổ việc.');
      const next = await bridge.soViecLuu({ id: v.id, ...input });
      setSoViec(l => l.map(x => x.id === next.id ? next : x));
    };
    return <OViec loai="Việc xong, chờ chủ tịch duyệt" tieuDe={v.yeuCau}
      moTa={v.ghiChu || undefined}
      dong={[
        { nhan: 'Ai làm', noiDung: v.nguoiLam || 'Chưa rõ' },
        { nhan: 'Giao lúc', noiDung: lucVN(v.luc) },
        { nhan: 'Xong lúc', noiDung: lucVN(v.capNhat) },
        { nhan: 'Kết quả', noiDung: v.ketQua.map(k => [k.text, k.link].filter(Boolean).join(' — ')).join('\n') },
        { nhan: 'Claude ghi', noiDung: v.ghiChuClaude },
      ]}
      moTrang={v.ketQua.find(k => /^https?:\/\//.test(k.link)) ? { nhan: 'Mở link kết quả', onMo: () => bridge!.moLink(v.ketQua.find(k => /^https?:\/\//.test(k.link))!.link) } : undefined}
      nhanSubmit="Submit · Chủ tịch duyệt" giaiSubmit="Lưu nhận xét và duyệt việc này (chuyển sang Chủ tịch đã duyệt)"
      onNote={nhanXet => luu({ ghiChu: noiGhiChu(v.ghiChu, nhanXet) })}
      onSubmit={nhanXet => luu({ ghiChu: noiGhiChu(v.ghiChu, nhanXet), trangThai: 'da-duyet' })}
      phu={onSoViec ? { nhan: 'Mở Sổ việc', onBam: () => { dong(); setOpen(false); onSoViec(); } } : undefined}
      onDong={dong} />;
  }
  // Hết việc thì không hiện gì (chỉ còn bảng nếu đang mở dở).
  if (!soViecLam && !open && !doing) return null;
  return <>
    <button className={`vn-orb ${soViecLam ? '' : 'xong'}`} onClick={() => setOpen(o => !o)} title={soViecLam ? 'Việc cần mày làm ngay để app chạy tiếp' : 'Đã làm xong hết việc cần làm'}>
      {soViecLam ? <AlertCircle size={18} /> : <Check size={18} />} Việc cần làm ngay <b>{soViecLam ? soViecLam : '✓'}</b></button>
    {open && <section className={`vn-panel${so ? ' vn-so' : ''}`} aria-label="Việc cần làm ngay">
      <button className="vn-close" aria-label="Đóng" onClick={() => { setOpen(false); setDoing(null); setSo(false); setMo(null); }}><X size={16} /></button>
      {so ? <AccountBook /> : !doing ? <>
        <h2>Việc cần làm ngay</h2>
        <p className="vn-why">App chạy trong bản Cốc Cốc riêng (không đụng Cốc Cốc của mày). Mỗi tài khoản cần làm <b>một lần</b>: cài tiện ích + đăng nhập. Chưa làm thì việc tự động của tài khoản đó đứng.</p>
        <p className="vn-count">Xong <b>{all.length - todo.length}/{all.length}</b> tài khoản</p>
        <ol className="vn-list">
          {loiDong.map(({ a, e }) => <li key={`${a.id}-${e.id}`} className={`vn-loi vn-mo${choKiem(e) ? ' cho-kiem' : ''}`}>
            <button className="vn-dong" onClick={() => setMo({ kind: 'loi', accountId: a.id, loiId: e.id })} aria-label={`Lỗi ${tenDV(e.dichVu)} · ${a.label}`} title="Bấm để xem đầy đủ, mở trang gỡ lỗi và báo đã xử lý">
              <b>Lỗi {tenDV(e.dichVu)} · {a.label}</b>
              <span className="vn-mota">{e.thongBao}</span>
              <span className="vn-phu">{choKiem(e) ? 'Chờ Claude kiểm lại · ' : ''}{TEN_VIEC[e.viec] || e.viec || 'Việc tự động'} · {lucVN(e.luc)}{e.soLan > 1 ? ` · ${e.soLan} lần` : ''}</span>
            </button></li>)}
          {choDuyet.map(v => <li key={v.id} className="vn-duyet vn-mo">
            <button className="vn-dong" onClick={() => setMo({ kind: 'viec', id: v.id })} aria-label={`Việc chờ duyệt: ${v.yeuCau.slice(0, 80)}`} title="Bấm để xem kết quả, ghi nhận xét và duyệt">
              <b>Chờ duyệt: {v.yeuCau.length > 90 ? `${v.yeuCau.slice(0, 90)}…` : v.yeuCau}</b>
              {v.ketQua[0]?.text && <span className="vn-mota">{v.ketQua[0].text}</span>}
              <span className="vn-phu">{v.nguoiLam || 'Chưa rõ ai làm'} · xong lúc {lucVN(v.capNhat || v.luc)}</span>
            </button></li>)}
          {todo.map(a => <li key={a.id}>
          <span><b>Đăng nhập máy: {a.label}</b><small>{a.email || 'chưa rõ email'}{rank(a) < 1 ? ' · làm trước: tài khoản vẽ ảnh chính' : ''}</small></span>
          <button onClick={() => void start(a)}>Làm ngay</button></li>)}
          {!soViecLam && <li className="xong"><span><b>✓ Hết việc cần làm</b></span></li>}</ol>
        <p className="vn-chan"><button onClick={() => setSo(true)} title="Mở Sổ tài khoản để xem mọi tài khoản và lỗi">Mở Sổ tài khoản</button>
          {onSoViec && <button onClick={() => { setOpen(false); onSoViec(); }} title="Mở Sổ việc chủ tịch">Mở Sổ việc</button>}</p>
      </> : <>
        <h2>Đăng nhập máy · {doing.label}</h2>
        {error && <p className="vn-error">{error}</p>}
        <p className="vn-why">App vừa mở <b>một cửa sổ Cốc Cốc mới</b> (nhìn thanh tác vụ, biểu tượng Cốc Cốc). Làm trong cửa sổ đó:</p>
        <ol className="vn-steps">
          <li><b>Tab đầu tiên: trang Tiện ích.</b> Góc <b>phải trên</b>: bật công tắc <b>“Chế độ dành cho nhà phát triển”</b>.</li>
          <li>Bên <b>trái</b> hiện nút <b>“Tải tiện ích đã giải nén”</b> → bấm → hộp chọn thư mục hiện ra.</li>
          <li>Bấm vào <b>ô đường dẫn trên cùng</b> của hộp đó → <b>Ctrl+V</b> → <b>Enter</b> → bấm <b>“Chọn thư mục”</b>.
            <span className="vn-path"><code>{path || '…'}</code><button onClick={() => { void navigator.clipboard?.writeText(path); setCopied(true); }} disabled={!path}><Copy size={12} /> {copied ? 'Đã chép' : 'Chép đường dẫn'}</button></span></li>
          <li><b>Tab thứ 2: trang đăng nhập Google</b> — đăng nhập <b>mail {doing.email || doing.label}</b> (mail đã điền sẵn, chỉ cần mật khẩu / xác minh). <b>Chỉ mail thôi</b>.</li>
          <li>Xong cứ để đó: app tự đăng nhập <b>các trang AI</b> (ChatGPT, Dreamina) bằng nút “Tiếp tục với Google” với đúng mail này; Flow dùng luôn mail Google. Trang quản lý (YouTube, TikTok, DistroKid, TuneCore…) app không đụng — mày tự chỉ định.</li>
        </ol>
        <ul className="vn-status">
          <li className={fresh || done ? 'ok' : ''}>{fresh || done ? <Check size={14} /> : <Loader2 size={14} className="spin" />} Tiện ích nối về app {fresh || done ? '— xong' : '— đang chờ bước 1–3'}</li>
          <li className={done ? 'ok' : ''}>{done ? <Check size={14} /> : <Loader2 size={14} className="spin" />} Mail Google + app tự đăng nhập các trang + gộp vào dòng {doing.label} {done ? '— xong' : '— đang chờ bước 4'}</li>
        </ul>
        <div className="vn-actions">
          {done ? <button className="vn-main" onClick={() => { if (live && !live.busy) void bridge?.mayXong?.(live.id).catch(() => {}); setDoing(null); }} title="Đóng cửa sổ Cốc Cốc của tài khoản này rồi về danh sách (không bấm thì 20 giây sau app tự đóng)">✓ Xong — làm tài khoản tiếp</button>
            : <button onClick={() => void start(doing)} title="Cửa sổ lỡ tắt thì mở lại">Mở lại cửa sổ đăng nhập</button>}
          <button onClick={() => setDoing(null)}>Về danh sách</button></div>
      </>}
    </section>}
    {open && popup()}
  </>;
}
