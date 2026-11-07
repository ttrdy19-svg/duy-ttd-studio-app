import { useEffect, useState } from 'react';
import type { SucMayData } from './types';
import './suc-may.css';

export default function SucMay() {
  const [data, setData] = useState<SucMayData>();
  const [error, setError] = useState('');
  const [vang, setVang] = useState(90), [do_, setDo] = useState(95);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const api = window.manorApps;
    if (!api?.sucMay) { setError('Mở ứng dụng desktop để đo sức máy.'); return; }
    let live = true;
    const accept = (d: SucMayData) => { if (live) setData(d); };
    const off = api.onSucMay?.(accept);
    api.sucMay().then(d => { if (live) { setData(d); setVang(d.config.vang); setDo(d.config.do); } }, e => { if (live) setError(String(e)); });
    return () => { live = false; off?.(); };
  }, []);
  async function save(bat: boolean, levels = true) {
    setSaving(true); setError('');
    try { setData(await window.manorApps!.sucMay!({ bat, vang: levels ? vang : data!.config.vang, do: levels ? do_ : data!.config.do })); } catch (e) { setError(String(e)); } finally { setSaving(false); }
  }
  const number = (v: number | null | undefined, suffix = '%') => v == null ? 'Chưa đọc được' : `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}${suffix}`;
  return <section className="suc-may">
    <h1>Sức máy</h1><p>CPU và RAM mỗi 2 giây · GPU mỗi 5 giây · tiến trình mỗi 10 giây · ổ đĩa mỗi phút.</p>
    {error && <p role="alert">{error}</p>}
    {!data ? <p>Đang chờ số đo…</p> : <>
      <div className="sm-gauges">{[
        ['CPU', data.cpu, '%', 'Phần trăm thời gian bộ xử lý bận giữa hai lần đo'],
        ['RAM', data.ram, '%', `${number(data.ramGB, ' GB')} / ${number(data.totalGB, ' GB')} bộ nhớ đang dùng`],
        ['GPU', data.gpu, '%', 'Mức sử dụng card đồ họa NVIDIA'],
        ['Nhiệt GPU', data.nhietGpu, '°C', 'Nhiệt độ card đồ họa NVIDIA'],
      ].map(([label, value, suffix, tip]) => <div key={String(label)} title={String(tip)} className="sm-gauge" style={{ background: `conic-gradient(${Number(value) >= 90 ? '#ef7777' : '#66cfb4'} ${Math.min(100, Number(value) || 0) * 3.6}deg, #243645 0)` }}><div><span>{label}</span><strong>{number(value as number | null, String(suffix))}</strong></div></div>)}</div>
      <p>RAM: {number(data.ramGB, ' GB')} / {number(data.totalGB, ' GB')} · Bộ nhớ đồ họa: {number(data.vram == null ? null : data.vram / 1024, ' GB')} / {number(data.vramTotal == null ? null : data.vramTotal / 1024, ' GB')}</p>
      <p title={data.cpuNote}>Nhiệt CPU: {data.nhietCpu == null ? data.cpuNote : number(data.nhietCpu, '°C')}</p>
      <p>{data.disks.map(d => `Ổ ${d.drive}: ${d.freeGB == null ? 'không đọc được' : number(d.freeGB, ' GB trống')}`).join(' · ')}</p>
      <h2>5 phút gần nhất</h2>
      <svg className="sm-chart" viewBox="0 0 600 130" role="img" aria-label="Biểu đồ CPU, RAM, GPU từ 0 đến 100 phần trăm trong 5 phút">
        {[0, 50, 100].map(n => <g key={n}><line x1="30" x2="600" y1={110 - n} y2={110 - n} stroke="#506070" /><text x="0" y={114 - n} fill="currentColor" fontSize="11">{n}%</text></g>)}
        {(['cpu', 'ram', 'gpu'] as const).map((key, i) => <g key={key}>{data.history.map((p, j, a) => j > 0 && p[key] != null && a[j - 1][key] != null ? <line key={p.luc} x1={30 + (a[j - 1].luc - data.luc + 300000) / 300000 * 570} y1={110 - a[j - 1][key]!} x2={30 + (p.luc - data.luc + 300000) / 300000 * 570} y2={110 - p[key]!} stroke={['#79bbff', '#66cfb4', '#e5b97f'][i]} strokeWidth="2" /> : null)}</g>)}
      </svg><p className="sm-legend">🔵 CPU · 🟢 RAM · 🟠 GPU · trái: 5 phút trước · phải: hiện tại</p>
      <fieldset disabled={saving}><legend>Hãm tải tự động</legend>
        <label title="Dừng nhận việc mới khi mức vàng; mức đỏ chỉ tạm treo Python, ffmpeg, Node thuộc công cụ của studio"><input type="checkbox" checked={data.config.bat} onChange={e => void save(e.target.checked, false)} /> Bật hãm tải</label>
        <label title="RAM từ mức này: các bộ chạy chờ máy bớt tải">Mức vàng (%) <input type="number" min="88" max="98" value={vang} onChange={e => setVang(Number(e.target.value))} /></label>
        <label title="RAM từ mức này: mỗi lượt đo tiến trình, treo tiến trình được phép ăn RAM nhiều nhất">Mức đỏ (%) <input type="number" min={vang + 1} max="99" value={do_} onChange={e => setDo(Number(e.target.value))} /></label>
        <button onClick={() => void save(data.config.bat)}>Lưu mức</button>
      </fieldset>
      <p role="status">{data.config.bat ? `Trạng thái: ${data.muc === 'do' ? 'Đỏ' : data.muc === 'vang' ? 'Vàng' : 'Bình thường'}` : 'Đã tắt hãm tải'} · Đang treo: {data.suspended.length} tiến trình.</p>
      <p>RAM dưới 88%: thả tiến trình. Dưới 85%: nhận việc mới. Tạm treo dừng tính toán, thường không giải phóng RAM ngay.</p>
      {data.cocCocApp > 0 && <p>Cốc Cốc của app: {data.cocCocApp} tiến trình; chỉ theo dõi.</p>}
      {Object.values(data.errors).map(e => <p role="alert" key={e}>{e}</p>)}
      <h2>8 nhóm tiến trình dùng nhiều RAM nhất</h2><table><thead><tr><th>Tên tiến trình</th><th>Số lượng</th><th>RAM</th></tr></thead><tbody>{data.top.map(p => <tr key={p.ten}><td>{p.ten}</td><td>×{p.so}</td><td>{number(p.gb, ' GB')}</td></tr>)}</tbody></table>
      <h2>Nhật ký hãm và thả</h2><pre className="sm-log">{data.logs.length ? data.logs.join('\n') : 'Chưa có lần hãm tải nào.'}</pre>
    </>}
  </section>;
}
