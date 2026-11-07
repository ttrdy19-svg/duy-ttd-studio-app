import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Boxes, Cat, FolderOpen, Footprints, Landmark, Map as MapIcon, Search, Trees, UserRound } from 'lucide-react';
import Viewer, { type CheDo } from './Viewer';
import { khoUrl, nguonXem } from './nap';
import { boHang, xepChup } from './anh';
import type { KhoIndex, KhoItem, KhoLoai } from './types';
import './kho3d.css';

const LOAI: { id: KhoLoai | 'tat-ca'; ten: string; icon: typeof Box }[] = [
  { id: 'map', ten: 'Map / bối cảnh', icon: MapIcon }, { id: 'nhan-vat', ten: 'Nhân vật', icon: UserRound },
  { id: 'chuyen-dong', ten: 'Chuyển động', icon: Footprints }, { id: 'thu', ten: 'Thú', icon: Cat },
  { id: 'kien-truc', ten: 'Kiến trúc', icon: Landmark }, { id: 'thien-nhien', ten: 'Thiên nhiên', icon: Trees },
  { id: 'do-vat', ten: 'Đồ vật', icon: Box }, { id: 'tat-ca', ten: 'Tất cả', icon: Boxes },
];
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
const mb = (b: number) => b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
const so = (n?: number) => n == null ? '—' : n.toLocaleString('vi-VN');
const TRANG = 120;

// Kho 3D: duyệt mọi mô hình trên máy theo loại, xem 3D / 2.5D / 2D, chạy thử động tác, xem đủ thông tin.
export default function Kho3D() {
  const bridge = window.manorKho;
  const [idx, setIdx] = useState<KhoIndex | null>(null);
  const [loai, setLoai] = useState<KhoLoai | 'tat-ca'>('map');
  const [q, setQ] = useState(''); const [nguon, setNguon] = useState('');
  const [chon, setChon] = useState<KhoItem | null>(null);
  const [cheDo, setCheDo] = useState<CheDo>('3d');
  const [soTrang, setSoTrang] = useState(1);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  // Bộ chuyển đổi chạy nền cập nhật danh mục dần: nạp lại mỗi phút để món mới chuyển xong hiện ra.
  useEffect(() => {
    const load = () => bridge?.index().then(setIdx, e => setErr(String(e)));
    load(); const t = setInterval(load, 60000); return () => clearInterval(t);
  }, [bridge]);
  useEffect(() => { setSoTrang(1); boHang(); }, [loai, q, nguon]);

  // Món xem được (đã có GLB hoặc trình duyệt đọc thẳng) lên trước, món đang chờ chuyển xuống cuối.
  const trongLoai = useMemo(() => (idx?.items || []).filter(i => loai === 'tat-ca' || i.loai === loai)
    .sort((a, b) => Number(!nguonXem(a)) - Number(!nguonXem(b))), [idx, loai]);
  const dsNguon = useMemo(() => { const m: Record<string, number> = {}; for (const i of trongLoai) m[i.nguon] = (m[i.nguon] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [trongLoai]);
  const loc = useMemo(() => { const f = fold(q.trim()); return trongLoai.filter(i => (!nguon || i.nguon === nguon) && (!f || fold(i.ten + ' ' + i.nguon + ' ' + i.file).includes(f))); }, [trongLoai, q, nguon]);
  const hien = loc.slice(0, soTrang * TRANG);

  if (!bridge) return <section className="kho3d"><p className="kho-empty">Kho 3D chỉ chạy trong bản Windows (Electron) của app.</p></section>;
  if (idx?.chua_quet) return <section className="kho3d"><p className="kho-empty">Chưa có danh mục. Chạy <code>node tools/kho-3d/quet.cjs</code> để quét kho trên máy.</p></section>;

  return <section className="kho3d" aria-label="Kho 3D">
    <aside className="kho-side">
      <h2>Kho 3D <small>{so(idx?.items.length)} món</small></h2>
      {LOAI.map(l => <button key={l.id} className="kho-loai" aria-pressed={loai === l.id} onClick={() => { setLoai(l.id); setNguon(''); }}>
        <l.icon size={15} /> {l.ten} <small>{so(l.id === 'tat-ca' ? idx?.items.length : idx?.dem[l.id] || 0)}</small></button>)}
      <label className="kho-search"><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tên, bộ, đường dẫn…" /></label>
      <select value={nguon} onChange={e => setNguon(e.target.value)} aria-label="Lọc nguồn">
        <option value="">Mọi nguồn ({so(trongLoai.length)})</option>
        {dsNguon.map(([n, c]) => <option key={n} value={n}>{n} ({c})</option>)}
      </select>
      {err && <p className="kho-err">{err}</p>}
      <p className="kho-note">{idx?.quet_luc ? 'Quét lúc ' + new Date(idx.quet_luc).toLocaleString('vi-VN') : ''}</p>
    </aside>
    <div className="kho-grid" onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight > el.scrollHeight - 300 && hien.length < loc.length) setSoTrang(p => p + 1); }}>
      {hien.map(it => <Card key={it.id} it={it} thumb={thumbs[it.id] || it.thumb} active={chon?.id === it.id} onPick={() => setChon(it)}
        onNeedThumb={() => xepChup(it, p => p && setThumbs(t => ({ ...t, [it.id]: p })))} />)}
      {!loc.length && <p className="kho-empty">Không có món nào khớp.</p>}
    </div>
    <div className="kho-detail">
      {chon ? <>
        <div className="kho-modes">{(['3d', '25d', '2d'] as CheDo[]).map(m => <button key={m} aria-pressed={cheDo === m} onClick={() => setCheDo(m)}>{m === '3d' ? '3D' : m === '25d' ? '2.5D' : '2D'}</button>)}</div>
        <Viewer key={chon.id} item={chon} cheDo={cheDo} />
        <Info it={chon} />
      </> : <p className="kho-empty">Chọn một món bên trái để xem.</p>}
    </div>
  </section>;
}

