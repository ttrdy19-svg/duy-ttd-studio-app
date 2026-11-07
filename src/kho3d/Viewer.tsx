import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw, RotateCw, Play, Pause } from 'lucide-react';
import { donDep, khung, napMoHinh, type Nap } from './nap';
import type { KhoItem } from './types';

export type CheDo = '3d' | '25d' | '2d';
type Mat2D = 'truoc' | 'ngang' | 'tren';

// Trình xem một món: 3D (xoay tự do), 2.5D (isometric, xoay từng 90°), 2D (chiếu thẳng trước/ngang/trên).
export default function Viewer({ item, cheDo }: { item: KhoItem; cheDo: CheDo }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setMode(m: CheDo, mat: Mat2D, goc: number): void; play(i: number | null): void } | null>(null);
  const [status, setStatus] = useState('Đang nạp…');
  const [clips, setClips] = useState<{ ten: string; giay: number }[]>([]);
  const [dang, setDang] = useState<number | null>(null);
  const [mat, setMat] = useState<Mat2D>('truoc');
  const [goc, setGoc] = useState(0);

  useEffect(() => {
    const el = host.current!; let dead = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#20262e');
    scene.add(new THREE.HemisphereLight('#dfe9ff', '#3a3226', 1.6));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(3, 5, 4); scene.add(sun);
    const persp = new THREE.PerspectiveCamera(40, 1, 0.01, 5000);
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
    let cam: THREE.Camera = persp;
    const ctl = new OrbitControls(persp as THREE.Camera, renderer.domElement) as OrbitControls & { object: THREE.Camera }; ctl.enableDamping = true;
    const grid = new THREE.GridHelper(10, 20, '#56606c', '#39414b'); scene.add(grid);
    let loaded: Nap | null = null, mixer: THREE.AnimationMixer | null = null, helper: THREE.SkeletonHelper | null = null;
    let f = { center: new THREE.Vector3(), r: 1, size: new THREE.Vector3(1, 1, 1) };
    let mode: CheDo = '3d', m2: Mat2D = 'truoc', g25 = 0;
    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h); const a = w / h;
      if (mode === '3d') {
        cam = persp; persp.aspect = a; persp.updateProjectionMatrix(); ctl.object = persp;
        ctl.enableRotate = true;
      } else {
        cam = ortho; const s = f.r * 1.15; ortho.left = -s * a; ortho.right = s * a; ortho.top = s; ortho.bottom = -s; ortho.zoom = 1; ortho.updateProjectionMatrix();
        ctl.object = ortho; ctl.enableRotate = false;
        const d = f.r * 4; const c = f.center;
        if (mode === '25d') {
          const az = Math.PI / 4 + g25 * Math.PI / 2, el2 = Math.atan(1 / Math.SQRT2);
          ortho.position.set(c.x + Math.sin(az) * Math.cos(el2) * d, c.y + Math.sin(el2) * d, c.z + Math.cos(az) * Math.cos(el2) * d);
        } else if (m2 === 'truoc') ortho.position.set(c.x, c.y, c.z + d);
        else if (m2 === 'ngang') ortho.position.set(c.x + d, c.y, c.z);
        else ortho.position.set(c.x, c.y + d, c.z + 0.0001);
        ortho.lookAt(c); ctl.target.copy(c);
      }
      ctl.update();
    };
    const frame3d = () => {
      const c = f.center; const d = f.r / Math.tan(THREE.MathUtils.degToRad(20)) * 1.1;
      persp.position.set(c.x + d * 0.55, c.y + d * 0.35, c.z + d * 0.8); persp.near = d / 500; persp.far = d * 50; persp.updateProjectionMatrix();
      ctl.target.copy(c); ctl.update();
    };
    api.current = {
      setMode(mm, mt, gg) { mode = mm; m2 = mt; g25 = gg; fit(); if (mm === '3d') frame3d(); },
      play(i) {
        if (!mixer || !loaded) return; mixer.stopAllAction();
        if (i != null && loaded.clips[i]) mixer.clipAction(loaded.clips[i]).reset().play();
      },
    };
    napMoHinh(item).then(n => {
      if (dead) { donDep(n.root); return; }
      loaded = n; scene.add(n.root);
      const k = khung(n.root); f = k;
      grid.scale.setScalar(Math.max(k.size.x, k.size.z, 1) / 6); grid.position.y = k.box.min.y;
      if (n.skeleton || (n.clips.length && !hasMesh(n.root))) { helper = new THREE.SkeletonHelper(n.root); scene.add(helper); }
      if (n.clips.length) { mixer = new THREE.AnimationMixer(n.vrm ? n.vrm.scene : n.root); mixer.clipAction(n.clips[0]).play(); setDang(0); }
      setClips(n.clips.map(c => ({ ten: c.name || 'Động tác', giay: Math.round(c.duration * 10) / 10 })));
      fit(); frame3d(); setStatus('');
    }, e => { if (!dead) setStatus(String(e?.message || e)); });
    const clock = new THREE.Clock(); let raf = 0;
    const tick = () => { raf = requestAnimationFrame(tick); const dt = clock.getDelta(); mixer?.update(dt); loaded?.vrm?.update(dt); ctl.update(); renderer.render(scene, cam); };
    tick();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); if (loaded) donDep(loaded.root); helper?.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); api.current = null; };
  }, [item]);

  useEffect(() => { api.current?.setMode(cheDo, mat, goc); }, [cheDo, mat, goc, status]);

  return <div className="kho-viewer">
    <div className="kho-canvas" ref={host} />
    {status && <div className="kho-status">{status}</div>}
    {cheDo === '25d' && <div className="kho-tools"><button onClick={() => setGoc(g => g - 1)} title="Xoay trái 90°"><RotateCcw size={15} /></button><button onClick={() => setGoc(g => g + 1)} title="Xoay phải 90°"><RotateCw size={15} /></button></div>}
    {cheDo === '2d' && <div className="kho-tools">{(['truoc', 'ngang', 'tren'] as Mat2D[]).map(m => <button key={m} aria-pressed={mat === m} onClick={() => setMat(m)}>{m === 'truoc' ? 'Trước' : m === 'ngang' ? 'Ngang' : 'Trên'}</button>)}</div>}
    {clips.length > 0 && <div className="kho-clips">
      <b>Động tác ({clips.length})</b>
      <ul>{clips.map((c, i) => <li key={i}><button aria-pressed={dang === i} onClick={() => { const n = dang === i ? null : i; setDang(n); api.current?.play(n); }}>
        {dang === i ? <Pause size={12} /> : <Play size={12} />} {c.ten} <small>{c.giay}s</small></button></li>)}</ul>
    </div>}
  </div>;
}

function hasMesh(o: THREE.Object3D) { let m = false; o.traverse(c => { if ((c as THREE.Mesh).isMesh) m = true; }); return m; }
