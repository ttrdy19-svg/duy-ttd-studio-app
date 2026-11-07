import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import type { WorldRole } from '../apps/types';
import { staff } from './navigation';

// Đảo hình thoi đứng bay giữa biển mây: đỉnh nhọn là ngọn núi sau Đại sảnh, đáy nhọn là khối đá treo.
// Ba tầng bậc thang: trên cùng Đại sảnh + sân rộng + hồ; tầng giữa Họa thất, Lưu Ảnh Thất; tầng dưới Phòng trưng bày, Tàng Âm Các.
// Thác chảy từ hồ đổ xuống từng tầng rồi rơi khỏi mũi đảo vào hư không; cầu thang hai bên thác nối các tầng.
export type LoadRole = (role: WorldRole) => Promise<ArrayBuffer[]>;
// Mô hình VRM của Minh Nhi (con nhóc đi lang thang trên đảo); không có thì dùng mô hình trong thư mục file mẫu.
export type LoadVrm = () => Promise<ArrayBuffer>;

// Mỗi tầng là một khối hình thoi (nhìn từ trên xuống) tâm (0, z), nửa đường chéo a, mặt trên ở độ cao y.
const TIERS = [{ y: 0, z: 0, a: 24 }, { y: 5, z: -6, a: 15 }, { y: 10, z: -11, a: 9 }];
const TOP = 27, BOTTOM = -36;
const PLACES: { id: string; role: WorldRole; x: number; y: number; z: number; footprint: number }[] = [
  { id: 'hall', role: 'dai-sanh', x: 0, y: 10, z: -13.6, footprint: 8 },
  { id: 'art', role: 'hoa-that', x: -8.6, y: 5, z: -4.5, footprint: 6 },
  { id: 'workshop', role: 'luu-anh-that', x: 8.6, y: 5, z: -4.5, footprint: 6 },
  { id: 'study', role: 'phong-trung-bay', x: -10.5, y: 0, z: 8, footprint: 6.5 },
  { id: 'library', role: 'tang-am-cac', x: 10.5, y: 0, z: 8, footprint: 6.5 },
];
// Lối đi (có độ cao: nhân vật leo cầu thang giữa các tầng). Cầu thang là các cạnh nối hai tầng.
const NODES: { x: number; y: number; z: number; links: number[] }[] = [
  { x: -3.3, y: 0, z: 13, links: [2, 4, 18] }, { x: 3.3, y: 0, z: 13, links: [3, 5, 19] },
  { x: -7, y: 0, z: 11, links: [0] }, { x: 7, y: 0, z: 11, links: [1] },
  { x: -3.3, y: 0, z: 11, links: [0, 6] }, { x: 3.3, y: 0, z: 11, links: [1, 7] },
  { x: -3.3, y: 5, z: 5.8, links: [4, 8] }, { x: 3.3, y: 5, z: 5.8, links: [5, 9] },
  { x: -3.3, y: 5, z: 1, links: [6, 10, 12] }, { x: 3.3, y: 5, z: 1, links: [7, 11, 13] },
  { x: -6, y: 5, z: -1.2, links: [8] }, { x: 6, y: 5, z: -1.2, links: [9] },
  { x: -3.3, y: 5, z: 0, links: [8, 14] }, { x: 3.3, y: 5, z: 0, links: [9, 15] },
  { x: -3.3, y: 10, z: -5, links: [12, 16] }, { x: 3.3, y: 10, z: -5, links: [13, 17] },
  { x: -2.6, y: 10, z: -8.8, links: [14, 17] }, { x: 2.6, y: 10, z: -8.8, links: [15, 16] },
  { x: -3.3, y: 0, z: 18.5, links: [0] }, { x: 3.3, y: 0, z: 18.5, links: [1] },
];
const STAIRS = [[4, 6], [5, 7], [12, 14], [13, 15]];

function noise(x: number, y: number, z: number) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void, repeat = 1) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'); if (ctx) paint(ctx, size);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat); texture.anisotropy = 8;
  return texture;
}
const speckle = (base: string, colors: string[], count: number, radius: number) => (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < count; i++) { ctx.globalAlpha = 0.15 + noise(i, 1, 2) * 0.35; ctx.fillStyle = colors[i % colors.length]; ctx.beginPath(); ctx.arc(noise(i, 2, 3) * size, noise(i, 5, 7) * size, 1 + noise(i, 9, 1) * radius, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
};
// Hình thoi bo góc trong mặt phẳng XZ (shape dùng trục y = -z để sau khi xoay nằm đúng hướng).
function rhombus(cz: number, a: number, corner = Math.min(5, a * 0.3)) {
  const shape = new THREE.Shape(), pts = [[0, cz - a], [a, cz], [0, cz + a], [-a, cz]];
  for (let i = 0; i < 4; i++) {
    const [x, z] = pts[i], [px, pz] = pts[(i + 3) % 4], [nx, nz] = pts[(i + 1) % 4];
    const back = new THREE.Vector2(px - x, pz - z).normalize().multiplyScalar(corner), fwd = new THREE.Vector2(nx - x, nz - z).normalize().multiplyScalar(corner);
    if (i === 0) shape.moveTo(x + back.x, -(z + back.y)); else shape.lineTo(x + back.x, -(z + back.y));
    shape.quadraticCurveTo(x, -z, x + fwd.x, -(z + fwd.y));
  }
  shape.closePath(); return shape;
}

const WATER_VERTEX = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }';
// Nước chảy: vệt sáng đứt khúc trôi theo chiều dài dải nước; thác chảy nhanh hơn, fade = 1 thì tan dần vào mây.
const WATER_FRAGMENT = `uniform float time; uniform float speed; uniform float fade; uniform float shade; uniform vec3 deep; uniform vec3 light; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
void main(){ float column = floor(vUv.x * 22.0); float flow = vUv.y * 9.0 - time * speed * (0.8 + h(vec2(column, 3.0)) * 0.5);
  float streak = smoothstep(0.62, 1.0, sin(flow * 2.4 + h(vec2(column, 7.0)) * 6.28) * 0.5 + 0.5) * (0.55 + h(vec2(column, 11.0)) * 0.45);
  float foam = step(0.985, h(floor(vec2(vUv.x * 40.0, flow * 6.0)))) * 0.8; vec3 c = mix(deep, light, streak * 0.55 + foam);
  float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x); float a = mix(0.82, 0.92, streak) * mix(1.0, edge, 0.5);
  a *= mix(1.0, smoothstep(1.0, 0.0, vUv.y), fade); gl_FragColor = vec4(c * shade, a); }`;

