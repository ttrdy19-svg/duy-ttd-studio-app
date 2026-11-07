import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Gauge, Info, RefreshCw, Wallet } from 'lucide-react';
import type { HanMuc, HanMucNguon } from './types';
import NguonKey from './TramHanMucNguon';
import './tram-han-muc.css';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const gio = (t?: number | null) => t ? new Date(t).toLocaleString('vi-VN') : '—';
const DO: Record<HanMucNguon['do'], string> = { 'do-duoc': 'Đo được', 'uoc-tinh': 'Ước tính', 'chua-co': 'Chưa có số' };
const TT: Record<HanMucNguon['trangThai'], string> = { on: 'Còn nhiều', 'gan-het': 'Gần hết', het: 'Hết / bị chặn', 'chua-ro': 'Chưa rõ' };

// Còn bao lâu thì hồi (vd "2 giờ 15 phút").
function conBaoLau(t: number, now: number) {
  const phut = Math.round((t - now) / 60000);
  if (phut <= 0) return 'đã tới giờ hồi';
  return phut >= 60 ? `còn ${Math.floor(phut / 60)} giờ ${phut % 60} phút` : `còn ${phut} phút`;
}

// Codex nhiều tài khoản bằng CODEX_HOME riêng: hiển thị cả 3 tài khoản (gói + % cửa sổ 5 giờ / tuần + hết tín dụng).
function Workspace({ n }: { n: HanMucNguon }) {
  if (!n.workspace) return null;
  return <div className="hm-ws">
    <small>Các tài khoản Codex (CODEX_HOME riêng)</small>
    {!n.workspace.length && <p className="hm-cach">Chưa có home Codex nào. Chạy <code>node tools/codex-doi.cjs tao &lt;ten&gt;</code> rồi đăng nhập.</p>}
    {n.workspace.map(w => {
      const het = w.dangHet ?? Boolean(w.het);
      return <div key={w.ten} className={`hm-ws-row${w.dangDung ? ' dang' : ''}${het ? ' het' : ''}`}>
        <span>
          <b>{w.ten}</b>{w.thuMuc ? ` (${w.thuMuc})` : ''} · gói {w.goi}{w.mail ? ` · ${w.mail}` : ''}
          {' · '}5 giờ: {w.pct5h != null ? `${w.pct5h}%` : '—'}
          {' · '}tuần: {w.pctTuan != null ? `${w.pctTuan}%` : '—'}
          {w.dangDung && !het ? ' · đang ưu tiên' : ''}
          {het ? <em title={w.lyDo}> · hết tín dụng{w.het ? ` ${gio(w.het)}` : ''}{w.lyDo ? ` (${w.lyDo})` : ''}</em> : null}
        </span>
      </div>;
    })}
  </div>;
}

function AgyGroups({ n }: { n: HanMucNguon }) {
  if (!n.agyGroups?.length) return null;
  return <div className="hm-ws" aria-label="Nhóm hạn mức Antigravity">
    <small>Nhóm hạn mức (không có số phần trăm)</small>
    {n.agyGroups.map(g => {
      const state = g.trangThai === 'on' ? 'Dùng được'
        : g.trangThai === 'het' ? 'Hết'
          : g.ketQuaCuoi === 'het' ? 'Chưa rõ, có thể đã hồi' : 'Chưa rõ';
      const details = g.trangThai === 'on'
        ? `chạy thành công lúc ${gio(g.capNhat)}`
        : g.ketQuaCuoi === 'het'
          ? `hết lúc ${gio(g.hetLuc)} · mốc hồi ước tính ${gio(g.hoiLai)}`
          : g.capNhat ? `lần chạy thành công cuối ${gio(g.capNhat)}` : 'chưa ghi nhận lần chạy';
      return <div key={g.id} className={`hm-ws-row${g.trangThai === 'het' ? ' het' : ''}`}>
        <span><b>{g.ten}</b> · {state} · {details} · hôm nay {g.luotHomNay} lần chạy</span>
      </div>;
    })}
  </div>;
}

