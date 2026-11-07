import { useEffect, useId, useRef, useState } from 'react';
import { FolderInput, Upload } from 'lucide-react';
import type { Mon, ThungDoNhap } from './types';
import './thung-do.css';

type Dong = ThungDoNhap & { chon: boolean; trangThai?: 'dang-nhap' | 'xong' | 'loi' | 'da-ghi'; thongBao?: string; thuMuc?: string };
const loi = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const thieu = (m: Dong) => !m.bai.trim() ? 'Thiếu tên bài' : !m.caSi.trim() ? 'Thiếu ca sĩ' : !m.phongCach.trim() ? 'Thiếu phong cách' : '';
const daGhi = (m: Dong) => m.trangThai === 'xong' || m.trangThai === 'da-ghi';
const lyDo = { 'trung-ma-bam': 'Trùng mã băm', 'cung-dung-luong-khac-lufs': 'Cùng dung lượng, khác độ lớn âm thanh', 'cung-thoi-luong': 'Cùng thời lượng' };
// Mã hóa từng đoạn để giữ nguyên ổ đĩa/UNC và các ký tự #, %, ? trong tên file.
const tepUrl = (path: string) => {
  const p = path.replace(/\\/g, '/');
  return (p.startsWith('//') ? 'file:' : 'file:///') + p.split('/').map((s, i) => i === 0 && /^[a-z]:$/i.test(s) ? s : encodeURIComponent(s)).join('/');
};
const thoiLuong = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const dongMoi = (m: Mon): Dong => ({ ...m, ...m.deXuat, loai: /Master(?:\s*\(\d+\))?\.[^.]+$/i.test(m.audio.path) ? 'Master' : 'Gốc', chon: !m.trung.some(t => t.ly_do === 'trung-ma-bam') });

