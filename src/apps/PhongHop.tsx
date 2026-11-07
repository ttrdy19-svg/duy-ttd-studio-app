import { useEffect, useRef, useState } from 'react';
import type { PhongHopConfig, PhongHopData, PhongHopLine, PhongHopRequest } from './types';
import './phong-hop.css';

const clock = (t: number) => new Date(t).toLocaleTimeString('vi-VN', { hour12: false });
const states: Record<string, string> = { 'dang-hop': 'Đang họp', 'cho-chu-tich': 'Tới lượt Chủ tịch', 'tam-dung': 'Tạm dừng', 'ket-thuc': 'ĐÃ CHỐT', 'chi-doc': 'Biên bản cũ · chỉ đọc' };

// Điểm gắn ở màn hình chính, tiếp tục nghe trạng thái cả khi đóng phòng.
export function PhongHopHome({ openRequest = 0 }: { openRequest?: number }) {
  const [open, setOpen] = useState(false), [data, setData] = useState<PhongHopData | null>(null);
  useEffect(() => {
    let alive = true, version = 0;
    const off = window.manorApps?.onPhongHop?.(d => { version++; if (alive) setData(d); });
    void window.manorApps?.phongHop?.().then(d => { if (alive && !version) setData(d); }).catch(() => {});
    return () => { alive = false; off?.(); };
  }, []);
  useEffect(() => { if (openRequest) setOpen(true); }, [openRequest]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  return <>
    <button className={`ph-home ${data?.dangHop ? 'ph-active' : ''}`} aria-label={`Phòng họp · ${data?.yCho || 0} ý chờ`} onClick={() => setOpen(true)} title="Phòng họp & bảng việc · bộ não của app">
      <span aria-hidden="true">🏮</span><b>Phòng họp</b>{data?.dangHop && <i aria-label="Đang họp" />}<small>{data?.yCho || 0} ý chờ</small>
    </button>
    {open && <section className="ph-home-panel" role="dialog" aria-modal="true" aria-label="Phòng họp và bảng việc">
      <button className="ph-home-close" aria-label="Đóng Phòng họp" onClick={() => setOpen(false)}>Đóng ×</button>
      <PhongHop key={openRequest} initialRoomId={data?.cuocHop?.id} />
    </section>}
  </>;
}
export default function PhongHop({ initialRoomId }: { initialRoomId?: string } = {}) {
  const [data, setData] = useState<PhongHopData | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(''), [text, setText] = useState(''), [message, setMessage] = useState('');
  const [selected, setSelected] = useState<number | null>(null), [note, setNote] = useState('');
  const [settings, setSettings] = useState<PhongHopConfig | null>(null), [now, setNow] = useState(Date.now());
  const roomId = useRef<string | undefined>(initialRoomId), requestNo = useRef(0), streamVersion = useRef(0), alive = useRef(true);
  const room = data?.cuocHop, line = room?.dong.find(l => l.id === selected);
  const lines = useRef(new Map<number, HTMLButtonElement>()), log = useRef<HTMLDivElement>(null), follow = useRef(true);
  async function send(req: PhongHopRequest = {}) {
    const api = window.manorApps?.phongHop;
    if (!api) { setError('Mở bản desktop để dùng Phòng họp.'); return false; }
    const n = ++requestNo.current, version = streamVersion.current;
    setBusy(true);
    try {
      const result = await api({ id: roomId.current, ...req });
      if (!alive.current || n !== requestNo.current) return false;
      // Sự kiện mới có thể tới trước câu trả lời IPC; đừng ghi đè bằng ảnh chụp cũ.
      if (version === streamVersion.current || result.cuocHop?.id !== roomId.current) setData(result);
      roomId.current = result.cuocHop?.id; setError(''); return true;
    } catch (e) { if (alive.current && n === requestNo.current) setError(e instanceof Error ? e.message : String(e)); return false; }
    finally { if (alive.current && n === requestNo.current) setBusy(false); }
  }
  useEffect(() => {
    alive.current = true;
    const off = window.manorApps?.onPhongHop?.(incoming => {
      streamVersion.current++;
      if (!roomId.current || incoming.cuocHop?.id === roomId.current) {
        roomId.current = incoming.cuocHop?.id; setData(incoming);
      } else setData(prev => prev ? { ...prev, danhSach: incoming.danhSach, config: incoming.config, bangViec: incoming.bangViec } : prev);
    });
    void send();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive.current = false; off?.(); clearInterval(timer); };
  }, []);
  useEffect(() => { if (follow.current && log.current) log.current.scrollTop = log.current.scrollHeight; }, [room?.dong.length]);
  function scroll(id: number) { lines.current.get(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); }
  const participants = data?.config.thanhVien || [];
  function renderLine(l: PhongHopLine) {
    return <button ref={el => { if (el) lines.current.set(l.id, el); else lines.current.delete(l.id); }} className={`ph-line ph-${l.quyetDinh}`} key={l.id}
      title={l.ai === 'chu-tich' ? 'Ý kiến của Chủ tịch' : `Dòng #${l.id}: bấm để OK hoặc ghi chú. Không xử lý sẽ PASS khi sang vòng hoặc kết thúc.`}
      onClick={() => { if (l.ai !== 'chu-tich') { setSelected(l.id); setNote(l.ghiChu || ''); } }}>
      <span className="ph-meta">#{l.id} · {clock(l.luc)} · {participants.find(p => p.id === l.ai)?.ten || l.ai} · <b>{l.loai}</b> · Vòng {l.vong}</span>
      <span>{l.noiDung}</span>{l.traLoi && <span className="ph-meta">Trả lời dòng #{l.traLoi}</span>}
      {l.ghiChu && <span className="ph-note">Chủ tịch ghi chú: {l.ghiChu}</span>}
      {l.quyetDinh === 'ok' && <span className="ph-meta">✓ Đã chốt</span>}{l.quyetDinh === 'pass' && <span className="ph-meta">PASS</span>}
    </button>;
  }
  return <main className="ph-app">
    <header className="ph-header"><div><small>MỘC NGƯ QUÁN · BỘ NÃO CỦA APP</small><h1>Phòng họp</h1><p>Mỗi ý một dòng · Chủ tịch quyết từng ý</p></div>
      <button title="Đổi tên, ảnh đại diện, vai, model và thứ tự thành viên" disabled={!data || busy} onClick={() => setSettings(structuredClone(data!.config))}>Thành viên & thứ tự</button></header>
    {error && <p role="alert" className="ph-error">{error}</p>}
    <div className="ph-layout"><aside className="ph-history"><h2>Cuộc họp</h2>
      <form onSubmit={e => { e.preventDefault(); void send({ action: 'mo', tieuDe: title, noiDung: text }).then(ok => { if (ok) { setTitle(''); setText(''); setSelected(null); } }); }}>
        <label>Tên cuộc họp<input value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} /></label>
        <label>Yêu cầu mở họp<textarea value={text} onChange={e => setText(e.target.value)} required /></label>
        <button disabled={busy || !title.trim() || !text.trim()} title="Tạo biên bản mới; bấm Vòng mới để gọi các thành viên">Mở cuộc họp</button>
      </form>
      <nav aria-label="Cuộc họp cũ">{data?.danhSach.map(m => <button key={m.id} disabled={busy || m.trangThai === 'loi'} aria-current={room?.id === m.id ? 'page' : undefined}
        onClick={() => { setSelected(null); void send({ action: 'xem', id: m.id }); }} title={m.tieuDe}>{m.tieuDe}<small>{states[m.trangThai] || m.trangThai}</small></button>)}</nav>
    </aside><section className="ph-main">
      {room ? <><div className="ph-heading"><div><h2>{room.tieuDe}</h2><p role="status">{states[room.trangThai] || room.trangThai} · Vòng {room.vong}</p></div>
        {!room.cu && <div className="ph-actions"><button disabled={busy || room.trangThai === 'dang-hop'} onClick={() => void send({ action: 'vong' })} title="Ý chưa xử lý thành PASS. OK không bàn lại; ghi chú bắt buộc trả lời vòng sau.">{room.trangThai === 'tam-dung' ? 'Tiếp tục vòng' : 'Vòng mới'}</button>
          <button disabled={busy || room.trangThai !== 'dang-hop'} onClick={() => void send({ action: 'tam-dung' })} title="Hoàn tất người đang nói rồi dừng trước người tiếp theo">Tạm dừng</button>
          <button disabled={busy || room.trangThai === 'ket-thuc'} onClick={() => { setSelected(null); void send({ action: 'ket-thuc' }); }} title="Ý chưa xử lý thành PASS; lưu Đã chốt thành danh sách việc trong biên bản">Kết thúc / Giải tán</button></div>}</div>
        {room.cu ? <pre className="ph-old">{room.markdown}</pre> : <>
          <div className="ph-scene" aria-label="Bàn họp cổ phong"><div className="ph-table" aria-hidden="true"><span>Mộc Ngư Quán</span><span>🍵</span></div>
            {participants.map((p, index) => {
              const last = [...room.dong].reverse().find(l => l.ai === p.id), thinking = room.dangNoi?.ai === p.id;
              return <article key={p.id} className={`ph-seat ph-seat-${index} ${index === 0 ? 'ph-chair' : ''}`}>
                <button className={`ph-bubble ${thinking ? 'ph-thinking' : ''}`} title={thinking ? 'Đang chờ phản hồi của thành viên' : last?.noiDung || 'Chưa phát biểu'} onClick={() => { if (last) scroll(last.id); }}>
                  {thinking ? <span>Đang nghĩ<span className="ph-dots">…</span> · {Math.max(0, Math.floor((now - room.dangNoi!.tu) / 1000))} giây</span> : room.vang?.[p.id] ? `vắng — ${room.vang[p.id]}` : last ? <><span>{last.noiDung}</span><time>{clock(last.luc)}</time></> : 'Chờ tới lượt'}</button>
                <div className="ph-avatar" title={`${p.ten} · ${p.vai}`}>{p.anh ? <img src={p.anh} alt={p.ten} /> : <span>{p.bieuTuong}</span>}</div><strong>{p.ten}</strong><small title={p.vai}>{p.vai}</small>{p.ghiChu && <small title={p.ghiChu}>{p.ghiChu}</small>}
                {index === 0 && <form className="ph-chair-chat" onSubmit={e => { e.preventDefault(); void send({ action: 'noi', noiDung: message }).then(ok => { if (ok) setMessage(''); }); }}>
                  <label>Khung riêng Chủ tịch<textarea aria-label="Ý kiến Chủ tịch" placeholder="Gõ ý bất cứ lúc nào…" value={message} onChange={e => setMessage(e.target.value)} /></label>
                  <button disabled={busy || !message.trim() || room.trangThai === 'ket-thuc'} title="Thêm ngay vào chat tổng; người nói kế tiếp phải đọc">Gửi ý kiến</button>
                  <small aria-live="polite">{room.dangNoi ? `${participants.find(p => p.id === room.dangNoi?.ai)?.ten} đang trả lời` : room.dong.length ? `Mới nhất: ${participants.find(p => p.id === room.dong.at(-1)?.ai)?.ten} · ${clock(room.dong.at(-1)!.luc)}` : 'Chưa có phản hồi'}</small>
                </form>}
              </article>;
            })}
          </div>
          <h2>Khung chat tổng <small>{room.dong.length} dòng</small></h2>
          <div className="ph-log" role="log" aria-live="polite" ref={log} onScroll={() => { const el = log.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>{room.dong.map(renderLine)}</div>
          <section className="ph-decided"><h2>Đã chốt · danh sách việc</h2><ul>{room.dong.filter(l => l.quyetDinh === 'ok').map(l => <li key={l.id}>#{l.id} {l.noiDung}</li>)}</ul>
            {room.trangThai === 'ket-thuc' && <button disabled={busy || room.dangVietThe || !room.dong.some(l => l.quyetDinh === 'ok')} onClick={() => void send({ action: 'viet-the' })} title="Kết thúc tự gọi Claude viết nháp thẻ; bấm để viết lại khi cần">{room.dangVietThe ? 'Claude đang viết thẻ…' : 'Claude viết thẻ'}</button>}
            {room.loiThe && <p role="alert">Claude chưa viết được thẻ: {room.loiThe}. Danh sách đã chốt vẫn được lưu.</p>}
            {room.theViec && <pre>{room.theViec}</pre>}
          </section>{room.loi && <p role="alert">{room.loi}</p>}
        </>}
      </> : <p>Chọn cuộc họp cũ hoặc mở cuộc họp mới để bắt đầu.</p>}
    </section><aside className="ph-tasks" aria-label="Bảng việc thời gian thực"><h2>Bảng việc thời gian thực</h2>
      {[false, true].map(done => <section key={String(done)}><h2>{done ? 'Đã hoàn thành' : 'Cần làm'}</h2>
        <ul>{(data?.bangViec || []).filter(t => t.xong === done).map(t => <li key={t.id}>
          <label><input type="checkbox" checked={t.xong} disabled={busy} onChange={e => void send({ action: 'viec-xong', viec: t.id, xong: e.target.checked })} />
            <span className="ph-task-text" title={t.noiDung}>{t.noiDung}</span></label>
          <small>{t.ai}{t.ma ? ` · ${t.ma}` : ''} · {typeof t.capNhat === 'number' ? new Date(t.capNhat).toLocaleString('vi-VN') : t.capNhat}</small>
        </li>)}</ul>{!(data?.bangViec || []).some(t => t.xong === done) && <p>Chưa có việc.</p>}
      </section>)}
    </aside></div>
    {line && <div className="ph-overlay" onClick={() => setSelected(null)}><section className="ph-dialog" role="dialog" aria-modal="true" aria-label={`Xử lý dòng #${line.id}`} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setSelected(null); } }}>
      <h2>Dòng #{line.id} · {participants.find(p => p.id === line.ai)?.ten}</h2><p>{line.noiDung}</p>
      <label>Ghi chú còn vấn đề<textarea autoFocus value={note} onChange={e => setNote(e.target.value)} /></label>
      <div className="ph-actions"><button disabled={busy} onClick={() => void send({ action: 'quyet-dinh', dong: line.id, quyetDinh: 'ok' }).then(ok => { if (ok) setSelected(null); })} title="Ghi vào Đã chốt và loại khỏi đề bài các lượt sau">OK · Đã chốt</button>
        <button disabled={busy || !note.trim()} onClick={() => void send({ action: 'quyet-dinh', dong: line.id, quyetDinh: 'ghi-chu', ghiChu: note }).then(ok => { if (ok) setSelected(null); })} title="Vòng sau bắt buộc trả lời ghi chú này">Lưu ghi chú</button>
        <button onClick={() => setSelected(null)} title="Không quyết định; tự PASS khi Vòng mới hoặc Kết thúc">Đóng · Không làm gì</button></div>
    </section></div>}
    {settings && <div className="ph-overlay"><form role="dialog" aria-modal="true" aria-label="Cấu hình thành viên" className="ph-dialog ph-settings" onSubmit={e => { e.preventDefault(); void send({ action: 'cau-hinh', config: settings }).then(ok => { if (ok) setSettings(null); }); }}>
      <h2>Thành viên & thứ tự</h2><p>Thành viên tự đặt tên khi nói lần đầu. Sửa tên ở đây sẽ giữ tên mày chọn.</p>
      {settings.thanhVien.map((p, i) => <fieldset key={p.id}><legend>{p.id}</legend>
        <label>Tên<input value={p.ten} onChange={e => setSettings({ ...settings, thanhVien: settings.thanhVien.map((x, j) => j === i ? { ...x, ten: e.target.value } : x) })} /></label>
        <label>Vai<input value={p.vai} onChange={e => setSettings({ ...settings, thanhVien: settings.thanhVien.map((x, j) => j === i ? { ...x, vai: e.target.value } : x) })} /></label>
        {p.id !== 'chu-tich' && <label>Model<input value={p.model || ''} onChange={e => setSettings({ ...settings, thanhVien: settings.thanhVien.map((x, j) => j === i ? { ...x, model: e.target.value } : x) })} /></label>}
        <button type="button" disabled={busy} onClick={() => void send({ action: 'anh', ai: p.id }).then(ok => { if (ok) setSettings(null); })} title="Chọn ảnh từ máy, lưu bản sao trong dữ liệu app">Chọn ảnh đại diện</button>{p.ghiChu && <small>{p.ghiChu}</small>}
      </fieldset>)}
      <p>Chủ tịch → Claude mở vòng →</p>{settings.thuTu.slice(1, -1).map((id, i) => <label key={i}>Lượt {i + 2}<select value={id} onChange={e => { const order = [...settings.thuTu], j = order.indexOf(e.target.value); [order[i + 1], order[j]] = [order[j], order[i + 1]]; setSettings({ ...settings, thuTu: order }); }}>{settings.thanhVien.filter(p => !['chu-tich', 'claude'].includes(p.id)).map(p => <option value={p.id} key={p.id}>{p.ten}</option>)}</select></label>)}<p>→ Claude tóm tắt → Chủ tịch</p>
      <div className="ph-actions"><button disabled={busy}>Lưu cấu hình</button><button type="button" onClick={() => setSettings(null)}>Đóng</button></div>
    </form></div>}
  </main>;
}
