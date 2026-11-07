// Máy chụp ảnh đại diện: một renderer ẩn dùng chung, chụp lần lượt từng món chưa có ảnh rồi lưu vào Kho-3D/anh.
import * as THREE from 'three';
import { donDep, khung, napMoHinh, nguonXem } from './nap';
import type { KhoItem } from './types';

let renderer: THREE.WebGLRenderer | null = null;
const hang: { it: KhoItem; done: (path: string | null) => void }[] = [];
let dangChay = false;

export function xepChup(it: KhoItem, done: (path: string | null) => void) {
  if (!nguonXem(it) || it.dung_luong > 60e6) return;
  if (hang.some(h => h.it.id === it.id)) return;
  hang.push({ it, done }); if (!dangChay) void chay();
}
export function boHang() { hang.length = 0; }

async function chay() {
  dangChay = true;
  while (hang.length) {
    const { it, done } = hang.shift()!;
    try { done(await chup(it)); } catch { done(null); }
  }
  dangChay = false;
}

async function chup(it: KhoItem) {
  renderer ??= new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setSize(256, 256); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#2b323b');
  scene.add(new THREE.HemisphereLight('#e6eeff', '#3a3226', 1.7));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(3, 5, 4); scene.add(sun);
  const n = await napMoHinh(it);
  try {
    if (n.clips.length) { const mx = new THREE.AnimationMixer(n.vrm ? n.vrm.scene : n.root); mx.clipAction(n.clips[0]).play(); mx.update(n.clips[0].duration * 0.3); }
    scene.add(n.root);
    let helper: THREE.SkeletonHelper | null = null;
    let mesh = false; n.root.traverse(c => { if ((c as THREE.Mesh).isMesh) mesh = true; });
    if (!mesh) { helper = new THREE.SkeletonHelper(n.root); (helper.material as THREE.LineBasicMaterial).linewidth = 2; scene.add(helper); }
    const k = khung(n.root);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 5000);
    const d = k.r / Math.tan(THREE.MathUtils.degToRad(17.5)) * 1.05;
    cam.position.set(k.center.x + d * 0.55, k.center.y + d * 0.35, k.center.z + d * 0.8); cam.near = d / 500; cam.far = d * 50; cam.updateProjectionMatrix();
    cam.lookAt(k.center);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    helper?.dispose();
    return await window.manorKho!.saveThumb(it.id, url);
  } finally { donDep(n.root); }
}
