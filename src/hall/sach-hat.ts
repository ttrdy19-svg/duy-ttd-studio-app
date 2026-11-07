import * as THREE from 'three';

// Hạt sáng của Sổ tài khoản kiểu sách phép (cl-015): bốc lên từ trang sách, bay về từng chùm (mỗi chùm = một profile), rồi lượn quanh chùm.
// Chỉ vẽ hạt (Points + shader nhỏ, ~1100 hạt, tính trên CPU): nhẹ cho GTX 1650. Sách và chùm bấm được là DOM/CSS ở SachPhep.tsx.
// Toạ độ theo % khung (x trái→phải, y trên→dưới), giống vị trí các nút chùm.
export interface DiemChum { x: number; y: number; color: string }
export interface CanhHat { capNhat(chum: DiemChum[]): void; boQua(): void; huy(): void }

const TONG = 1100, NEN = 320;           // tổng số hạt, số hạt bay lơ lửng không thuộc chùm nào
const GOC = { x: 50, y: 74 };           // giữa trang sách đang mở

const VS = `attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC;
void main() { vA = alpha; vC = color; gl_PointSize = size; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FS = `varying float vA; varying vec3 vC;
void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a = a * a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC * (0.7 + a), a); }`;

export function taoHatSach(canvas: HTMLCanvasElement, opts: { chum: DiemChum[]; intro: boolean }): CanhHat | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' }); }
  catch { return null; }
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(ratio);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 100, 100, 0, -1, 1);   // 0..100 theo % khung; y lật ở dưới

  const pos = new Float32Array(TONG * 3), col = new Float32Array(TONG * 3), size = new Float32Array(TONG), alpha = new Float32Array(TONG);
  // Thông số riêng từng hạt: điểm xuất phát trên trang sách, lúc bay, thời gian bay, bán kính/pha quỹ đạo quanh chùm.
  const sx = new Float32Array(TONG), sy = new Float32Array(TONG), tre = new Float32Array(TONG), bay = new Float32Array(TONG);
  const r = new Float32Array(TONG), pha = new Float32Array(TONG), toc = new Float32Array(TONG), hat = new Float32Array(TONG);
  for (let i = 0; i < TONG; i++) {
    sx[i] = GOC.x + (Math.random() - 0.5) * 30; sy[i] = GOC.y + (Math.random() - 0.5) * 6;
    tre[i] = 0.5 + Math.random() * 1.3; bay[i] = 0.9 + Math.random() * 1.1;
    r[i] = 0.6 + Math.random() ** 1.6 * 4.2; pha[i] = Math.random() * Math.PI * 2; toc[i] = (0.25 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1);
    hat[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(geo, mat));

  let chum: DiemChum[] = [];
  const vang = new THREE.Color('#ffd98a'), tam = new THREE.Color();
  const capNhat = (list: DiemChum[]) => {
    chum = list;
    for (let i = 0; i < TONG; i++) {
      const k = i < NEN || !chum.length ? -1 : (i - NEN) % chum.length;
      if (k < 0) tam.copy(vang); else { tam.setStyle(chum[k].color); tam.lerp(new THREE.Color('#ffffff'), hat[i] * 0.35); }
      col.set([tam.r, tam.g, tam.b], i * 3);
      size[i] = (k < 0 ? 2 + hat[i] * 3 : 3 + hat[i] * 7) * ratio;
    }
    geo.attributes.color.needsUpdate = true; geo.attributes.size.needsUpdate = true;
  };
  capNhat(opts.chum);

  let batDau = performance.now() - (opts.intro ? 0 : 10000), w = 0, h = 0, frame = 0, dung = false;
  const doKhung = () => {
    const nw = canvas.clientWidth, nh = canvas.clientHeight;
    if (nw && nh && (nw !== w || nh !== h)) { w = nw; h = nh; renderer.setSize(w, h, false); }
  };
  const ve = () => {
    if (dung) return;
    frame = requestAnimationFrame(ve);
    if (document.hidden) return;
    doKhung();
    const t = (performance.now() - batDau) / 1000;
    for (let i = 0; i < TONG; i++) {
      const k = i < NEN || !chum.length ? -1 : (i - NEN) % chum.length;
      let x: number, y: number, a: number;
      if (k < 0) {
        // Bụi sáng bốc lên từ trang sách rồi tan, lặp mãi.
        const life = (t * (0.08 + hat[i] * 0.1) + hat[i]) % 1;
        x = sx[i] + Math.sin(t * 0.7 + pha[i]) * 3 * life; y = sy[i] - life * 70;
        a = t < tre[i] * 0.6 ? 0 : Math.sin(Math.PI * life) * 0.55;
      } else {
        const c = chum[k], g = pha[i] + t * toc[i];
        const ox = c.x + Math.cos(g) * r[i], oy = c.y + Math.sin(g) * r[i] * 0.75 + Math.sin(t * 0.8 + k) * 0.8;
        const p = Math.min(1, Math.max(0, (t - tre[i]) / bay[i])), e = 1 - (1 - p) ** 3;
        // Bézier bậc hai: từ trang sách vọt lên cao rồi uốn về chùm.
        const cx = (sx[i] + ox) / 2, cy = Math.min(sy[i], oy) - 18, u = 1 - e;
        x = u * u * sx[i] + 2 * u * e * cx + e * e * ox; y = u * u * sy[i] + 2 * u * e * cy + e * e * oy;
        a = p <= 0 ? 0 : Math.min(1, p * 3) * (0.55 + 0.45 * Math.sin(t * (1.5 + hat[i] * 2) + pha[i]));
      }
      pos[i * 3] = x; pos[i * 3 + 1] = 100 - y; alpha[i] = a;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.alpha.needsUpdate = true;
    renderer.render(scene, camera);
  };
  ve();
  return {
    capNhat,
    boQua() { batDau = Math.min(batDau, performance.now() - 10000); },
    huy() { dung = true; cancelAnimationFrame(frame); geo.dispose(); mat.dispose(); renderer.dispose(); },
  };
}
