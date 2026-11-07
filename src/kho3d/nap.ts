// Nạp mọi định dạng mô hình trong Kho 3D về một THREE.Object3D (+ danh sách động tác), dùng chung cho
// trình xem và máy chụp ảnh đại diện.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { BVHLoader } from 'three/addons/loaders/BVHLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
// @ts-expect-error — module JS dùng chung với Xưởng MV, không có kiểu
import { MMDLoader } from '../../tools/mv/web/lib/MMDLoader.js';
import type { KhoItem } from './types';

export const khoUrl = (file: string) => 'kho://f/' + file.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');

const draco = new DRACOLoader(); draco.setDecoderPath(new URL('./draco/', document.baseURI).href);
const gltf = () => { const l = new GLTFLoader(); l.setDRACOLoader(draco); l.register(p => new VRMLoaderPlugin(p)); return l; };

export interface Nap { root: THREE.Object3D; clips: THREE.AnimationClip[]; vrm?: VRM; skeleton?: THREE.Skeleton }

// Định dạng trình duyệt đọc thẳng được; còn lại (.blend, .dae, .usdc) phải chờ bản GLB đã chuyển.
export function nguonXem(it: KhoItem): { file: string; dang: string } | null {
  if (it.glb) return { file: it.glb, dang: it.glb.toLowerCase().endsWith('.vrm') ? 'vrm' : it.glb.toLowerCase().endsWith('.gltf') ? 'gltf' : 'glb' };
  if (['fbx', 'obj', 'bvh', 'pmx'].includes(it.dinh_dang)) return { file: it.file, dang: it.dinh_dang };
  return null;
}

export async function napMoHinh(it: KhoItem): Promise<Nap> {
  const src = nguonXem(it);
  if (!src) throw new Error('Món này chưa được chuyển sang GLB — bộ chuyển đổi đang chạy, quay lại sau.');
  const url = khoUrl(src.file);
  switch (src.dang) {
    case 'glb': case 'gltf': case 'vrm': {
      const g = await gltf().loadAsync(url);
      const vrm = g.userData.vrm as VRM | undefined;
      if (vrm) { VRMUtils.removeUnnecessaryVertices(g.scene); VRMUtils.rotateVRM0(vrm); return { root: vrm.scene, clips: g.animations, vrm }; }
      return { root: g.scene, clips: g.animations };
    }
    case 'fbx': { const o = await new FBXLoader().loadAsync(url); return { root: o, clips: o.animations }; }
    case 'obj': { const o = await new OBJLoader().loadAsync(url); return { root: o, clips: [] }; }
    case 'bvh': {
      const b = await new BVHLoader().loadAsync(url);
      const root = new THREE.Group(); root.add(b.skeleton.bones[0]); root.scale.setScalar(0.01);
      b.clip.name = it.ten; return { root, clips: [b.clip], skeleton: b.skeleton };
    }
    case 'pmx': { const m = await new MMDLoader().loadAsync(url); m.scale.setScalar(0.08); return { root: m, clips: [] }; }
  }
  throw new Error('Không đọc được định dạng ' + src.dang);
}

// Khung bao + kích thước để đặt máy quay vừa vặn.
export function khung(o: THREE.Object3D) {
  o.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(o, true);
  if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0, 1, 0), new THREE.Vector3(2, 2, 2));
  const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
  return { box, size, center, r: Math.max(size.length() / 2, 0.01) };
}

export function donDep(o: THREE.Object3D) {
  o.traverse(c => {
    const m = c as THREE.Mesh;
    m.geometry?.dispose?.();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mt of mats) { for (const v of Object.values(mt)) if (v instanceof THREE.Texture) v.dispose(); mt.dispose(); }
  });
}