function Card({ it, thumb, active, onPick, onNeedThumb }: { it: KhoItem; thumb?: string; active: boolean; onPick(): void; onNeedThumb(): void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (thumb || !ref.current) return;
    const ob = new IntersectionObserver(es => { if (es[0].isIntersecting) { onNeedThumb(); ob.disconnect(); } }, { rootMargin: '200px' });
    ob.observe(ref.current); return () => ob.disconnect();
  }, [thumb]);
  const xem = !!nguonXem(it);
  return <button ref={ref} className="kho-card" aria-pressed={active} onClick={onPick} title={it.file}>
    {thumb ? <img src={khoUrl(thumb)} alt="" loading="lazy" /> : <span className="kho-noimg">{xem ? 'đang chụp…' : 'chờ chuyển GLB'}</span>}
    <b>{it.ten}</b><small>{it.nguon} · {it.dinh_dang}</small>
  </button>;
}

function Info({ it }: { it: KhoItem }) {
  const rows: [string, string][] = [
    ['Tên', it.ten], ['Loại', it.loai], ['Nguồn', it.nguon], ['Bản quyền', it.ban_quyen || 'chưa rõ — xem trang nguồn'],
    ['Định dạng gốc', it.dinh_dang.toUpperCase()], ['Bản dùng trong app', it.glb ? (it.glb === it.file ? 'dùng thẳng file gốc' : 'GLB đã chuyển') : it.can_chuyen ? 'đang chờ chuyển GLB' : '—'],
    ['Dung lượng', mb(it.dung_luong)], ['Tam giác', so(it.mat)], ['Xương', so(it.xuong)], ['Số động tác', so(it.dong_tac?.length)],
  ];
  if (it.vrm) rows.push(['VRM — tác giả', it.vrm.tac_gia || '—'], ['VRM — giấy phép', it.vrm.giay_phep || '—']);
  if (it.loi) rows.push(['Lỗi', it.loi]);
  return <div className="kho-info">
    <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <p className="kho-path">{it.file}</p>
    <button onClick={() => window.manorKho?.show(it.file)}><FolderOpen size={14} /> Mở thư mục</button>
  </div>;
}
