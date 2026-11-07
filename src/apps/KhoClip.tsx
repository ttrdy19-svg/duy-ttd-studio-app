import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckSquare, Copy, FolderInput, FolderOpen, Pencil, RefreshCw, Search, Square, X } from 'lucide-react';
import type { ClipChepKetQua, ClipItem as ClipGoc, ClipNhanSua as NhanGoc } from './types';
import { goiY as goiYGoc, suyNhan } from './kho-clip-goi-y.js';
import type { PlanClip, KetQuaGoiY } from './kho-clip-goi-y.js';
import './kho-clip.css';


function nguoi(c: Record<string, unknown>): boolean | undefined {
  if (typeof c.coNguoi === 'boolean') return c.coNguoi;
  if (typeof c.nv === 'boolean') return c.nv;
  if (['khong nguoi', 'cho'].includes(fold(String(c.nhanVat || '')))) return false;
  return c.nhanVat ? true : undefined;
}
function nhanVatKey(v: unknown): string {
  return fold(String(v || '')).replace(/^du ca\s+/, '').replace(/^xing(?: \+ cho)?$/, 'xing');
}
function goiY(plan: PlanClip, items: ClipItem[]): KetQuaGoiY {
  const used = new Set<string>();
  const find = (key: string) => items.find(x => x.id === key || x.path === key);
  for (const c of plan.canh) if (c.dungLai) {
    const key = find(c.dungLai.clip)?.id || c.dungLai.clip;
    if (used.has(key)) throw new Error('Clip lặp trong MV: ' + key);
    used.add(key);
  }
  const recent = [...new Set(items.flatMap(x => x.daDung || []).filter(u => u.bai !== plan.bai).sort((a, b) => String(b.luc).localeCompare(String(a.luc))).map(u => u.bai))].slice(0, 2);
  const rows = plan.canh.map((c, index) => ({ c, index })).sort((a, b) => Number(/tango/.test(suyNhan(plan, b.c).hanhDong)) - Number(/tango/.test(suyNhan(plan, a.c).hanhDong))).map(({ c, index }) => {
    const extra = c as typeof c & { coNguoi?: boolean; hanhDong?: string; boiCanh?: string; thoiGian?: string; canh?: string };
    const target = suyNhan(plan, c), presence = nguoi({ ...target, ...extra });
    const candidates = items.filter(x => !used.has(x.id)).flatMap(x => {
      const cp = nguoi(x as unknown as Record<string, unknown>);
      if (presence !== undefined && cp !== undefined && presence !== cp) return [];
      if (presence !== false && nhanVatKey(target.nhanVat) !== nhanVatKey(x.nhanVat)) return [];
      // Existing core retains source/language/scene rules for lip sync. Normalize known character aliases only.
      const normalized = { ...x, nhanVat: target.nhanVat, canh: x.canh === 'can' ? 'cận' : x.canh };
      const check = goiYGoc({ ...plan, canh: [{ ...c, dungLai: undefined }] }, [normalized]).canh[0];
      if (!check?.goiY) return [];
      let diem = 30; const lyDo = [presence === false ? 'cảnh không người, cùng phong cách' : 'cùng nhân vật, phong cách']; let content = 0;
      for (const [k, label, weight] of [['hanhDong', 'hành động', 30], ['boiCanh', 'bối cảnh', 25], ['thoiGian', 'thời gian', 10]] as const) {
        const wanted = extra[k] || target[k];
        if (wanted && fold(String(x[k] || '')) === fold(wanted)) { diem += weight; content++; lyDo.push('cùng ' + label); }
      }
      if (target.canh && fold(String(x.canh)) === fold(target.canh)) diem += 5;
      if (!content) diem = Math.min(40, diem);
      const canhBao = recent.length === 2 && recent.every(b => x.daDung?.some(u => u.bai === b)) ? 'Đã dùng ở 2 MV gần nhất' : '';
      if (canhBao) diem -= 15;
      return [{ ...check.goiY, diem, lyDo: lyDo.join('; '), canhBao }];
    }).sort((a, b) => b.diem - a.diem || a.clip.localeCompare(b.clip));
    const chosen = c.dungLai ? { ...c.dungLai, diem: null, canhBao: '', hanhDong: find(c.dungLai.clip)?.hanhDong } : candidates[0] || null;
    if (chosen) used.add(find(chosen.clip)?.id || chosen.clip);
    return { index, canh: c.id, thoiLuong: goiYGoc(plan, []).canh[index].thoiLuong, goiY: chosen, ungVien: candidates.slice(0, 5) };
  }).sort((a, b) => a.index - b.index);
  const warnings = goiYGoc(plan, []).canhBao;
  if (warnings.some(w => w.startsWith('Tango:'))) {
    const total = rows.reduce((sum, r) => sum + r.thoiLuong, 0);
    const dance = rows.reduce((sum, r) => sum + ((r.goiY?.hanhDong || suyNhan(plan, plan.canh[r.index]).hanhDong) === 'nhảy tango' ? r.thoiLuong : 0), 0);
    if (total && dance >= total / 3) warnings.length = 0;
  }
  return { canh: rows, canhBao: warnings };
}