export default function ThungDo() {
  const bridge = window.manorApps;
  const goiY = useId();
  const khoa = useRef(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [rows, setRows] = useState<Dong[]>([]);
  const [active, setActive] = useState('');
  const [caSi, setCaSi] = useState<string[]>([]);
  const [busy, setBusy] = useState<'chon' | 'phan-tich' | 'nhap' | ''>('');
  const [error, setError] = useState('');
  const [tienDo, setTienDo] = useState({ xong: 0, tong: 0 });
  const mon = rows.find(m => m.id === active);
  const duocNhap = rows.filter(m => m.chon && !thieu(m) && !daGhi(m));
  const chanNhap = busy ? 'Đợi thao tác hiện tại hoàn tất' : !bridge ? 'Mở trong ứng dụng máy tính để nhập kho' : !duocNhap.length ? 'Chọn ít nhất một món có đủ tên bài và ca sĩ, chưa nhập kho' : '';

  useEffect(() => {
    let con = true;
    bridge?.catalog().then(c => { if (con) setCaSi([...new Set(c?.songs.map(s => s.singer).filter(Boolean) ?? [])].sort()); }, e => { if (con) setError(`Không đọc được gợi ý ca sĩ: ${loi(e)}`); });
    return () => { con = false; };
  }, [bridge]);

  const sua = (id: string, patch: Partial<Dong>) => setRows(old => old.map(m => m.id === id ? { ...m, ...patch } : m));
  const them = (items: string[]) => { setPaths(old => [...new Set([...old, ...items])]); setError(''); };
  const chon = async () => {
    if (!bridge || khoa.current) return;
    khoa.current = true; setBusy('chon'); setError('');
    try { them(await bridge.thungDoChon()); } catch (e) { setError(loi(e)); }
    finally { khoa.current = false; setBusy(''); }
  };
  const phanTich = async () => {
    if (!bridge || !paths.length || khoa.current) return;
    khoa.current = true; setBusy('phan-tich'); setError('');
    try {
      const result = (await bridge.thungDoPhanTich(paths)).map(dongMoi);
      setRows(result); setActive(result[0]?.id ?? ''); setTienDo({ xong: 0, tong: 0 });
      if (!result.length) setError('Không tìm thấy bản thu trong các file đã chọn.');
    } catch (e) { setError(loi(e)); }
    finally { khoa.current = false; setBusy(''); }
  };
  const nhap = async () => {
    if (!bridge || chanNhap || khoa.current) return;
    khoa.current = true; setBusy('nhap'); setError(''); setTienDo({ xong: 0, tong: duocNhap.length });
    try {
      for (const [i, m] of duocNhap.entries()) {
        sua(m.id, { trangThai: 'dang-nhap', thongBao: '' });
        try {
          const r = await bridge.thungDoNhap({ ...m, bai: m.bai.trim(), caSi: m.caSi.trim(), phongCach: m.phongCach.trim() });
          sua(m.id, { trangThai: 'xong', chon: false, thuMuc: r.thuMuc, thongBao: '✓ Đã nhập. File nguồn đã vào Thùng rác.' });
        } catch (e) {
          const text = loi(e);
          // Lõi đã ghi danh mục nhưng trash lỗi: khóa dòng, tránh thử nhập lại bản đã ghi.
          sua(m.id, { trangThai: text.includes('Đã nhập và kiểm băm') ? 'da-ghi' : 'loi', chon: false, thongBao: text });
        }
        setTienDo({ xong: i + 1, tong: duocNhap.length });
      }
      setPaths([]);
    } finally { khoa.current = false; setBusy(''); }
  };

  return <section className="thung-do" aria-label="Thùng đồ nhập kho">
    <header><h2><FolderInput size={22} /> Thùng đồ</h2><p>Thả file hoặc thư mục → Phân tích → sửa thông tin → nhập kho. Nhập thành công sẽ đưa file nguồn vào Thùng rác.</p></header>
    <div className={`td-drop${busy ? ' td-khoa' : ''}`} title="Kéo file hoặc thư mục từ Explorer vào đây" onDragOver={e => e.preventDefault()} onDrop={e => {
      e.preventDefault(); if (khoa.current) return;
      const files = Array.from(e.dataTransfer.files);
      const items = files.map(f => (f as File & { path?: string }).path).filter((p): p is string => !!p);
      if (items.length) them(items);
      if (items.length !== files.length) setError('Không đọc được đường dẫn một số file kéo thả. Dùng nút Chọn file / thư mục.');
    }}>
      <Upload size={30} /><strong>Kéo thả file / thư mục vào đây</strong>
      <span>Nhạc, ảnh, phụ đề SRT, tài liệu lời DOCX</span>
      <button title={bridge ? 'Chọn nhiều file hoặc chọn thư mục chứa bản thu' : 'Cần mở trong ứng dụng máy tính'} disabled={!!busy || !bridge} onClick={chon}>Chọn file / thư mục</button>
    </div>
    <div className="td-tools"><span title={paths.join('\n')}>{paths.length} đường dẫn chờ phân tích</span>
      <button title={!paths.length ? 'Chọn file hoặc thư mục trước' : 'Đọc thông tin và kiểm trùng với kho nhạc'} disabled={!!busy || !paths.length || !bridge} onClick={phanTich}>Phân tích</button>
      <button title="Bỏ danh sách và kết quả hiện tại để chọn đợt mới" disabled={!!busy || (!rows.length && !paths.length)} onClick={() => { setPaths([]); setRows([]); setActive(''); setError(''); setTienDo({ xong: 0, tong: 0 }); }}>Dọn thùng</button>
      <span title={chanNhap || 'Nhập lần lượt các món đủ thông tin, rồi đưa nguồn vào Thùng rác'}><button className="primary" title={chanNhap || 'Nhập các món đã chọn và đủ thông tin vào kho'} disabled={!!chanNhap} onClick={nhap}>Nhập các món đã chọn ({duocNhap.length})</button></span>
    </div>
    {busy === 'phan-tich' && <div role="status"><progress aria-label="Đang phân tích" /> Đang đọc file, đo âm thanh và kiểm trùng…</div>}
    {busy === 'chon' && <p role="status">Đang chọn file / thư mục…</p>}
    {tienDo.tong > 0 && <div role="status"><progress aria-label="Tiến độ nhập kho" max={tienDo.tong} value={tienDo.xong} /> Đã xử lý {tienDo.xong}/{tienDo.tong} món{busy !== 'nhap' ? ' — xem kết quả từng dòng bên dưới.' : '…'}</div>}
    {error && <p role="alert" className="td-error">{error}</p>}
    <datalist id={goiY}>{caSi.map(s => <option key={s} value={s} />)}</datalist>
    <div className="td-body"><div className="td-table-wrap">
      <table><caption>{rows.length} món · {duocNhap.length} món đủ thông tin được chọn để nhập</caption><thead><tr>
        {['Chọn', 'Tên bài', 'Ca sĩ', 'Phong cách', 'Bản thu', 'Thời lượng', 'Độ lớn (LUFS)', 'Suno: mã / ngày tạo', 'Ảnh theo khung', 'Phụ đề / lời', 'Trùng', 'Kết quả'].map(h => <th key={h} scope="col">{h}</th>)}
      </tr></thead><tbody>{rows.map((m, i) => <tr key={m.id} className={`${m.trung.length ? 'td-trung' : ''} ${active === m.id ? 'td-active' : ''}`} onClick={() => setActive(m.id)}>
        <td><input type="checkbox" aria-label={`Chọn món ${i + 1}`} title={thieu(m) || (daGhi(m) ? 'Món đã ghi vào kho' : 'Chọn món để nhập kho')} checked={m.chon} disabled={!!busy || daGhi(m) || !!thieu(m)} onChange={e => sua(m.id, { chon: e.target.checked })} /></td>
        <td><input aria-label={`Tên bài món ${i + 1}`} title="Sửa tên bài" disabled={!!busy || daGhi(m)} value={m.bai} onChange={e => sua(m.id, { bai: e.target.value })} /><button title="Xem lời, ảnh và nghe bản thu ở khung bên phải" onClick={() => setActive(m.id)}>Xem món {i + 1}</button></td>
        <td><input aria-label={`Ca sĩ món ${i + 1}`} title="Nhập ca sĩ hoặc chọn gợi ý từ kho" list={goiY} disabled={!!busy || daGhi(m)} value={m.caSi} onChange={e => sua(m.id, { caSi: e.target.value })} />{thieu(m) && <small className="td-error">{thieu(m)}</small>}</td>
        <td><input aria-label={`Phong cách món ${i + 1}`} title="Sửa phong cách" disabled={!!busy || daGhi(m)} value={m.phongCach} onChange={e => sua(m.id, { phongCach: e.target.value })} /></td>
        <td><select aria-label={`Bản thu món ${i + 1}`} title="Chọn bản Gốc hoặc Master" disabled={!!busy || daGhi(m)} value={m.loai} onChange={e => sua(m.id, { loai: e.target.value as Dong['loai'] })}><option>Gốc</option><option>Master</option></select></td>
        <td>{thoiLuong(m.audio.giay)}</td><td>{m.audio.lufs == null ? 'Chưa đo' : m.audio.lufs.toFixed(1)}</td>
        <td>{m.audio.suno ? <>{m.audio.suno.id}<small>{m.audio.suno.createdAt || 'Chưa có ngày tạo'}</small></> : 'Không có thông tin'}</td>
        <td>{(['16:9', '9:16', '1:1', '4:3', 'khac'] as const).map(k => <small key={k}>{k === 'khac' ? 'Khác' : k}: {m.anh.filter(a => a.khung === k).length}</small>)}</td>
        <td><small>Phụ đề SRT: {m.srt ? 'Có' : 'Không'}</small><small>Lời DOCX: {m.docx ? 'Có' : 'Không'}</small></td>
        <td className={m.trung.length ? 'td-error' : ''} title={m.trung.map(t => `${lyDo[t.ly_do]} (${t.muc === 'kho' ? 'trong kho' : 'trong thùng'}): ${t.file}`).join('\n')}>{m.trung.length ? m.trung.map(t => lyDo[t.ly_do]).filter((v, n, a) => a.indexOf(v) === n).join(' · ') : 'Không'}</td>
        <td className={m.trangThai === 'loi' || m.trangThai === 'da-ghi' ? 'td-error' : ''}>{m.trangThai === 'dang-nhap' ? 'Đang nhập…' : m.thongBao || 'Chưa nhập'}{m.thuMuc && <button title={`Mở thư mục kho: ${m.thuMuc}`} onClick={() => { void bridge?.khoMo(m.thuMuc!).catch(e => setError(loi(e))); }}>{m.thuMuc}</button>}</td>
      </tr>)}</tbody></table>
      {!rows.length && <p className="td-empty">Chọn file / thư mục rồi bấm Phân tích để xem các món.</p>}
    </div><aside aria-label="Chi tiết món">{mon ? <>
      <h3>{mon.bai || 'Chưa có tên bài'}</h3><p>{mon.caSi || 'Chưa có ca sĩ'}</p>
      {!busy && !daGhi(mon) && <div className="td-audios">{(mon.audios?.length ? mon.audios : [mon.audio]).map(a => <label key={a.path}>{a.path.split(/[\\/]/).pop()}<audio controls preload="none" src={tepUrl(a.path)} title="Nghe thử bản thu" onError={() => setError('Không nghe được file nhạc. Kiểm tra file nguồn còn tồn tại và mở bằng ứng dụng máy tính.')} /></label>)}</div>}
      <label>Lời bài hát — sửa chính tả<textarea aria-label="Lời bài hát" rows={12} value={mon.loi} disabled={!!busy || daGhi(mon)} onChange={e => sua(mon.id, { loi: e.target.value })} /></label>
      <div className="td-images">{!busy && !daGhi(mon) && mon.anh.map(a => <figure key={a.path}><img src={tepUrl(a.path)} alt={`Ảnh khung ${a.khung}`} loading="lazy" /><figcaption>{a.khung === 'khac' ? 'Khung khác' : a.khung} · {a.w} × {a.h}</figcaption></figure>)}</div>
      <details><summary>File nguồn ({mon.nguon.length})</summary>{mon.nguon.map(p => <small key={p}>{p}</small>)}</details>
    </> : <p>Bấm một dòng để xem lời, ảnh và nghe thử.</p>}</aside></div>
  </section>;
}
