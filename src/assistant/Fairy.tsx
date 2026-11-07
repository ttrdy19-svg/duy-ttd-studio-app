import { Component, useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

// Tiên Nhỏ: nhân vật VRM thu nhỏ có cánh bướm phát sáng, bay lượn khắp giao diện; bấm vào thì mở khung chat.
// Lớp canvas trong suốt không chặn chuột, chỉ có một nút tròn nhỏ đi theo con tiên để bấm.
type Props = { onClick: () => void; perch: boolean; loadModel: () => Promise<Uint8Array> };

// Cánh bướm: nửa trên to, nửa dưới nhỏ, màu chuyển từ gốc ra mép, cộng sáng.
function wing(top: boolean, color: string) {
  const s = new THREE.Shape();
  if (top) { s.moveTo(0, 0); s.bezierCurveTo(0.15, 0.35, 0.55, 0.55, 0.62, 0.32); s.bezierCurveTo(0.66, 0.15, 0.35, 0.02, 0, 0); }
  else { s.moveTo(0, 0); s.bezierCurveTo(0.2, -0.05, 0.42, -0.2, 0.36, -0.36); s.bezierCurveTo(0.28, -0.45, 0.08, -0.2, 0, 0); }
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const r = g.createRadialGradient(0, 64, 4, 0, 64, 120); r.addColorStop(0, '#ffffffee'); r.addColorStop(0.5, color + 'aa'); r.addColorStop(1, color + '22');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const geo = new THREE.ShapeGeometry(s, 24), uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * 1.5, 0.5 + pos.getY(i) * 1.2);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
}