// Ô chủ tịch tự nhập hạn mức thật (vd Claude: trang Claude ghi "đã dùng 98% tuần", reset 09/11 09:00). App không tự đọc được số này.
const hai = (x: number) => String(x).padStart(2, '0');
const chuReset = (t?: number | null) => { if (!t) return ''; const d = new Date(t); return `${hai(d.getDate())}/${hai(d.getMonth() + 1)} ${hai(d.getHours())}:${hai(d.getMinutes())}`; };
function ONhap({ n, onLuu }: { n: HanMucNguon; onLuu: (input: { pct: number; reset: string } | null) => Promise<void> }) {
  const [pct, setPct] = useState(n.nhap ? String(n.nhap.pct) : ''), [reset, setReset] = useState(chuReset(n.nhap?.reset));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function luu(xoa = false) {
    setBusy(true); setError('');
    try { await onLuu(xoa ? null : { pct: Number(pct.replace(',', '.').replace('%', '')), reset: reset.trim() }); if (xoa) { setPct(''); setReset(''); } }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <form className="hm-nhap" onSubmit={e => { e.preventDefault(); void luu(); }} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #24302d' }}>
    <small style={{ width: '100%', color: '#9fb2ac' }}>Số thật trên trang (Settings → Usage) — mày nhập:</small>
    <label>Đã dùng tuần <input aria-label="Phần trăm tuần đã dùng" value={pct} onChange={e => setPct(e.target.value)} placeholder="98" inputMode="decimal" style={{ width: 52 }} />%</label>
    <label>Reset <input aria-label="Ngày giờ reset" value={reset} onChange={e => setReset(e.target.value)} placeholder="09/11 09:00" style={{ width: 92 }} /></label>
    <button type="submit" disabled={busy || !pct.trim()}>Lưu</button>
    {n.nhap && <button type="button" disabled={busy} onClick={() => void luu(true)} title="Xoá số đã nhập">Xoá</button>}
    {error && <span className="hm-loi" style={{ width: '100%' }}>{error}</span>}
  </form>;
}

function The({ n, now, onNhap }: { n: HanMucNguon; now: number; onNhap?: (id: string, input: { pct: number; reset: string } | null) => Promise<void> }) {
  const do_ = n.canhBao ? { borderColor: '#ff8a7a', borderTopColor: '#ff8a7a', ['--c' as string]: '#ff8a7a' } : undefined;
  const tinhTrang = n.id === 'agy'
    ? ({ on: 'Có nhóm dùng được', 'gan-het': 'Chưa rõ', het: 'Hết', 'chua-ro': 'Chưa rõ' } as const)[n.trangThai]
    : TT[n.trangThai];
  return <article className={`hm-card ${n.trangThai}${n.canhBao ? ' canh-bao' : ''}`} aria-label={n.ten} style={do_}>
    <header>
      <b>{n.ten}</b>
      <span className={`hm-do ${n.do}`} title={n.cach}>{DO[n.do]} <Info size={12} /></span>
    </header>
    {n.pct != null && <div className="hm-bar" title={`Đã dùng ${n.pct}%`}><i style={{ width: `${Math.min(100, n.pct)}%` }} /></div>}
    <div className="hm-sum">
      <span><small>Đã dùng</small>{n.daDung || 'chưa đo'}</span>
      <span><small>Còn lại</small>{n.conLai || 'chưa đo'}</span>
      <span><small>Tình trạng</small><em>{tinhTrang}{n.pct != null ? ` · ${n.pct}%` : ''}</em></span>
    </div>
    <p className="hm-time">
      {n.hoiLai ? <>Hồi lại {gio(n.hoiLai)} ({conBaoLau(n.hoiLai, now)}) · </> : null}Cập nhật {gio(n.capNhat)}
    </p>
    {n.loi && <p className="hm-loi">{n.loi}</p>}
    {n.dong.length > 0 && <dl>{n.dong.map(([k, v], i) => <div key={i} className={k.startsWith('  ') ? 'sub' : ''}><dt>{k.trim()}</dt><dd>{v}</dd></div>)}</dl>}
    <Workspace n={n} />
    <AgyGroups n={n} />
    {n.nhapDuoc && onNhap && <ONhap n={n} onLuu={input => onNhap(n.id, input)} />}
    <p className="hm-cach">{n.cach}</p>
  </article>;
}

// Trạm hạn mức: mỗi thợ / tài khoản / key AI một thẻ — đã dùng, còn lại, lúc hồi, nguồn số liệu. Chỉ gọi mạng khi bấm Dò số dư.
export default function TramHanMuc() {
  const bridge = window.manorApps;
  const [data, setData] = useState<HanMuc | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [doBusy, setDoBusy] = useState(false);
  const tai = useCallback(async () => {
    if (!bridge?.hanMuc) return;
    setBusy(true); setError('');
    try { setData(await bridge.hanMuc()); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }, [bridge]);
  useEffect(() => { void tai(); }, [tai]);
  // Lưu số chủ tịch nhập; lỗi (số sai) ném ra để ô nhập hiện.
  const nhap = useCallback(async (id: string, input: { pct: number; reset: string } | null) => {
    if (!bridge?.hanMucNhap) throw new Error('Bản app này chưa có ô tự nhập.');
    setData(await bridge.hanMucNhap(id, input));
  }, [bridge]);

  if (!bridge?.hanMuc) return <section className="tram-han-muc"><p className="hm-loi">Trạm hạn mức chỉ chạy trong bản Windows (Electron) của app.</p></section>;
  const het = data?.nguon.filter(n => n.trangThai === 'het').length || 0, gan = data?.nguon.filter(n => n.trangThai === 'gan-het' || (n.canhBao && n.trangThai !== 'het')).length || 0;
  const doSoDu = async () => {
    if (!bridge.hanMucDo) return;
    setDoBusy(true); setError('');
    try { await bridge.hanMucDo(); await tai(); } catch (e) { setError(message(e)); } finally { setDoBusy(false); }
  };
  return <section className="tram-han-muc">
    <div className="hm-head">
      <div>
        <h2><Gauge size={22} /> Trạm hạn mức</h2>
        <p>Hạn mức đã dùng / còn lại của từng thợ AI. Đọc file phiên trên máy và số app đã dò sẵn, không mở trình duyệt. Chỉ khi bấm "Dò số dư" mới gọi trang trung gian bằng key của nguồn. Số nào không đọc được thì ghi “chưa đọc được”, không đoán. Rê chuột vào nhãn nguồn để xem cách đo.</p>
      </div>
      {bridge.hanMucDo && <button onClick={() => void doSoDu()} disabled={doBusy} title="Gọi trang trung gian bằng key của từng nguồn để xem số dư (OpenRouter, new-api/one-api, billing). Trang không có đường xem thì chỉ đếm token."><Wallet size={14} /> {doBusy ? 'Đang dò…' : 'Dò số dư'}</button>}
      <button className="primary" onClick={() => void tai()} disabled={busy}><RefreshCw size={14} className={busy ? 'spin' : ''} /> {busy ? 'Đang đọc…' : 'Làm mới'}</button>
    </div>
    {error && <p className="hm-loi">{error}</p>}
    {data?.canhBao?.length ? <ul className="hm-canh-bao" aria-label="Cảnh báo">{data.canhBao.map((c, i) => <li key={i}><AlertTriangle size={13} /> {c}</li>)}</ul> : null}
    {data && <p className="hm-tong">Đọc lúc {gio(data.luc)} · {het ? <b className="het">{het} nguồn hết / bị chặn</b> : 'không nguồn nào hết'}{gan ? <> · <b className="gan-het">{gan} nguồn gần hết</b></> : null}</p>}
    <div className="hm-grid">{data?.nguon.map(n => <The key={n.id} n={n} now={data.luc} onNhap={nhap} />)}</div>
    {data?.cauHinh && <NguonKey cauHinh={data.cauHinh} bridge={bridge} xong={() => void tai()} />}
  </section>;
}