type ClipNhanSua = NhanGoc | 'hanhDong' | 'boiCanh' | 'canh' | 'phongCach' | 'thoiGian' | 'thoiTiet' | 'mauChuDao' | 'coNguoi' | 'soNguoi';
type ClipItem = Omit<ClipGoc, 'nhanVat'> & { nhanVat?: string | null; hanhDong?: string; boiCanh?: string; phongCach?: string;
  coNguoi?: boolean; soNguoi?: number; thoiGian?: string; thoiTiet?: string; mauChuDao?: string; canhId?: string; thoiLuong?: number; doPhanGiai?: string; daDung?: { bai: string; luc: string }[] };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
export const NGUON: Record<string, [string, string]> = {
  veo: ['Veo (Flow)', 'Cảnh video Veo làm trong Flow, nằm trong thư mục dựng MV'], dreamina: ['Dreamina nhép', 'Clip hát nhép làm bằng Dreamina'],
  chatgpt: ['Ảnh ChatGPT', 'Ảnh cảnh / ảnh minh họa / thumbnail vẽ bằng ChatGPT'], '3d': ['Video quay 3D', 'Video quay từ Xưởng MV 3D (MMD / VRM)'],
  'dreamina-nhep': ['Dreamina nhép', 'Clip hát nhép Dreamina'], 'chatgpt-anh': ['Ảnh ChatGPT', 'Ảnh tạo bằng ChatGPT'],
  broll: ['B-roll', 'Cảnh B-roll tải từ Pexels / Pixabay'], media: ['Kho media', 'Ảnh / video riêng chủ tịch đưa vào Kho media'], bai: ['Video trong bài', 'Video nằm trong thư mục bài ở kho nhạc'],
};
const LOAI: Record<string, string> = { video: 'Video cảnh', nhep: 'Video hát nhép', anh: 'Ảnh', thumb: 'Thumbnail' };
const TIENG: Record<string, string> = { vi: 'Bài tiếng Việt', en: 'Bài tiếng Anh', zh: 'Bài tiếng Trung', 'không lời': 'Không lời' };
type Loc = { nguon: string; loai: string; khung: string; tieng: string; bai: string; caSi: string; nhanVat: string; hanhDong: string; canh: string; boiCanh: string; phongCach: string; thoiGian: string; thoiTiet: string; mauChuDao: string; coNguoi: string; soNguoi: string };
const LOC0: Loc = { nguon: '', loai: '', khung: '', tieng: '', bai: '', caSi: '', nhanVat: '', hanhDong: '', canh: '', boiCanh: '', phongCach: '', thoiGian: '', thoiTiet: '', mauChuDao: '', coNguoi: '', soNguoi: '' };
const giay = (s: number) => s ? (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${s} giây`) : '';

// Ô lưới: ảnh nhỏ xin khi ô lọt màn hình; video rê chuột thì chạy (tắt tiếng).
function Tile({ item, chon, onChon, onSua }: { item: ClipItem; chon: boolean; onChon: (shift: boolean) => void; onSua: () => void }) {
  const ref = useRef<HTMLDivElement>(null), [src, setSrc] = useState(''), [hover, setHover] = useState(false);
  const video = item.loai === 'video' || item.loai === 'nhep';
  useEffect(() => {
    const el = ref.current, bridge = window.manorApps; if (!el || !bridge?.khoClipNho) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect(); bridge.khoClipNho!(item.id).then(setSrc, () => setSrc(video ? '' : item.url)); }, { rootMargin: '300px' });
    io.observe(el); return () => io.disconnect();
  }, [item.id, item.url, video]);
  const tip = [item.bai || item.name, item.caSi && `Ca sĩ: ${item.caSi}`, item.canh && `Cảnh ${item.canh}${item.doan ? ` · ${item.doan}` : ''}`, item.moTa, item.ghiChu && `Ghi chú: ${item.ghiChu}`, item.path].filter(Boolean).join('\n');
  return <div ref={ref} className={`kc-tile${chon ? ' on' : ''}`} title={tip} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    <button className="kc-img" onClick={e => onChon(e.shiftKey)} aria-pressed={chon} aria-label={`Chọn ${item.name}`}>
      {video && hover ? <video src={item.url} autoPlay muted loop playsInline /> : src ? <img src={src} alt="" /> : <i />}
      <span className="kc-check">{chon ? <CheckSquare size={18} /> : <Square size={18} />}</span>
      <em className="kc-src">{NGUON[item.nguon]?.[0] || item.nguon}</em>
      <em className="kc-meta">{[item.khung, giay(item.giay)].filter(Boolean).join(' · ')}</em>
    </button>
    <div className="kc-cap"><b>{item.bai || item.name.replace(/\.\w+$/, '')}</b>
      <button onClick={onSua} title="Sửa nhãn tay (bài, ca sĩ, mô tả, khung, tiếng…)" aria-label="Sửa nhãn"><Pencil size={13} /></button></div>
    <small>{[item.caSi, item.canh ? `cảnh ${item.canh}` : '', LOAI[item.loai] || item.loai].filter(Boolean).join(' · ')}</small>
    <dl className="kc-nhan">{[['Nhân vật', item.nhanVat], ['Hành động', item.hanhDong], ['Bối cảnh', item.boiCanh], ['Phong cách', item.phongCach], ['Có người', item.coNguoi === undefined ? '' : item.coNguoi ? 'Có' : 'Không'], ['Số người', item.soNguoi === undefined ? '' : String(item.soNguoi)], ['Thời gian', item.thoiGian], ['Thời tiết', item.thoiTiet], ['Màu chủ đạo', item.mauChuDao], ['Tiếng', item.tieng], ['Độ phân giải', item.doPhanGiai], ['Đã dùng', item.daDung?.map(u => u.bai).join(', ')]].map(([label, value]) => value ? <div key={label}><dt>{label}</dt><dd>{value}</dd></div> : null)}</dl>
    {item.moTa && <p>{item.moTa}</p>}
  </div>;
}

// Kho clip: chỉ mục mọi clip / ảnh đã làm. Lọc, chọn nhiều (Shift = chọn dải), "Chép ra" vào thư mục — file gốc giữ nguyên chỗ cũ.
export default function KhoClip() {
  const bridge = window.manorApps;
  const [items, setItems] = useState<ClipItem[]>([]), [loc, setLoc] = useState<Loc>(LOC0), [query, setQuery] = useState('');
  const [chon, setChon] = useState<Set<string>>(new Set()), [moc, setMoc] = useState(''), [sua, setSua] = useState<ClipItem | null>(null);
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [ketQua, setKetQua] = useState<ClipChepKetQua | null>(null);
  const planInput = useRef<HTMLInputElement>(null);
  const [deXuat, setDeXuat] = useState<{ plan: PlanClip; ten: string; result: KetQuaGoiY } | null>(null);
  async function chonPlan(file?: File) {
    if (!file) return;
    try {
      const plan = JSON.parse(await file.text()) as PlanClip;
      if (!plan.bai || !Array.isArray(plan.canh)) throw new Error('Kế hoạch cần bai và mảng canh.');
      setDeXuat({ plan, ten: file.name, result: goiY(plan, items) }); setError('');
    } catch (e) { setError(message(e)); }
  }
  function taiPlan() {
    if (!deXuat) return;
    const plan = structuredClone(deXuat.plan);
    for (const r of deXuat.result.canh) if (r.goiY && (r.goiY.diem ?? 0) >= 75 && !plan.canh[r.index].dungLai) plan.canh[r.index].dungLai = { clip: r.goiY.clip, lyDo: r.goiY.lyDo };
    const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2) + '\n'], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = deXuat.ten; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function load() {
    if (!bridge?.khoClip) return;
    setBusy('tai'); setError('');
    try { setItems((await bridge.khoClip()) as ClipItem[]); setDeXuat(null); } catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const needle = fold(query.trim()).split(/\s+/).filter(Boolean);
  const hop = (i: ClipItem, bo?: keyof Loc) => (Object.keys(loc) as (keyof Loc)[]).every(k => k === bo || !loc[k] || String(i[k]) === loc[k])
    && (!needle.length || (t => needle.every(w => t.includes(w)))(fold([i.moTa, i.bai, i.caSi, i.name, i.doan || '', i.ghiChu, i.nhanVat, i.hanhDong, i.boiCanh, i.phongCach].join(' '))));
  const shown = items.filter(i => hop(i));
  // Mỗi nhóm lọc đếm theo các bộ lọc khác đang bật, để thấy chọn mục này còn bao nhiêu file.
  const nhom = (k: keyof Loc) => { const m = new Map<string, number>(); for (const i of items) if (i[k] !== undefined && i[k] !== null && String(i[k]) !== '' && hop(i, k)) m.set(String(i[k]), (m.get(String(i[k])) || 0) + 1); return [...m].sort((a, b) => a[0].localeCompare(b[0], 'vi')); };
  const shownIds = useMemo(() => shown.map(i => i.id), [shown]);

  function bam(id: string, shift: boolean) {
    setChon(prev => { const next = new Set(prev);
      if (shift && moc) { const a = shownIds.indexOf(moc), b = shownIds.indexOf(id); if (a >= 0 && b >= 0) { for (const x of shownIds.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(x); return next; } }
      if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setMoc(id);
  }
  async function chep(hoiThuMuc: boolean) {
    setError(''); setKetQua(null);
    try {
      const dir = hoiThuMuc ? await bridge!.khoClipChonThuMuc!() : undefined; if (hoiThuMuc && !dir) return;
      setBusy('chep'); const r = await bridge!.khoClipChep!([...chon], dir || undefined); setKetQua(r);
    } catch (e) { setError(message(e)); } finally { setBusy(''); }
  }
  const moThuMuc = (dir?: string) => void bridge!.khoClipMoThuMuc!(dir).catch(e => setError(message(e)));

  if (!bridge?.khoClip) return <section className="kho-clip"><p className="apps-note warn">Kho clip chỉ chạy trong bản Windows (Electron) của app.</p></section>;
  const nhomUi = (k: keyof Loc, ten: string, tip: (v: string) => string, nhan?: (v: string) => string) => {
    const list = nhom(k); if (!list.length && !loc[k]) return null;
    return <><h3>{ten}</h3><ul>
      <li><button aria-pressed={!loc[k]} title={`Không lọc theo ${ten.toLowerCase()}`} onClick={() => setLoc(l => ({ ...l, [k]: '' }))}><span>Tất cả</span></button></li>
      {list.map(([v, n]) => <li key={v}><button aria-pressed={loc[k] === v} title={tip(v)} onClick={() => setLoc(l => ({ ...l, [k]: l[k] === v ? '' : v }))}><span>{nhan ? nhan(v) : v}</span><small>{n}</small></button></li>)}
    </ul></>;
  };
  return <section className="kho-clip" aria-label="Kho clip">
    <aside className="kc-rail">
      <label className="kc-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo mô tả cảnh, bài, ca sĩ" aria-label="Tìm clip" /></label>
      {nhomUi('nguon', 'Nguồn', v => NGUON[v]?.[1] || v, v => NGUON[v]?.[0] || v)}
      {nhomUi('loai', 'Loại', v => `Chỉ hiện ${(LOAI[v] || v).toLowerCase()}`, v => LOAI[v] || v)}
      {nhomUi('khung', 'Khung hình', v => v === 'khác' ? 'Khung không theo tỉ lệ chuẩn' : `Chỉ hiện khung ${v}`)}
      {nhomUi('tieng', 'Tiếng của bài', v => `Chỉ hiện clip của ${(TIENG[v] || v).toLowerCase()}`, v => TIENG[v] || v)}
      {nhomUi('caSi', 'Ca sĩ', v => `Chỉ hiện clip của ca sĩ ${v}`)}
      {nhomUi('nhanVat', 'Nhân vật', v => v)}
      {nhomUi('hanhDong', 'Hành động', v => v)}
      {nhomUi('coNguoi', 'Có người', v => v, v => v === 'true' ? 'Có người' : 'Không người')}
      {nhomUi('soNguoi', 'Số người', v => v)}
      {(['boiCanh', 'phongCach', 'thoiGian', 'thoiTiet', 'mauChuDao'] as const).map((k, i) => <div key={k}>{nhomUi(k, ['Bối cảnh', 'Phong cách', 'Thời gian', 'Thời tiết', 'Màu chủ đạo'][i], v => v)}</div>)}
      {nhomUi('canh', 'Cỡ cảnh', v => `Cảnh ${v}`)}
      {nhomUi('bai', 'Bài', v => `Chỉ hiện clip của bài ${v}`)}
    </aside>
    <div className="kc-main">
      <div className="kc-bar">
        <b>{shown.length} file{chon.size ? ` · đã chọn ${chon.size}` : ''}</b>
        <button disabled={!items.length || !!busy} onClick={() => planInput.current?.click()}>Gợi ý cho bài…</button>
        <input ref={planInput} type="file" accept=".json,application/json" hidden onChange={e => { void chonPlan(e.target.files?.[0]); e.target.value = ''; }} />
        <button onClick={() => void load()} disabled={busy === 'tai'} title="Quét lại thư mục dựng MV, video 3D, Kho media, thư mục bài (file không đổi thì không đo lại)"><RefreshCw size={13} /> {busy === 'tai' ? 'Đang quét…' : 'Quét lại'}</button>
        <button onClick={() => setChon(prev => new Set([...prev, ...shownIds]))} disabled={!shown.length} title="Chọn mọi file đang hiện theo bộ lọc">Chọn hết đang hiện</button>
        <button onClick={() => setChon(new Set())} disabled={!chon.size} title="Bỏ chọn tất cả">Bỏ chọn</button>
        <span className="kc-gap" />
        <button className="primary" disabled={!chon.size || busy === 'chep'} onClick={() => void chep(false)} title="Chép các file đã chọn vào E:\AI Duy TTD\AI Clip chon\<ngày hôm nay>. File gốc giữ nguyên."><Copy size={13} /> Chép ra thư mục hôm nay</button>
        <button disabled={!chon.size || busy === 'chep'} onClick={() => void chep(true)} title="Chọn thư mục rồi chép các file đã chọn vào đó. File gốc giữ nguyên."><FolderInput size={13} /> Chép ra thư mục khác…</button>
        <button onClick={() => moThuMuc(ketQua?.thuMuc)} title={ketQua ? `Mở ${ketQua.thuMuc}` : 'Mở thư mục chép ra hôm nay'}><FolderOpen size={13} /> Mở thư mục kết quả</button>
      </div>
      {error && <p className="apps-note warn">{error}</p>}
      {deXuat && <div className="kc-goi-y"><b>Gợi ý: {deXuat.plan.bai}</b><button onClick={taiPlan}>Tải kế hoạch có clip dùng lại</button><button onClick={() => setDeXuat(null)}>Đóng</button>
        {deXuat.result.canhBao.map(w => <p key={w} className="apps-note warn">{w}</p>)}
        <table><thead><tr><th>Cảnh</th><th>Điểm</th><th>Clip</th><th>Mô tả</th><th>Lý do / cảnh báo</th></tr></thead><tbody>{deXuat.result.canh.map(r => <tr key={r.index}><td>{r.canh}</td><td>{r.goiY?.diem ?? ''}</td><td>{r.goiY?.clip || 'Tạo mới / nhép lại'}</td><td>{items.find(i => i.id === r.goiY?.id || i.path === r.goiY?.clip)?.moTa}</td><td>{[r.goiY?.lyDo, r.goiY?.canhBao].filter(Boolean).join(' · ')}</td></tr>)}</tbody></table></div>}
      {ketQua && <p className="apps-note">Đã chép {ketQua.chep} file vào {ketQua.thuMuc}{ketQua.daCo ? ` · ${ketQua.daCo} file đã có sẵn ở đó, bỏ qua` : ''}{ketQua.thieu.length ? ` · ${ketQua.thieu.length} file không còn trong chỉ mục` : ''}. Danh sách file gốc ghi ở nguon.txt.</p>}
      {!shown.length && busy !== 'tai' && <p className="kc-empty">Chưa có clip / ảnh nào khớp bộ lọc.</p>}
      <div className="kc-grid">{shown.map(i => <Tile key={i.id} item={i} chon={chon.has(i.id)} onChon={shift => bam(i.id, shift)} onSua={() => setSua(i)} />)}</div>
    </div>
    {sua && <SuaNhan key={sua.id} item={sua} onClose={() => setSua(null)} onError={setError}
      onSaved={next => { setItems(list => list.map(i => i.id === next.id ? next : i)); setSua(null); }} />}
  </section>;
}

const TRUONG: [ClipNhanSua, string, string][] = [['bai', 'Bài', 'Tên bài'], ['caSi', 'Ca sĩ / nhân vật', 'Ca sĩ hoặc nhân vật trong clip'], ['moTa', 'Mô tả cảnh', 'Bối cảnh, hành động — dùng để tìm'],
  ['nhanVat', 'Nhân vật', 'Du Ca lãng tử tóc bạc · Xing + chó · không người'], ['hanhDong', 'Hành động', 'nhảy tango · nhép · đi · đứng · cảnh vật'],
  ['boiCanh', 'Bối cảnh', 'quán trà · phố đêm · sông · núi'], ['canh', 'Cỡ cảnh', 'xa · trung · cận (nhép bắt buộc có)'], ['phongCach', 'Phong cách', 'cổ phong điện ảnh · hoạt hình'],
  ['coNguoi', 'Có người', 'true · false'], ['soNguoi', 'Số người', 'Số nguyên từ 0'], ['thoiGian', 'Thời gian', 'ngày · hoàng hôn · đêm'], ['thoiTiet', 'Thời tiết', 'trời quang · mưa · tuyết'], ['mauChuDao', 'Màu chủ đạo', 'xanh · đỏ · vàng'],
  ['nguon', 'Nguồn', 'veo · dreamina · chatgpt · 3d · broll · media · bai'], ['loai', 'Loại', 'video · nhep · anh · thumb'], ['khung', 'Khung hình', '16:9 · 9:16 · 1:1 · 4:3 …'],
  ['tieng', 'Tiếng của bài', 'vi · en · zh'], ['ghiChu', 'Ghi chú', 'Ghi chú riêng của chủ tịch']];

// Sửa nhãn tay: chỉ trường đã đổi được lưu; "Về nhãn tự suy" bỏ hết sửa tay.
function SuaNhan({ item, onClose, onSaved, onError }: { item: ClipItem; onClose: () => void; onSaved: (i: ClipItem) => void; onError: (s: string) => void }) {
  const bridge = window.manorApps!;
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(TRUONG.map(([k]) => [k, String(item[k] ?? '')]))), [saving, setSaving] = useState(false);
  const doi = TRUONG.filter(([k]) => form[k] !== String(item[k] ?? ''));
  async function luu(patch: Partial<Record<ClipNhanSua, string | null>>) {
    setSaving(true);
    try { onSaved(await bridge.khoClipNhan!(item.id, patch) as ClipItem); } catch (e) { onError(message(e)); } finally { setSaving(false); }
  }
  return <div className="kc-sua" role="dialog" aria-label={`Sửa nhãn ${item.name}`} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <div className="kc-sua-box">
      <button className="kc-close" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)"><X size={16} /></button>
      <h2>Sửa nhãn</h2>
      <p className="kc-path" title={item.path}>{item.name}<small>{item.folder}</small></p>
      {TRUONG.map(([k, ten, tip]) => <label key={k} title={tip}><span>{ten}{item.sua.includes(k) ? ' · đã sửa tay' : ''}</span>
        {k === 'moTa' || k === 'ghiChu' ? <textarea value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={tip} />
          : <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={tip} />}</label>)}
      <div className="kc-sua-nut">
        <button className="primary" disabled={!doi.length || saving} onClick={() => void luu(Object.fromEntries(doi.map(([k]) => [k, form[k]])))} title="Lưu các ô đã đổi">{saving ? 'Đang lưu…' : 'Lưu nhãn'}</button>
        <button disabled={!item.sua.length || saving} onClick={() => void luu(Object.fromEntries(item.sua.map(k => [k, null])))} title="Bỏ mọi sửa tay, dùng lại nhãn app tự suy từ đường dẫn và kế hoạch MV">Về nhãn tự suy</button>
        <button onClick={() => void bridge.khoClipMo!(item.id).catch(e => onError(message(e)))} title="Mở thư mục đang chứa file gốc (file được chọn sẵn)"><FolderOpen size={13} /> Mở chỗ file gốc</button>
      </div>
    </div>
  </div>;
}