function FairyCanvas({ onClick, perch, loadModel }: Props) {
  const host = useRef<HTMLDivElement>(null), hit = useRef<HTMLButtonElement>(null), perchRef = useRef(perch);
  perchRef.current = perch;

  useEffect(() => {
    const el = host.current!; let gone = false, frame = 0;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 10);
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 3, 5);
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x88aacc, 2.2), key);
    const rig = new THREE.Group(); scene.add(rig);
    // Vệt lấp lánh: 60 hạt, hạt cũ nhất được đặt lại ở chỗ con tiên.
    const N = 60, sparkPos = new Float32Array(N * 3), sparkAge = new Float32Array(N).fill(9);
    const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const dot = document.createElement('canvas'); dot.width = dot.height = 32; { const g = dot.getContext('2d')!, r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, '#fffbe6'); r.addColorStop(0.4, '#c8ffe8aa'); r.addColorStop(1, '#0000'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); }
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.12, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(sparks);
    let vrm: VRM | null = null; const wings: THREE.Object3D[] = [];
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    resize(); window.addEventListener('resize', resize);

    loadModel().then(bytes => {
      const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      loader.parse(buf, '', gltf => {
        if (gone) return;
        vrm = gltf.userData.vrm as VRM; VRMUtils.rotateVRM0(vrm);
        const box = new THREE.Box3().setFromObject(vrm.scene), h = box.max.y - box.min.y;
        vrm.scene.scale.setScalar(0.8 / h); vrm.scene.position.y = -0.4; rig.add(vrm.scene);
        // Hai đôi cánh gắn sau lưng (xương ngực trên), xòe hai bên. Khung xương chuẩn hóa của VRM 0.x quay
        // ngược 180° so với hướng nhân vật nhìn, nên phải xoay giá cánh lại, không thì cánh mọc trước ngực.
        const chest = vrm.humanoid.getNormalizedBoneNode('upperChest') || vrm.humanoid.getNormalizedBoneNode('chest');
        if (chest) {
          const mount = new THREE.Group(); mount.rotation.y = vrm.meta?.metaVersion === '0' ? Math.PI : 0; chest.add(mount);
          for (const side of [1, -1]) {
            // Chỉ đôi cánh trên: đôi cánh dưới thòng xuống hông nhìn như cái váy.
            const pair = new THREE.Group(); pair.add(wing(true, '#7fe0c0'));
            pair.scale.set(side * h * 1.05, h * 1.05, h * 1.05); pair.position.set(0, h * 0.05, -h * 0.07); mount.add(pair); wings.push(pair);
          }
        }
      }, () => {});
    }).catch(() => {});

    // Chỗ bay: lơ lửng tại chỗ ở góc phải trên màn hình (chủ quán muốn vậy, không lượn khắp giao diện); khung chat mở thì về đậu cạnh khung chat.
    const start = performance.now(), clockState = { last: start }, at = new THREE.Vector3(), prev = new THREE.Vector3(), target = new THREE.Vector3(), ndc = new THREE.Vector3();
    const toWorld = (x: number, y: number) => { ndc.set(x, y, 0.5).unproject(camera); const d = ndc.sub(camera.position).normalize(); return camera.position.clone().addScaledVector(d, -camera.position.z / d.z); };
    let blinkAt = 2, facing = 1, side = 1, lean = 0;
    const tick = () => {
      if (gone) return; frame = requestAnimationFrame(tick);
      if (document.hidden) return;
      const now = performance.now(), dt = Math.min((now - clockState.last) / 1000, 0.05), t = (now - start) / 1000; clockState.last = now;
      // Chỗ đậu: sát mép trái phía trên khung chat (khung rộng 380px, cách phải 24px, cách đáy 110px).
      const w = el.clientWidth, h = el.clientHeight;
      const fx = perchRef.current ? 1 - 2 * (24 + 380 + 50) / w : 1 - 2 * 110 / w + 0.012 * Math.sin(t * 0.7);
      const fy = perchRef.current ? -1 + 2 * Math.min(h - 80, 110 + Math.min(520, h - 220) - 40) / h : 1 - 2 * 130 / h + 0.015 * Math.sin(t * 0.9);
      target.copy(toWorld(fx, fy)); prev.copy(at); at.lerp(target, 1 - Math.exp(-dt * (perchRef.current ? 3 : 1.2)));
      const vx = (at.x - prev.x) / Math.max(dt, 1e-3), vy = (at.y - prev.y) / Math.max(dt, 1e-3);
      rig.position.copy(at).add(new THREE.Vector3(0, Math.sin(t * 2.4) * 0.06, 0));
      // Bay ngang: quay nghiêng người theo hướng bay rồi chúi về trước gần nằm ngang; bay chậm hoặc đang đậu thì đứng thẳng nhìn ra.
      if (Math.abs(vx) > 0.05) facing = Math.sign(vx);
      const fly = perchRef.current ? 0 : THREE.MathUtils.smoothstep(Math.hypot(vx, vy), 0.02, 0.14), ease = 1 - Math.exp(-dt * 3);
      lean = THREE.MathUtils.lerp(lean, fly, ease); side = THREE.MathUtils.lerp(side, facing, ease);
      rig.rotation.set(lean * (1.25 - THREE.MathUtils.clamp(vy * 0.6, -0.4, 0.4)), side * lean * Math.PI / 2, 0, 'YXZ');
      for (const [i, w] of wings.entries()) w.rotation.y = (i ? -1 : 1) * (0.25 + 0.55 * Math.abs(Math.sin(t * 9)));
      if (vrm) {
        // Xương chuẩn hóa của VRM 0.x quay ngược trục x, z so với VRM 1 (như director.js).
        const vrm0 = vrm.meta?.metaVersion === '0';
        const pose = (n: Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0], x: number, y: number, z: number) => {
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)); if (vrm0) q.set(-q.x, q.y, -q.z, q.w);
          vrm!.humanoid.getNormalizedBoneNode(n)?.quaternion.copy(q);
        };
        // Tư thế bay: tay dang nhẹ, đùi hơi đưa trước, cẳng chân co ra sau, đung đưa theo nhịp.
        // Bay ngang thì tay xuôi theo thân, chân duỗi ra sau; đứng thì tay dang nhẹ, chân co.
        const a = THREE.MathUtils.lerp(1.0, 1.35, lean), s2 = Math.sin(t * 2.4);
        pose('leftUpperArm', 0.25 * lean, 0, -a + 0.1 * s2); pose('rightUpperArm', 0.25 * lean, 0, a - 0.1 * s2);
        pose('leftUpperLeg', THREE.MathUtils.lerp(-0.25, 0.12, lean) - 0.08 * s2, 0, 0.05); pose('rightUpperLeg', THREE.MathUtils.lerp(-0.05, 0.02, lean) - 0.08 * Math.sin(t * 2.4 + 1), 0, -0.05);
        pose('leftLowerLeg', THREE.MathUtils.lerp(0.9, 0.35, lean), 0, 0); pose('rightLowerLeg', THREE.MathUtils.lerp(0.5, 0.7, lean), 0, 0);
        pose('head', -0.6 * lean, 0, 0);
        if (t > blinkAt) { vrm.expressionManager?.setValue('blink', t < blinkAt + 0.14 ? 1 : 0); if (t > blinkAt + 0.14) blinkAt = t + 2.5 + Math.random() * 3; }
        vrm.expressionManager?.setValue('happy', 0.35);
        vrm.update(dt);
      }
      for (let i = 0; i < N; i++) sparkAge[i] += dt;
      const k = Math.floor(t * 30) % N; if (sparkAge[k] > 1.5) { sparkAge[k] = 0; sparkPos.set([at.x + (Math.random() - 0.5) * 0.3, at.y - 0.1 + (Math.random() - 0.5) * 0.3, 0], k * 3); }
      for (let i = 0; i < N; i++) { sparkPos[i * 3 + 1] -= dt * 0.12; if (sparkAge[i] > 1.5) sparkPos[i * 3 + 2] = 99; }
      sparkGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      // Nút bấm đi theo con tiên trên màn hình.
      const p = at.clone().project(camera);
      if (hit.current) { hit.current.style.left = `${(p.x + 1) / 2 * w}px`; hit.current.style.top = `${(1 - p.y) / 2 * h}px`; }
    };
    tick();
    return () => { gone = true; cancelAnimationFrame(frame); window.removeEventListener('resize', resize); renderer.dispose(); el.removeChild(renderer.domElement); if (vrm) VRMUtils.deepDispose(vrm.scene); };
  }, [loadModel]);

  return <div className="fairy-layer" ref={host}><button ref={hit} className="fairy-hit" aria-label="Gọi Tiên Nhỏ" title="Tiên Nhỏ — bấm để nhắn việc" onClick={onClick} /></div>;
}

// Con tiên chỉ để trang trí: có lỗi (WebGL, mô hình hỏng) thì ẩn đi, không làm sập trang viên.
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function Fairy(props: Props) { return <Quiet><FairyCanvas {...props} /></Quiet>; }