export function createIsland(host: HTMLElement, labels: HTMLElement, onSelect: (id: string) => void, loadRole: LoadRole, loadNhi?: LoadVrm) {
  const scene = new THREE.Scene();
  const horizon = new THREE.Color('#b9d4ee');
  scene.fog = new THREE.Fog(horizon, 150, 460);
  // Bầu trời đổi màu theo giờ (JS tính sẵn 3 màu đỉnh / giữa / chân trời), ban đêm hiện sao.
  const skyUniforms = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, low: { value: new THREE.Color() }, stars: { value: 0 } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
    vertexShader: 'varying vec3 d; void main(){ d=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform float stars; varying vec3 d; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); } void main(){ float y=d.y; vec3 c=y>0.0?mix(mid,top,smoothstep(0.0,0.6,y)):mix(mid,low,smoothstep(0.0,-0.35,y)); float s=step(0.9975,h(floor(d*260.0)))*smoothstep(0.02,0.25,y)*stars; gl_FragColor=vec4(c+vec3(s),1.0); }',
  })));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(horizon, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-label', 'Đảo bay Mộc Ngư Trang 3D');
  host.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 1000);
  const HOME = { position: new THREE.Vector3(38, 30, 62), target: new THREE.Vector3(0, 3, 0) };
  camera.position.copy(HOME.position);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME.target); controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 12; controls.maxDistance = 140; controls.maxPolarAngle = 1.75; controls.minPolarAngle = 0.15;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN; controls.enableZoom = false; controls.update();
  // Phóng to / thu nhỏ: giữ Alt rồi lăn chuột (lăn chuột không có Alt thì bỏ qua).
  const wheel = (e: WheelEvent) => { if (!e.altKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12); };
  renderer.domElement.addEventListener('wheel', wheel, { passive: false });
  function zoomBy(direction: number) {
    const offset = camera.position.clone().sub(controls.target), length = THREE.MathUtils.clamp(offset.length() / direction, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setLength(length)); controls.update();
  }

  const ambient = new THREE.HemisphereLight('#e6f1ff', '#6b5a45', 1.7); scene.add(ambient);
  const sun = new THREE.DirectionalLight('#fff0d8', 3.4);
  sun.position.set(-34, 52, 26); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 160 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; scene.add(sun);
  const rim = new THREE.DirectionalLight('#b8d2ff', 0.9); rim.position.set(25, 10, -30); scene.add(rim);
  const moonlight = new THREE.DirectionalLight('#9fb6ff', 0); scene.add(moonlight);

  const owned: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[]; textures: THREE.Texture[] } = { geometries: [], materials: [], textures: [] };
  const track = <T extends THREE.Mesh | THREE.Sprite>(mesh: T) => { owned.geometries.push(mesh.geometry); owned.materials.push(mesh.material as THREE.Material); return mesh; };
  const tex = <T extends THREE.Texture>(t: T) => { owned.textures.push(t); return t; };
  const mat = <T extends THREE.Material>(m: T) => { owned.materials.push(m); return m; };

  const grass = tex(canvasTexture(512, speckle('#4f8a3a', ['#6fae4b', '#3f7a2e', '#86c35c', '#5c9a3e', '#7a6a3a'], 3200, 3))); grass.repeat.set(0.1, 0.1);
  const cliff = tex(canvasTexture(256, speckle('#8a7a66', ['#6d604f', '#a29076', '#5a4f43', '#7d8a5e'], 1600, 4))); cliff.repeat.set(0.18, 0.3);
  const stone = tex(canvasTexture(256, speckle('#9b968a', ['#7a766c', '#b3ae9f', '#66625a'], 1400, 3), 2));
  const grassMaterial = mat(new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
  const cliffMaterial = mat(new THREE.MeshStandardMaterial({ map: cliff, roughness: 1 }));
  const stoneMaterial = mat(new THREE.MeshStandardMaterial({ map: stone, roughness: 0.9 }));
  const rockMaterial = mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));

  // --- Ba tầng: mặt cỏ + vách đá (khối đùn hình thoi). Tầng dưới cùng có vách dày, dưới nữa là khối đá nhọn tới đáy ---
  for (const [i, tier] of TIERS.entries()) {
    const shape = rhombus(tier.z, tier.a);
    const top = track(new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), grassMaterial)); top.rotation.x = -Math.PI / 2; top.position.y = tier.y + 0.01; top.receiveShadow = true; scene.add(top);
    const depth = i === 0 ? 3 : tier.y - TIERS[i - 1].y + 0.4;
    // Khối đùn xoay +90° quanh X nên trục y của hình thành +z: dựng hình với tâm -z để vách nằm đúng dưới mặt cỏ.
    const wall = track(new THREE.Mesh(new THREE.ExtrudeGeometry(rhombus(-tier.z, tier.a), { depth, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.3, bevelSegments: 2, curveSegments: 24 }), cliffMaterial));
    wall.rotation.x = Math.PI / 2; wall.position.y = tier.y - 0.35; wall.castShadow = wall.receiveShadow = true; scene.add(wall);
  }
  // Khối đá dưới đáy: chóp 4 cạnh lộn ngược (nửa dưới hình thoi), gồ ghề, màu tối dần xuống đáy.
  function jaggedCone(radius: number, height: number, segments: number, up: boolean, seed: number) {
    const g = new THREE.ConeGeometry(1, 1, segments, 16, true); if (!up) g.rotateX(Math.PI); g.translate(0, up ? 0.5 : -0.5, 0);
    const p = g.attributes.position as THREE.BufferAttribute, colors: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), t = up ? y : -y, jag = t > 0.02 && t < 0.98 ? 0.2 * Math.sin(t * Math.PI) : 0;
      p.setXYZ(i, p.getX(i) * (1 + (noise(i, seed, 0) - 0.5) * jag * 2), y * (1 + (noise(i, seed, 1) - 0.5) * 0.06), p.getZ(i) * (1 + (noise(i, seed, 2) - 0.5) * jag * 2));
      const shade = up ? 0.26 + noise(i, seed, 3) * 0.12 - t * 0.05 : 0.42 + noise(i, seed, 3) * 0.16 - t * 0.16; colors.push(shade * (up ? 0.95 : 1.04), shade * (up ? 1 : 0.96), shade * (up ? 0.9 : 0.86));
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals(); owned.geometries.push(g);
    const m = new THREE.Mesh(g, rockMaterial); m.scale.set(radius, height, radius); return m;
  }
  const underside = jaggedCone(1, 1, 4, false, 1); underside.scale.set(TIERS[0].a * 0.98, -BOTTOM - 3, TIERS[0].a * 0.98); underside.position.y = -3.3; scene.add(underside);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.4, r = 0.45 + noise(i, 4, 4) * 0.3, s = jaggedCone(1.4 + noise(i, 1, 1) * 1.6, 5 + noise(i, 2, 2) * 8, 5, false, 10 + i); s.position.set(Math.sin(a) * 24 * r * 0.55, -5, Math.cos(a) * 24 * r * 0.55); scene.add(s); }
  // Ngọn núi sau Đại sảnh: đỉnh nhọn của hình thoi.
  const peak = jaggedCone(1, 1, 7, true, 2); peak.scale.set(8, TOP - 10, 6.5); peak.position.set(0, 9.8, -18); peak.castShadow = true; scene.add(peak);
  for (const [x, h, r] of [[-6, 8, 3.6], [6, 9, 3.4], [-3.5, 12, 3], [3.8, 11, 3]]) { const side = jaggedCone(r, h, 7, true, 20 + x); side.position.set(x, 9.8, -16.8); side.castShadow = true; scene.add(side); }

  // --- Nước: hồ trên tầng cao, thác đổ xuống từng tầng, suối tầng dưới chảy ra mũi đảo rồi rơi vào hư không ---
  // Nước không chịu ánh sáng của cảnh nên tự tối theo trời (shade).
  const waterUniforms: { time: { value: number }; shade: { value: number } }[] = [];
  function water(geometry: THREE.BufferGeometry, speed: number, fade = 0, deep = '#2f7fa6', light = '#c9f2ff') {
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: WATER_VERTEX, fragmentShader: WATER_FRAGMENT, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, shade: { value: 1 }, speed: { value: speed }, fade: { value: fade }, deep: { value: new THREE.Color(deep) }, light: { value: new THREE.Color(light) } } });
    waterUniforms.push(material.uniforms as { time: { value: number }; shade: { value: number } });
    return track(new THREE.Mesh(geometry, material));
  }
  function stream(y: number, z1: number, z2: number, width = 2.4) {
    const strip = water(new THREE.PlaneGeometry(width, z2 - z1), 0.6); strip.rotation.x = -Math.PI / 2; strip.rotation.z = Math.PI; strip.position.set(0, y + 0.07, (z1 + z2) / 2); scene.add(strip);
    for (const side of [-1, 1]) { const g = new THREE.BoxGeometry(0.4, 0.32, z2 - z1); owned.geometries.push(g); const bank = new THREE.Mesh(g, stoneMaterial); bank.position.set(side * (width / 2 + 0.2), y + 0.12, (z1 + z2) / 2); bank.receiveShadow = true; scene.add(bank); }
  }
  function fall(x: number, yTop: number, yBottom: number, z: number, width: number, fade = 0) {
    const sheet = water(new THREE.PlaneGeometry(width, yTop - yBottom), 2.2, fade, '#5aa7c8', '#ffffff'); sheet.position.set(x, (yTop + yBottom) / 2, z); scene.add(sheet);
  }
  const lake = water(new THREE.CircleGeometry(2.6, 40), 0.15, 0, '#2b7aa0', '#bfeaff'); lake.rotation.x = -Math.PI / 2; lake.position.set(0, 10.06, -5.4); scene.add(lake);
  const lakeRim = track(new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.22, 8, 40), stoneMaterial)); lakeRim.rotation.x = Math.PI / 2; lakeRim.position.set(0, 10.1, -5.4); scene.add(lakeRim);
  fall(0, 10.05, 5.05, -2.15, 1.8); stream(5, -2.1, 8.6, 1.8);
  fall(0, 5.05, 0.05, 8.75, 2.2); stream(0, 8.8, 22.6, 2.4);
  fall(0, 0.05, -70, 22.9, 2.4, 1);
  const mistTexture = tex(canvasTexture(128, (ctx, size) => { const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); }));
  const mists: THREE.Sprite[] = [], allMists: THREE.Sprite[] = [];
  const mist = (x: number, y: number, z: number, s: number, o = 0.5) => { const m = track(new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTexture, transparent: true, opacity: o, depthWrite: false }))); m.position.set(x, y, z); m.scale.setScalar(s); scene.add(m); allMists.push(m); return m; };
  mist(0, 5.6, -1.4, 3.2); mist(0, 0.7, 9.5, 3.6);
  for (let i = 0; i < 14; i++) mists.push(mist((noise(i, 1, 9) - 0.5) * 4, -1 - i * 3.5, 23.4 + noise(i, 2, 9) * 1.4, 3 + i * 0.6));

  // --- Sân lát đá trước Đại sảnh, cầu thang hai bên thác, lối đi giữa các nhà ---
  const pathTexture = tex(canvasTexture(256, (ctx, size) => { ctx.fillStyle = '#c3b69c'; ctx.fillRect(0, 0, size, size); ctx.strokeStyle = '#8d806b'; ctx.lineWidth = 3; for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * size / 4); ctx.lineTo(size, i * size / 4); ctx.stroke(); for (let j = 0; j <= 3; j++) { const x = (j + (i % 2) * 0.5) * size / 3; ctx.beginPath(); ctx.moveTo(x, i * size / 4); ctx.lineTo(x, (i + 1) * size / 4); ctx.stroke(); } } }));
  function paving(x: number, y: number, z: number, w: number, l: number, angle = 0) {
    const t = tex(pathTexture.clone()); t.repeat.set(w / 1.8, l / 1.8); t.needsUpdate = true;
    const tile = track(new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })));
    tile.rotation.x = -Math.PI / 2; tile.rotation.z = angle; tile.position.set(x, y + 0.03, z); tile.receiveShadow = true; scene.add(tile);
  }
  paving(0, 10, -9.6, 10, 4.6);
  const isStair = (a: number, b: number) => STAIRS.some(([s, t]) => (s === a && t === b) || (s === b && t === a));
  const linked = new Set<string>();
  NODES.forEach((node, a) => node.links.forEach(b => {
    const key = [a, b].sort().join('-'); if (linked.has(key) || isStair(a, b)) return; linked.add(key);
    const to = NODES[b], dx = to.x - node.x, dz = to.z - node.z; paving((node.x + to.x) / 2, node.y, (node.z + to.z) / 2, 1.6, Math.hypot(dx, dz) + 1.2, -Math.atan2(dx, dz));
  }));
  const wood = mat(new THREE.MeshStandardMaterial({ color: '#8a5a35', roughness: 0.8 }));
  const redwood = mat(new THREE.MeshStandardMaterial({ color: '#9e2f26', roughness: 0.6 }));
  for (const [a, b] of STAIRS) {
    const low = NODES[a], high = NODES[b], steps = 12, rise = (high.y - low.y) / steps, run = (high.z - low.z) / steps;
    for (let s = 0; s < steps; s++) {
      const g = new THREE.BoxGeometry(2, rise * (s + 1), Math.abs(run) + 0.02); owned.geometries.push(g);
      const step = new THREE.Mesh(g, stoneMaterial); step.position.set(low.x, low.y + rise * (s + 1) / 2, low.z + run * (s + 0.5)); step.castShadow = step.receiveShadow = true; scene.add(step);
    }
    for (const side of [-1, 1]) {
      const length = Math.hypot(high.y - low.y, high.z - low.z), g = new THREE.BoxGeometry(0.12, 0.12, length); owned.geometries.push(g);
      const rail = new THREE.Mesh(g, redwood); rail.position.set(low.x + side * 1.05, (low.y + high.y) / 2 + 0.9, (low.z + high.z) / 2); rail.rotation.x = Math.atan2(high.y - low.y, low.z - high.z) * -1; scene.add(rail);
      for (const t of [0, 0.5, 1]) { const pg = new THREE.BoxGeometry(0.14, 0.9, 0.14); owned.geometries.push(pg); const post = new THREE.Mesh(pg, redwood); post.position.set(low.x + side * 1.05, low.y + (high.y - low.y) * t + 0.45, low.z + (high.z - low.z) * t); scene.add(post); }
    }
  }
  for (const [y, z] of [[5, 3.4], [0, 15.5]]) { const g = new THREE.BoxGeometry(2.8, 0.2, 2.2); owned.geometries.push(g); const deck = new THREE.Mesh(g, wood); deck.position.set(0, y + 0.4, z); deck.castShadow = deck.receiveShadow = true; scene.add(deck); for (const side of [-1, 1]) { const rg = new THREE.BoxGeometry(2.8, 0.45, 0.12); owned.geometries.push(rg); const rail = new THREE.Mesh(rg, redwood); rail.position.set(0, y + 0.72, z + side * 1.05); scene.add(rail); } }

  // --- Biển mây dưới đảo và vài đám mây trôi ngang tầm ---
  const cloudTexture = tex(canvasTexture(256, (ctx, size) => { for (let i = 0; i < 9; i++) { const x = size * (0.25 + noise(i, 1, 5) * 0.5), y = size * (0.35 + noise(i, 2, 5) * 0.3), r = size * (0.16 + noise(i, 3, 5) * 0.16); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); } }));
  const clouds: { sprite: THREE.Sprite; speed: number }[] = [];
  for (let i = 0; i < 48; i++) {
    const low = i < 34, sprite = track(new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture, transparent: true, depthWrite: false, opacity: low ? 0.95 : 0.7 })));
    const a = noise(i, 3, 1) * Math.PI * 2, r = low ? 15 + noise(i, 4, 1) * 160 : 60 + noise(i, 5, 1) * 100;
    sprite.position.set(Math.cos(a) * r, low ? -46 - noise(i, 6, 1) * 18 : -6 + noise(i, 7, 1) * 26, Math.sin(a) * r);
    sprite.scale.set(low ? 60 + noise(i, 8, 1) * 50 : 26 + noise(i, 9, 1) * 18, low ? 26 + noise(i, 10, 1) * 16 : 12, 1);
    scene.add(sprite); clouds.push({ sprite, speed: 0.6 + noise(i, 11, 1) * 1.2 });
  }

  // --- Mặt trời nhỏ ở xa, trăng ban đêm, mưa, đèn lồng thắp khi trời tối ---
  const glowTexture = tex(canvasTexture(128, (ctx, size) => { const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); }));
  const sunDisc = track(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: '#fff3d0', transparent: true, depthWrite: false, fog: false }))); sunDisc.scale.setScalar(34); scene.add(sunDisc);
  const moonDisc = track(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: '#dfe8ff', transparent: true, depthWrite: false, fog: false }))); moonDisc.scale.setScalar(20); scene.add(moonDisc);
  const RAIN = 1800, rainPositions = new Float32Array(RAIN * 6);
  for (let i = 0; i < RAIN; i++) { const x = (noise(i, 1, 7) - 0.5) * 80, y = noise(i, 2, 7) * 60 - 15, z = (noise(i, 3, 7) - 0.5) * 80; rainPositions.set([x, y, z, x - 0.08, y - 0.9, z], i * 6); }
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3)); owned.geometries.push(rainGeometry);
  const rain = new THREE.LineSegments(rainGeometry, mat(new THREE.LineBasicMaterial({ color: '#cfd9ea', transparent: true, opacity: 0.55, depthWrite: false }))); rain.visible = false; scene.add(rain);
  const lanterns = PLACES.map((place, i) => { const l = track(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: '#ffb35c', transparent: true, depthWrite: false, opacity: 0 }))); l.position.set(place.x + (i % 2 ? -1 : 1) * place.footprint * 0.32, place.y + 1.6, place.z + place.footprint * 0.45); l.scale.setScalar(1.6); scene.add(l); return l; });

  // Giờ trong ngày: theo đồng hồ máy, hoặc tua nhanh (một ngày đêm trong 6 phút) để xem. Thời tiết: nắng, mây, mưa, hoặc tự đổi.
  type Weather = 'nang' | 'may' | 'mua';
  let timeMode: 'that' | 'nhanh' = 'that', fastHours = new Date().getHours() + new Date().getMinutes() / 60;
  // 'that' = theo thời tiết thật ngoài trời (app báo vào qua setLiveWeather), mặc định khi mở đảo.
  let weatherChoice: Weather | 'tu-dong' | 'that' = 'that', weatherNow: Weather = 'nang', weatherUntil = 0, overcast = 0, wet = 0, live: Weather = 'nang';
  const hoursNow = () => timeMode === 'that' ? new Date().getHours() + new Date().getMinutes() / 60 + new Date().getSeconds() / 3600 : fastHours;
  const C = (hex: string) => new THREE.Color(hex);
  const PALETTE = { day: [C('#2961bd'), C('#8cbdeb'), C('#dbe8f7')], dusk: [C('#3b3f78'), C('#f39a62'), C('#f6c9a0')], night: [C('#03060f'), C('#0b1430'), C('#131a2e')], grey: [C('#5c6470'), C('#8d949e'), C('#a8aeb6')] };
  const tmp = [new THREE.Color(), new THREE.Color(), new THREE.Color()], sunDir = new THREE.Vector3(), cloudTint = new THREE.Color();
  function applySky(step: number, now: number) {
    if (weatherChoice === 'tu-dong' && now > weatherUntil) { const r = Math.random(); weatherNow = r < 0.55 ? 'nang' : r < 0.82 ? 'may' : 'mua'; weatherUntil = now + (8 + Math.random() * 14) * 60000; }
    const want = weatherChoice === 'tu-dong' ? weatherNow : weatherChoice === 'that' ? live : weatherChoice;
    overcast += ((want === 'nang' ? 0 : want === 'may' ? 0.45 : 0.85) - overcast) * Math.min(1, step * 0.6);
    wet += ((want === 'mua' ? 1 : 0) - wet) * Math.min(1, step * 0.6);
    const hours = hoursNow(), angle = (hours - 6) / 12 * Math.PI, elevation = Math.sin(angle);
    sunDir.set(Math.cos(angle) * 0.75, elevation, -0.45).normalize();
    const day = THREE.MathUtils.smoothstep(elevation, -0.12, 0.22), dusk = Math.max(0, 1 - Math.abs(elevation) / 0.28) * (1 - overcast * 0.7);
    for (let i = 0; i < 3; i++) tmp[i].copy(PALETTE.night[i]).lerp(PALETTE.day[i], day).lerp(PALETTE.dusk[i], dusk * 0.75).lerp(PALETTE.grey[i].clone().multiplyScalar(0.25 + 0.75 * day), overcast);
    skyUniforms.top.value.copy(tmp[0]); skyUniforms.mid.value.copy(tmp[1]); skyUniforms.low.value.copy(tmp[2]); skyUniforms.stars.value = (1 - day) * (1 - overcast);
    (scene.fog as THREE.Fog).color.copy(tmp[1]).lerp(tmp[2], 0.5); renderer.setClearColor((scene.fog as THREE.Fog).color);
    (scene.fog as THREE.Fog).far = 460 - wet * 240;
    sunDisc.position.copy(sunDir).multiplyScalar(380); sunDisc.visible = elevation > -0.08; (sunDisc.material as THREE.SpriteMaterial).opacity = (1 - overcast * 0.85);
    (sunDisc.material as THREE.SpriteMaterial).color.set(dusk > 0.3 ? '#ffc58a' : '#fff3d0');
    moonDisc.position.copy(sunDir).multiplyScalar(-380); moonDisc.visible = elevation < 0.1; (moonDisc.material as THREE.SpriteMaterial).opacity = (1 - day) * (1 - overcast * 0.8);
    sun.position.copy(sunDir).multiplyScalar(80); sun.intensity = 3.4 * day * (1 - overcast * 0.7); sun.color.set(dusk > 0.3 ? '#ffc08a' : '#fff0d8');
    moonlight.position.copy(sunDir).multiplyScalar(-80); moonlight.intensity = 0.45 * (1 - day) * (1 - overcast * 0.6);
    ambient.intensity = 0.35 + 1.35 * day * (1 - overcast * 0.35); ambient.color.copy(tmp[1]).lerp(C('#ffffff'), 0.5);
    for (const u of waterUniforms) u.shade.value = 0.22 + 0.78 * day * (1 - overcast * 0.35);
    rim.intensity = 0.9 * day; renderer.toneMappingExposure = 0.9 + 0.15 * day;
    cloudTint.copy(PALETTE.night[2]).lerp(C('#ffffff'), day).lerp(C('#ffd2b0'), dusk * 0.6).lerp(C('#8a9099'), overcast * 0.8);
    for (const c of clouds) (c.sprite.material as THREE.SpriteMaterial).color.copy(cloudTint);
    for (const m of allMists) (m.material as THREE.SpriteMaterial).color.copy(cloudTint);
    rain.visible = wet > 0.05; (rain.material as THREE.LineBasicMaterial).opacity = 0.55 * wet;
    const glow = THREE.MathUtils.clamp(1.3 - day * 1.6 + overcast * 0.3, 0, 1); for (const l of lanterns) (l.material as THREE.SpriteMaterial).opacity = glow;
  }

  // --- Mô hình .glb từ "file mẫu": công trình, nhân vật, cây cối, động vật. Chưa có thì dựng tạm ---
  const loader = new GLTFLoader();
  const parse = async (buffer: ArrayBuffer) => (await loader.parseAsync(buffer, '')).scene;
  function prepare(object: THREE.Object3D, shadows = true) { object.traverse(child => { if (child instanceof THREE.Mesh) { child.castShadow = shadows; child.receiveShadow = true; const m = child.material as THREE.MeshStandardMaterial; if (m.map) m.map.anisotropy = 8; } }); }
  // Co mô hình vào đúng ô đất (hoặc đúng chiều cao), chân chạm mặt đất, tâm vào giữa.
  function fit(object: THREE.Object3D, { footprint, height }: { footprint?: number; height?: number }) {
    const box = new THREE.Box3().setFromObject(object), size = box.getSize(new THREE.Vector3());
    object.scale.multiplyScalar(height ? height / Math.max(size.y, 0.001) : footprint! / Math.max(size.x, size.z, 0.001));
    const fitted = new THREE.Box3().setFromObject(object), center = fitted.getCenter(new THREE.Vector3());
    object.position.x -= center.x; object.position.z -= center.z; object.position.y -= fitted.min.y;
    return fitted.getSize(new THREE.Vector3());
  }
  let disposed = false;
  const hitMaterial = mat(new THREE.MeshBasicMaterial({ visible: false }));
  const hitboxes: THREE.Mesh[] = [], tops = new Map<string, number>();
  function placeholder(footprint: number) {
    const group = new THREE.Group(), wall = new THREE.BoxGeometry(footprint * 0.7, footprint * 0.38, footprint * 0.6), roof = new THREE.ConeGeometry(footprint * 0.62, footprint * 0.3, 4); owned.geometries.push(wall, roof);
    const body = new THREE.Mesh(wall, redwood); body.position.y = footprint * 0.19;
    const cap = new THREE.Mesh(roof, mat(new THREE.MeshStandardMaterial({ color: '#3c4a5c', roughness: 0.7 }))); cap.position.y = footprint * 0.53; cap.rotation.y = Math.PI / 4;
    group.add(body, cap); prepare(group); return group;
  }
  for (const place of PLACES) {
    const group = new THREE.Group(); group.position.set(place.x, place.y, place.z); scene.add(group);
    const temp = placeholder(place.footprint); group.add(temp); tops.set(place.id, place.y + place.footprint * 0.75);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(place.footprint, place.footprint * 0.8, place.footprint), hitMaterial); owned.geometries.push(hit.geometry);
    hit.position.set(place.x, place.y + place.footprint * 0.4, place.z); hit.userData.place = place.id; scene.add(hit); hitboxes.push(hit);
    void loadRole(place.role).then(async buffers => {
      if (!buffers.length || disposed) return;
      const model = await parse(buffers[0]); if (disposed) return; prepare(model);
      const size = fit(model, { footprint: place.footprint }); group.remove(temp); group.add(model);
      tops.set(place.id, place.y + size.y + 0.4); hit.scale.y = size.y / (place.footprint * 0.8); hit.position.y = place.y + size.y / 2;
    }).catch(() => {});
  }
  // Cây cối: rải kín mép các tầng và quanh nhà, mỗi cây một cỡ, một hướng.
  const TREE_SPOTS: [number, number, number][] = [];
  for (const [i, tier] of TIERS.entries()) {
    const ring = tier.a * 0.86, n = [22, 14, 6][i];
    for (let k = 0; k < n; k++) {
      const t = k / n * Math.PI * 2 + i, cx = Math.sin(t), cz = Math.cos(t), scale = 1 / (Math.abs(cx) + Math.abs(cz));
      const x = cx * scale * ring, z = tier.z + cz * scale * ring;
      if (Math.abs(x) < 4.5 && z > tier.z) continue;
      if (i === 2 && z < tier.z - 3) continue;
      TREE_SPOTS.push([x, tier.y, z]);
    }
  }
  TREE_SPOTS.push([-15, 0, 2], [15, 0, 2], [-6, 0, 18], [6, 0, 18], [-12, 5, -9], [12, 5, -9], [-5, 10, -8.5], [5, 10, -8.5]);
  void loadRole('trang-tri').then(async buffers => {
    const models: THREE.Object3D[] = [];
    for (const buffer of buffers) { if (disposed) return; const m = await parse(buffer); prepare(m); models.push(m); }
    if (!models.length) return;
    for (const [i, [x, y, z]] of TREE_SPOTS.entries()) {
      const base = models[i % models.length], tree = base.clone(true), group = new THREE.Group();
      fit(tree, { height: 3.6 + noise(i, 2, 2) * 2.6 }); group.add(tree); group.position.set(x, y, z); group.rotation.y = noise(i, 3, 3) * Math.PI * 2; scene.add(group);
    }
  }).catch(() => {});

  // Nhân vật đi trên lối có độ cao (leo cầu thang), dừng lại khi được chọn.
  type Walker = { group: THREE.Group; node: number; target: number; x: number; y: number; z: number; moving: boolean; rest: number; walked: number; heading: number };
  function walker(start: number, rest: number): Walker { const group = new THREE.Group(); scene.add(group); const n = NODES[start]; return { group, node: start, target: start, x: n.x, y: n.y, z: n.z, moving: false, rest, walked: 0, heading: 0 }; }
  function walk(p: Walker, delta: number, hold: boolean, speed = 1.3) {
    if (hold) { p.moving = false; return; }
    if (!p.moving) { p.rest -= delta; if (p.rest > 0) return; const links = NODES[p.node].links; p.target = links[Math.floor(Math.random() * links.length)]; p.moving = true; }
    const to = NODES[p.target], dx = to.x - p.x, dy = to.y - p.y, dz = to.z - p.z, left = Math.hypot(dx, dy, dz), travel = Math.min(left, delta * speed);
    p.heading = Math.atan2(dx, dz); if (left > 0) { p.x += dx / left * travel; p.y += dy / left * travel; p.z += dz / left * travel; } p.walked += travel;
    if (left <= travel + 0.001) { p.node = p.target; p.moving = false; p.rest = 2 + Math.random() * 4; }
  }
  const people = staff.map((person, i) => {
    const w = walker(i === 0 ? 0 : 16, 1 + i);
    const temp = track(new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.8, 4, 8), new THREE.MeshStandardMaterial({ color: person.color }))); temp.position.y = 0.7; temp.castShadow = true; w.group.add(temp);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), hitMaterial); owned.geometries.push(hit.geometry); hit.position.y = 1.1; hit.userData.person = person.id; w.group.add(hit);
    const p = { id: person.id, hit, ...w } as Walker & { id: string; hit: THREE.Mesh; vrm?: VRM };
    const fromRole = () => loadRole(person.id === 'minh-nhi' ? 'minh-nhi' : 'xing').then(async buffers => {
      if (!buffers.length || disposed) return; const model = await parse(buffers[0]); if (disposed) return; prepare(model); fit(model, { height: 1.6 }); w.group.remove(temp); w.group.add(model);
    });
    // Minh Nhi là con nhóc nhỏ (cao 1.25) bằng VRM, đi bằng dáng tự tính (đánh tay, bước chân) nên không cần file động tác.
    if (person.id === 'minh-nhi' && loadNhi) void loadNhi().then(async buffer => {
      const vrmLoader = new GLTFLoader(); vrmLoader.register(parser => new VRMLoaderPlugin(parser));
      const vrm = (await vrmLoader.parseAsync(buffer, '')).userData.vrm as VRM; if (disposed) { VRMUtils.deepDispose(vrm.scene); return; }
      VRMUtils.rotateVRM0(vrm); prepare(vrm.scene); fit(vrm.scene, { height: 1.25 }); w.group.remove(temp); w.group.add(vrm.scene); p.vrm = vrm;
    }).catch(fromRole).catch(() => {});
    else void fromRole().catch(() => {});
    return p;
  });
  // Dáng đi / đứng của VRM: tay buông, bước theo quãng đã đi; đứng thì thở nhẹ, ngó quanh.
  const pose = new THREE.Quaternion(), euler = new THREE.Euler();
  function animateVrm(vrm: VRM, moving: boolean, walked: number, t: number, step: number) {
    const flip = vrm.meta?.metaVersion === '0';
    const set = (bone: Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0], x: number, y: number, z: number) => {
      const node = vrm.humanoid.getNormalizedBoneNode(bone); if (!node) return;
      pose.setFromEuler(euler.set(x, y, z)); if (flip) pose.set(-pose.x, pose.y, -pose.z, pose.w); node.quaternion.slerp(pose, Math.min(1, step * 12));
    };
    const ph = walked * 4.2, swing = moving ? Math.sin(ph) : 0;
    set('leftUpperLeg', -0.45 * swing, 0, 0); set('rightUpperLeg', 0.45 * swing, 0, 0);
    set('leftLowerLeg', moving ? 0.55 * Math.max(0, Math.sin(ph - 1.2)) + 0.05 : 0, 0, 0); set('rightLowerLeg', moving ? 0.55 * Math.max(0, -Math.sin(ph - 1.2)) + 0.05 : 0, 0, 0);
    set('leftUpperArm', 0.35 * swing, 0, -1.2); set('rightUpperArm', -0.35 * swing, 0, 1.2);
    set('leftLowerArm', 0, 0, -0.15); set('rightLowerArm', 0, 0, 0.15);
    set('spine', moving ? 0.06 : 0.02 * Math.sin(t * 1.6), 0, 0);
    set('head', 0, moving ? 0 : 0.35 * Math.sin(t * 0.4), 0);
    vrm.update(step);
  }

  // --- Động vật: chim bay đàn quanh đảo (tự vẽ), cùng mô hình trong thư mục dong-vat: diều hâu/chim bay vòng, cá bơi trong hồ, còn lại đi dạo ---
  type Flyer = { object: THREE.Object3D; radius: number; height: number; speed: number; phase: number; wings?: THREE.Mesh[] };
  const flyers: Flyer[] = [], swimmers: { object: THREE.Object3D; phase: number }[] = [], grazers: (Walker & { object: THREE.Object3D })[] = [];
  const birdMaterial = mat(new THREE.MeshStandardMaterial({ color: '#2c2a2e', roughness: 0.8, side: THREE.DoubleSide }));
  const wingGeometry = new THREE.BufferGeometry(); wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.18, 0, 0, -0.18, 0.75, 0.05, 0], 3)); wingGeometry.computeVertexNormals(); owned.geometries.push(wingGeometry);
  const bodyGeometry = new THREE.ConeGeometry(0.09, 0.55, 5); bodyGeometry.rotateX(Math.PI / 2); owned.geometries.push(bodyGeometry);
  for (let flock = 0; flock < 3; flock++) for (let b = 0; b < 7; b++) {
    const bird = new THREE.Group(), body = new THREE.Mesh(bodyGeometry, birdMaterial), left = new THREE.Mesh(wingGeometry, birdMaterial), right = new THREE.Mesh(wingGeometry, birdMaterial);
    right.scale.x = -1; bird.add(body, left, right); scene.add(bird);
    flyers.push({ object: bird, radius: 34 + flock * 9 + (b % 3) * 1.4, height: 16 + flock * 5 + Math.floor(b / 3) * 0.9, speed: (0.09 + flock * 0.02) * (flock % 2 ? -1 : 1), phase: flock * 2.1 + b * 0.09, wings: [left, right] });
  }
  void loadRole('dong-vat').then(async buffers => {
    for (const [i, buffer] of buffers.entries()) {
      if (disposed) return;
      const model = await parse(buffer); prepare(model, false);
      const names: string[] = []; model.traverse(o => names.push(o.name.toLowerCase())); const name = names.join(' ');
      const group = new THREE.Group(); group.add(model); scene.add(group);
      if (/hawk|bird|crane|eagle/.test(name)) { fit(model, { footprint: 2.2 }); flyers.push({ object: group, radius: 20 + i * 4, height: 20 + i * 2, speed: 0.12 * (i % 2 ? -1 : 1), phase: i * 1.7 }); }
      else if (/fish/.test(name)) { fit(model, { footprint: 0.7 }); swimmers.push({ object: group, phase: i * 1.3 }); }
      else { fit(model, { height: /horse/.test(name) ? 2.2 : 0.6 }); const w = walker([2, 3, 18, 19, 10, 11][i % 6], 2 + i); scene.remove(w.group); grazers.push({ ...w, object: group }); }
    }
  }).catch(() => {});

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());

  const labelMap = new Map<string, HTMLElement>();
  labels.querySelectorAll<HTMLElement>('[data-anchor]').forEach(el => labelMap.set(el.dataset.anchor!, el));
  const projected = new THREE.Vector3();
  function placeLabel(id: string, x: number, y: number, z: number) {
    const element = labelMap.get(id); if (!element) return;
    projected.set(x, y, z).project(camera);
    element.style.transform = `translate(${((projected.x + 1) / 2) * host.clientWidth}px,${((1 - projected.y) / 2) * host.clientHeight}px) translate(-50%,-100%)`;
    element.style.visibility = projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1 ? 'visible' : 'hidden';
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let downX = 0, downY = 0;
  const pointerDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; };
  const pointerUp = (e: PointerEvent) => {
    if (e.button !== 0 || Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
    const box = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const person = raycaster.intersectObjects(people.map(p => p.hit), false)[0];
    if (person) { onSelect(person.object.userData.person); return; }
    const place = raycaster.intersectObjects(hitboxes, false)[0]; if (place) onSelect(place.object.userData.place);
  };
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);

  function resize() { const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); composer.setSize(width, height); }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();

  let selected = '', paused = false, frame = 0, last = performance.now(), elapsed = 0;
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (paused || document.hidden || now - last < 1000 / 40) return;
    const step = Math.min((now - last) / 1000, 0.2); last = now; elapsed += step;
    controls.update();
    for (const u of waterUniforms) u.time.value = elapsed;
    for (const [i, m] of mists.entries()) { m.position.y -= step * 3; if (m.position.y < -50) m.position.y = -1; (m.material as THREE.SpriteMaterial).opacity = 0.5 * (1 + m.position.y / 50) + 0.05 * Math.sin(elapsed + i); }
    for (const c of clouds) { c.sprite.position.x += step * c.speed * (1 + overcast); if (c.sprite.position.x > 180) c.sprite.position.x = -180; }
    if (timeMode === 'nhanh') fastHours = (fastHours + step * 24 / 360) % 24;
    applySky(step, now);
    if (rain.visible) { const p = rainGeometry.attributes.position as THREE.BufferAttribute, a = p.array as Float32Array; for (let i = 0; i < a.length; i += 3) { a[i + 1] -= step * 38; if (a[i + 1] < -20) a[i + 1] += 62; } p.needsUpdate = true; }
    for (const f of flyers) {
      const a = f.phase + elapsed * f.speed, x = Math.cos(a) * f.radius, z = Math.sin(a) * f.radius * 0.8, y = f.height + Math.sin(elapsed * 0.7 + f.phase) * 1.2;
      f.object.position.set(x, y, z); f.object.rotation.y = -a + (f.speed > 0 ? Math.PI : 0); f.object.rotation.z = (f.speed > 0 ? 1 : -1) * 0.25;
      if (f.wings) { const flap = Math.sin(elapsed * 9 + f.phase * 5) * 0.6; f.wings[0].rotation.z = flap; f.wings[1].rotation.z = -flap; }
    }
    for (const [i, s] of swimmers.entries()) { const a = elapsed * 0.5 + s.phase; s.object.position.set(Math.cos(a) * 1.5, 9.95, -5.4 + Math.sin(a) * 1.5); s.object.rotation.y = -a + (i % 2 ? Math.PI : 0); }
    for (const g of grazers) { walk(g, step, false, 0.5); g.object.position.set(g.x, g.y + (g.moving ? Math.abs(Math.sin(g.walked * 9)) * 0.04 : 0), g.z); g.object.rotation.y = g.heading; }
    for (const [i, p] of people.entries()) {
      walk(p, step, p.id === selected, p.vrm ? 0.9 : 1.3);
      if (p.vrm) animateVrm(p.vrm, p.moving, p.walked, elapsed, step);
      const bob = p.vrm ? (p.moving ? Math.abs(Math.sin(p.walked * 4.2)) * 0.025 : 0) : p.moving ? Math.abs(Math.sin(p.walked * 7)) * 0.06 : Math.sin(elapsed * 2 + i) * 0.01;
      p.group.position.set(p.x, p.y + bob, p.z); p.group.rotation.y = p.heading;
      placeLabel(p.id, p.x, p.y + (p.vrm ? 1.6 : 2.3), p.z);
    }
    for (const place of PLACES) placeLabel(place.id, place.x, tops.get(place.id) || place.y + 5, place.z);
    composer.render(); renderer.domElement.dataset.ready = 'true';
  }
  frame = requestAnimationFrame(tick);

  return {
    setSelected(id: string) { selected = id; },
    setPaused(value: boolean) { paused = value; last = performance.now(); },
    focusStaff(id: string) {
      const p = people.find(x => x.id === id); if (!p) return;
      const target = new THREE.Vector3(p.x, p.y + 1, p.z), offset = camera.position.clone().sub(controls.target).setLength(16);
      controls.target.copy(target); camera.position.copy(target).add(offset); controls.update();
    },
    reset() { camera.position.copy(HOME.position); controls.target.copy(HOME.target); controls.update(); },
    setWeather(kind: Weather | 'tu-dong' | 'that') { weatherChoice = kind; weatherUntil = 0; },
    setLiveWeather(kind: Weather) { live = kind; },
    setTimeMode(mode: 'that' | 'nhanh') { if (mode === 'nhanh' && timeMode === 'that') fastHours = hoursNow(); timeMode = mode; },
    clock() { return { hours: hoursNow(), weather: (weatherChoice === 'tu-dong' ? weatherNow : weatherChoice === 'that' ? live : weatherChoice) as Weather, choice: weatherChoice, mode: timeMode }; },
    zoom: zoomBy,
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('wheel', wheel);
      scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose()); } });
      owned.geometries.forEach(g => g.dispose()); owned.materials.forEach(m => m.dispose()); owned.textures.forEach(t => t.dispose());
      composer.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
