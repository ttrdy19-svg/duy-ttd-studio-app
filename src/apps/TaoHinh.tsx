import { useEffect, useRef, useState } from 'react';
import { FolderOpen, ImagePlus, Loader2, Sparkles, Upload, X } from 'lucide-react';
import type { KieuHinh, TaoHinhKetQua } from './types';
import './tao-hinh.css';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const TU_VIET = 'tu-viet';

// Mini app 20 "Tạo hình theo lệnh" (06/11/2026): nhập ảnh → chọn phong cách → câu lệnh tự điền (sửa được) → Codex Business vẽ.
export default function TaoHinh() {
  const bridge = window.manorApps;
  const [kieu, setKieu] = useState<KieuHinh[]>([]), [ratios, setRatios] = useState<string[]>([]), [thuMuc, setThuMuc] = useState('');
  const [chon, setChon] = useState(''), [prompt, setPrompt] = useState(''), [them, setThem] = useState('');
  const [ratio, setRatio] = useState('1:1'), [so, setSo] = useState(1);
  const [anh, setAnh] = useState<{ ten: string; mime: string; bytes: Uint8Array; url: string } | null>(null);
  const [busy, setBusy] = useState(false), [buoc, setBuoc] = useState(''), [error, setError] = useState('');
  const [ketQua, setKetQua] = useState<TaoHinhKetQua['ketQua']>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [nhom, setNhom] = useState('Tất cả'), [tim, setTim] = useState('');
  const loc = kieu.filter(k => (nhom === 'Tất cả' || k.nhom === nhom) && (!tim.trim() || `${k.ten} ${k.lenh} ${k.prompt}`.toLowerCase().includes(tim.trim().toLowerCase())));
  const dangChon = kieu.find(k => k.id === chon);

  useEffect(() => {
    bridge?.taoHinhKieu?.().then(r => { setKieu(r.kieu); setRatios(r.ratios); setThuMuc(r.thuMuc); }, e => setError(message(e)));
    return bridge?.onTaoHinhBuoc?.(setBuoc);
  }, [bridge]);

  const chonKieu = (k: KieuHinh | null) => {
    if (!k) { setChon(TU_VIET); setPrompt(''); return; }
    setChon(k.id); setPrompt(k.prompt); setRatio(k.ratio);
  };
  const napAnh = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) { setError('Chỉ nhận file ảnh (png, jpg, webp).'); return; }
    setError('');
    if (anh) URL.revokeObjectURL(anh.url);
    setAnh({ ten: f.name, mime: f.type, bytes: new Uint8Array(await f.arrayBuffer()), url: URL.createObjectURL(f) });
  };
  const tao = async () => {
    if (!bridge?.taoHinh || !anh) return;
    setBusy(true); setError(''); setBuoc('Đang gửi sang Codex…');
    try {
      const r = await bridge.taoHinh({ ten: anh.ten, bytes: anh.bytes, mime: anh.mime, kieu: chon || TU_VIET, prompt, them, ratio, so });
      setKetQua(old => [...r.ketQua, ...old]);
      const loi = r.ketQua.filter(x => x.error);
      if (loi.length) setError(loi.map(x => x.error).join(' · '));
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); setBuoc(''); }
  };

  return <section className="tao-hinh" aria-label="Tạo hình theo lệnh">
    <header className="th-head">
      <div><h2><Sparkles size={20} /> Tạo hình theo lệnh</h2>
        <p>Nhập một ảnh, chọn phong cách: câu lệnh tự điền, sửa thêm nếu muốn, rồi bấm Tạo. Vẽ bằng Codex suất Business (hết tín dụng thì tự sang suất Plus). Ảnh lưu ở {thuMuc || 'E:\\AI Duy TTD\\AI Ket Qua\\_Tao hinh'}.</p></div>
      <button onClick={() => bridge?.taoHinhMo?.()} title="Mở thư mục ảnh đã tạo"><FolderOpen size={15} /> Mở thư mục</button>
    </header>

    <div className="th-body">
      <div className="th-trai">
        <div className={`th-anh${anh ? ' co' : ''}`} onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); void napAnh(e.dataTransfer.files[0]); }} title="Bấm để chọn ảnh, hoặc kéo thả ảnh vào đây">
          {anh ? <><img src={anh.url} alt={anh.ten} /><button className="th-bo" title="Bỏ ảnh" onClick={e => { e.stopPropagation(); URL.revokeObjectURL(anh.url); setAnh(null); }}><X size={14} /></button></>
            : <span><Upload size={28} /><b>Chọn ảnh hoặc kéo thả vào đây</b><small>png, jpg, webp</small></span>}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { void napAnh(e.target.files?.[0]); e.target.value = ''; }} />

        <h3>Phong cách <small>{kieu.length} mẫu</small></h3>
        <div className="th-nhom">
          {['Tất cả', ...new Set(kieu.map(k => k.nhom))].map(n => <button key={n} className={nhom === n ? 'on' : ''} onClick={() => setNhom(n)}>{n}</button>)}
          <input value={tim} onChange={e => setTim(e.target.value)} placeholder="Tìm mẫu…" title="Tìm theo tên, lệnh hoặc nội dung câu lệnh" />
        </div>
        <div className="th-kieu">
          {loc.map(k => <button key={k.id} className={chon === k.id ? 'on' : ''} onClick={() => chonKieu(k)} title={`${k.giai}${k.tacGia ? `\nNguồn: ${k.tacGia}` : ''}`}>
            {k.anh && <img src={k.anh} alt="" loading="lazy" />}
            <code>{k.lenh}</code><b>{k.ten}</b><small>{k.giai}</small></button>)}
          <button className={chon === TU_VIET ? 'on' : ''} onClick={() => chonKieu(null)} title="Tự gõ câu lệnh từ đầu"><code>/tu-viet</code><b>Tự viết</b><small>Tự gõ câu lệnh riêng.</small></button>
        </div>
      </div>

      <div className="th-phai">
        {dangChon && <div className="th-dang">{dangChon.anh && <img src={dangChon.anh} alt="Ảnh minh hoạ mẫu" />}
          <div><b>{dangChon.ten}</b> <code>{dangChon.lenh}</code><p>{dangChon.giai}</p>
            {dangChon.tacGia && <small>Mẫu từ awesome-gpt4o-images: {dangChon.tacGia}{dangChon.nguon && <> · <a href={dangChon.nguon} onClick={e => { e.preventDefault(); void bridge?.moLink?.(dangChon.nguon!); }}>nguồn</a></>}</small>}</div></div>}
        <label>Câu lệnh (tự điền theo phong cách, sửa được)
          <textarea rows={8} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Chọn một phong cách bên trái, hoặc tự gõ câu lệnh…" /></label>
        <label>Ghi chú thêm (tuỳ chọn)
          <input value={them} onChange={e => setThem(e.target.value)} placeholder="vd. nền xanh lá, thêm chữ 'Duy TTD' trên cùng" /></label>
        <div className="th-hang">
          <label>Khung <select value={ratio} onChange={e => setRatio(e.target.value)}>{ratios.map(r => <option key={r}>{r}</option>)}</select></label>
          <label>Số ảnh <select value={so} onChange={e => setSo(Number(e.target.value))}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
          <button className="primary" disabled={!anh || !prompt.trim() || busy} onClick={tao} title={!anh ? 'Chọn ảnh trước' : !prompt.trim() ? 'Chọn phong cách hoặc gõ câu lệnh' : 'Gửi sang Codex Business'}>
            {busy ? <Loader2 size={15} className="th-quay" /> : <ImagePlus size={15} />} {busy ? 'Đang vẽ…' : 'Tạo'}</button>
        </div>
        {busy && <p className="th-buoc">{buoc || 'Codex đang vẽ, thường 1–3 phút mỗi ảnh…'}</p>}
        {error && <p className="th-loi">{error}</p>}

        {ketQua.length > 0 && <><h3>Kết quả</h3>
          <div className="th-ket">{ketQua.filter(k => k.dataUrl).map((k, i) => <figure key={(k.file || '') + i}>
            <img src={k.dataUrl} alt="" onClick={() => k.file && bridge?.taoHinhMo?.(k.file)} title="Bấm để mở thư mục chứa ảnh" />
            <figcaption>{k.file?.split(/[\\/]/).pop()}<small>{k.account}</small></figcaption></figure>)}</div></>}
      </div>
    </div>
  </section>;
}
