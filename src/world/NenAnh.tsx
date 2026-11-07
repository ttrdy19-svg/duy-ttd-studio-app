import { useEffect, useRef } from 'react';

// Nền ảnh màn hình chính (chủ tịch 05/11/2026: mô hình 3D "tuột mood" → lấy ảnh cây tinh tú làm nền).
// Ảnh phủ kín (cover) trong một "sân khấu" giữ đúng tỉ lệ 1280×853, nên quả cầu sáng đặt theo % ảnh luôn trúng chỗ.
// Hiệu ứng nhẹ (tắt được): thị sai 2 lớp khi rê chuột (lớp trước = mặt nạ mỏm đá + cô gái), quả cầu thở sáng, đom đóm/sao bay chậm.
export const NEN_ANH = `${import.meta.env.BASE_URL}nen/cay-tinh-tu.jpg`;
const W = 1280, H = 853;
// Vị trí quả cầu/đèn lồng trên ảnh gốc (px), r = bán kính quầng sáng.
const ORBS: [number, number, number][] = [
  [375, 205, 52], [85, 213, 30], [468, 340, 40], [270, 370, 32], [622, 255, 26], [655, 215, 20],
  [1038, 148, 40], [1192, 163, 26], [740, 35, 24], [1118, 235, 22], [173, 225, 12], [1045, 340, 14], [410, 290, 12],
];

export default function NenAnh({ hieuUng, tamDung }: { hieuUng: boolean; tamDung?: boolean }) {
  const stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const chay = hieuUng && !tamDung;
  // Thị sai: chuột lệch tâm bao nhiêu thì lớp sau/lớp trước dịch theo (làm mượt bằng lerp, chỉ đổi biến CSS, không render lại React).
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (!chay) { el.style.setProperty('--px', '0'); el.style.setProperty('--py', '0'); return; }
    let tx = 0, ty = 0, x = 0, y = 0, frame = 0;
    const move = (e: MouseEvent) => { tx = e.clientX / window.innerWidth * 2 - 1; ty = e.clientY / window.innerHeight * 2 - 1; };
    const tick = () => {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      el.style.setProperty('--px', x.toFixed(4)); el.style.setProperty('--py', y.toFixed(4));
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', move);
    frame = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(frame); };
  }, [chay]);
  // Hạt sáng: canvas 2D, ~70 hạt, 30 khung/giây, độ phân giải 1× — nhẹ cho GTX 1650.
  useEffect(() => {
    const c = canvas.current, g = c?.getContext?.('2d');
    if (!c || !g || !chay) { if (c && g) g.clearRect(0, 0, c.width, c.height); return; }
    const size = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    size();
    const n = Math.round(Math.min(90, Math.max(40, c.width * c.height / 26000)));
    const dots = Array.from({ length: n }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height, r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.25, vy: -0.08 - Math.random() * 0.3, p: Math.random() * Math.PI * 2, s: 0.01 + Math.random() * 0.03,
      warm: Math.random() < 0.6,
    }));
    let frame = 0, last = 0;
    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      if (t - last < 33) return;
      last = t;
      g.clearRect(0, 0, c.width, c.height);
      for (const d of dots) {
        d.x += d.vx + Math.sin(d.p) * 0.15; d.y += d.vy; d.p += d.s;
        if (d.y < -10) { d.y = c.height + 10; d.x = Math.random() * c.width; }
        if (d.x < -10) d.x = c.width + 10; else if (d.x > c.width + 10) d.x = -10;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(d.p));
        const color = d.warm ? '255,226,160' : '220,230,255';
        g.fillStyle = `rgba(${color},${(a * 0.18).toFixed(3)})`;
        g.beginPath(); g.arc(d.x, d.y, d.r * 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = `rgba(${color},${a.toFixed(3)})`;
        g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
      }
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener('resize', size);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', size); };
  }, [chay]);
  const img = { backgroundImage: `url("${NEN_ANH}")` };
  return <div className={`nen-anh ${chay ? 'dong' : 'tinh'}`} data-nen="cay-tinh-tu" aria-hidden="true">
    <div className="nen-stage" ref={stage}>
      <div className="nen-lop nen-sau" style={img} />
      {hieuUng && <div className="nen-cau">{ORBS.map(([x, y, r], i) => <i key={i} style={{ left: `${x / W * 100}%`, top: `${y / H * 100}%`, width: `${r * 2 / W * 100}%`, animationDelay: `${(i * 0.37) % 3}s` }} />)}</div>}
      {hieuUng && <div className="nen-lop nen-truoc" style={img} />}
    </div>
    {hieuUng && <canvas className="nen-hat" ref={canvas} />}
    <div className="nen-toi" />
  </div>;
}

// Cài đặt nền lưu ở máy (localStorage): mặc định nền ảnh + có hiệu ứng.
export type CaiDatNen = { cu3d: boolean; hieuUng: boolean };
const KHOA = 'duy.nen-man-hinh';
export function docCaiDatNen(): CaiDatNen {
  try { const v = JSON.parse(localStorage.getItem(KHOA) || '{}'); return { cu3d: v.cu3d === true, hieuUng: v.hieuUng !== false }; }
  catch { return { cu3d: false, hieuUng: true }; }
}
export function luuCaiDatNen(v: CaiDatNen) { try { localStorage.setItem(KHOA, JSON.stringify(v)); } catch { /* máy chặn lưu thì thôi */ } }
