import * as THREE from 'three';

// Họa thất 3D: ảnh gian phòng được dựng thành khối theo bản đồ độ sâu nên camera xoay quanh được,
// nốt nhạc lơ lửng trên vòng hoa văn giữa sàn. Mọi vật tương tác là vật thể trong scene
// (không phải khung HTML) để sau này đặt thẳng vào phòng 3D nhập vai.
export interface HoaThatScene {
  setLoaded(loaded: boolean): void;
  setTilt(x: number, y: number): void;
  dispose(): void;
}

// Vị trí vòng hoa văn trên ảnh nền (tỉ lệ theo ảnh gốc) và ảnh nền phủ kín khung theo kiểu "cover".
const MEDALLION = { x: 0.512, y: 0.7, radius: 0.088, squash: 0.28 };
const NOTE_HEIGHT = 0.19; // nốt nhạc cao ~19% khung hình, cỡ hai quyển sổ đặt cạnh bàn
const LIFT = 0.035;       // lơ lửng cách vòng hoa văn ~3,5% khung hình
// Khối phòng dựng theo góc nhìn 38°, camera nhìn hẹp hơn một chút để khi xoay không lộ mép ảnh.
const BUILD_FOV = 38, VIEW_FOV = 35.5;
// Độ sâu: điểm gần nhất cách camera 0,78 lần, trời xa 2,6 lần khoảng cách tới mặt ảnh (dịu để mép vật không nhòe).
const NEAR = 0.78, FAR = 2.6;
// Giới hạn xoay camera (radian): kéo nền để xoay, rê chuột thì nghiêng nhẹ.
const YAW = 0.1, PITCH = 0.045, SWAY = 0.02;
const SEGMENTS = { x: 240, y: 135 };

function noteMesh(material: THREE.Material) {
  const group = new THREE.Group();
  // Đầu nốt: hình elip nghiêng như nốt móc đơn viết tay. Khối cao ~4.4 đơn vị, tâm ở gốc.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), material);
  head.scale.set(1.35, 0.95, 0.8); head.rotation.z = 0.45; head.position.set(-0.55, -1.55, 0);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.3, 24), material);
  stem.position.set(0.18, 0.05, 0);
  const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(0.18, 1.65, 0), new THREE.Vector3(1.2, 1.2, 0), new THREE.Vector3(1.35, 0.35, 0.05), new THREE.Vector3(0.85, -0.35, 0.1));
  const flag = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.13, 16, false), material);
  group.add(head, stem, flag);
  // Dời để trục xoay đi qua giữa nốt nhạc, xoay 360° không bị lệch tâm.
  group.position.x = -0.2;
  return group;
}

function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,240,200,1)'); gradient.addColorStop(0.25, 'rgba(255,210,140,0.55)'); gradient.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

// Đọc bản đồ độ sâu (trắng = gần) thành lưới số để dựng khối và đặt nốt nhạc đúng độ sâu của sàn.
function loadDepth(url: string) {
  return new Promise<{ width: number; height: number; data: Float32Array }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const width = SEGMENTS.x + 1, height = SEGMENTS.y + 1, canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const g = canvas.getContext('2d')!; g.drawImage(image, 0, 0, width, height);
      const pixels = g.getImageData(0, 0, width, height).data, data = new Float32Array(width * height);
      for (let i = 0; i < data.length; i++) data[i] = pixels[i * 4] / 255;
      resolve({ width, height, data });
    };
    image.onerror = () => reject(new Error('Không đọc được bản đồ độ sâu.'));
    image.src = url;
  });
}

export function createHoaThatScene(host: HTMLElement, { onNote, imageSize, room, onRoomReady }: {
  onNote: () => void; imageSize: { width: number; height: number };
  room?: { image: string; depth: string }; onRoomReady?: () => void;
}): HoaThatScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-label', 'Nốt nhạc huyền bí giữa Họa thất');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const CAMERA_Z = 15;
  const camera = new THREE.PerspectiveCamera(room ? VIEW_FOV : BUILD_FOV, 1, 0.1, 400);
  camera.position.set(0, 0, CAMERA_Z);
  scene.add(new THREE.AmbientLight('#b8c8ff', 0.6));
  const key = new THREE.PointLight('#ffd9a0', 60, 40); key.position.set(4, 5, 8); scene.add(key);
  const rim = new THREE.PointLight('#7fb6ff', 40, 40); rim.position.set(-5, -2, -3); scene.add(rim);

  const material = new THREE.MeshPhysicalMaterial({ color: '#f6e3b0', emissive: '#c88a2c', emissiveIntensity: 0.55, metalness: 0.35, roughness: 0.18, clearcoat: 1, transmission: 0.25, thickness: 0.8 });
  const note = noteMesh(material);
  const spinner = new THREE.Group(); spinner.add(note);
  const holder = new THREE.Group(); holder.add(spinner); scene.add(holder);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffd59a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(7, 7, 1); holder.add(glow);

  const count = 320, positions = new Float32Array(count * 3), seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { seeds[i * 3] = Math.random() * Math.PI * 2; seeds[i * 3 + 1] = 1.4 + Math.random() * 2.2; seeds[i * 3 + 2] = (Math.random() - 0.5) * 4; }
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ map: glowTexture(), color: '#ffe2a8', size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  holder.add(dust);

  // Vòng sáng nằm đúng trên vòng hoa văn của sàn: nghiêng cho dẹt theo phối cảnh của ảnh.
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 128), new THREE.MeshBasicMaterial({ color: '#ffd59a', transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.acos(MEDALLION.squash); ring.renderOrder = 1; scene.add(ring);
  // Vòng sáng nằm sát mặt sàn của khối phòng: tắt kiểm tra độ sâu để không bị sàn che mất.
  (ring.material as THREE.MeshBasicMaterial).depthTest = false;

  // Khối phòng: lưới phẳng phủ ảnh, mỗi đỉnh được đẩy dọc theo tia nhìn từ camera theo độ sâu,
  // nên đứng yên thì y hệt ảnh gốc, xoay camera thì vật gần lệch nhiều hơn vật xa như phòng thật.
  let depth: { width: number; height: number; data: Float32Array } | null = null;
  let roomMesh: THREE.Mesh | null = null;
  const distanceAt = (s: number) => CAMERA_Z / (1 / FAR + s * (1 / NEAR - 1 / FAR));
  function sampleDepth(u: number, v: number) {
    if (!depth) return null;
    const x = Math.min(depth.width - 1, Math.max(0, Math.round(u * (depth.width - 1)))), y = Math.min(depth.height - 1, Math.max(0, Math.round(v * (depth.height - 1))));
    return depth.data[y * depth.width + x];
  }
  // Hệ số đẩy theo tia nhìn của một điểm trên ảnh (1 = nằm đúng mặt ảnh).
  const pushAt = (u: number, v: number) => { const s = sampleDepth(u, v); return s == null ? 1 : distanceAt(s) / CAMERA_Z; };

  const base = new THREE.Vector3(); let noteScale = 1, radius = 2;
  // Góc camera: yaw/pitch do kéo nền, sway do rê chuột; camera quay quanh vòng hoa văn.
  const pivot = new THREE.Vector3(), view = { yaw: 0, pitch: 0, yawTarget: 0, pitchTarget: 0, swayX: 0, swayY: 0 };
  let frameW = 1, frameH = 1;
  function layout(w: number, h: number) {
    frameW = w; frameH = h;
    const cover = Math.max(w / imageSize.width, h / imageSize.height);
    const worldPerPx = 2 * Math.tan(THREE.MathUtils.degToRad(BUILD_FOV / 2)) * CAMERA_Z / h;
    const imageW = imageSize.width * cover * worldPerPx, imageH = imageSize.height * cover * worldPerPx;
    const px = (w - imageSize.width * cover) / 2 + MEDALLION.x * imageSize.width * cover;
    const py = (h - imageSize.height * cover) / 2 + MEDALLION.y * imageSize.height * cover;
    const floor = new THREE.Vector3((px - w / 2) * worldPerPx, (h / 2 - py) * worldPerPx, 0);
    // Đặt vòng sáng và nốt nhạc trên mặt ảnh trước, rồi đẩy cả cụm về đúng độ sâu của sàn.
    const k = pushAt(MEDALLION.x, MEDALLION.y);
    const toDepth = (point: THREE.Vector3) => point.set(point.x * k, point.y * k, CAMERA_Z - CAMERA_Z * k);
    ring.position.copy(toDepth(floor.clone()));
    ring.scale.setScalar(MEDALLION.radius * imageSize.width * cover * worldPerPx * k);
    noteScale = NOTE_HEIGHT * h * worldPerPx / 4.4 * k;
    base.copy(toDepth(new THREE.Vector3(floor.x, floor.y + LIFT * h * worldPerPx + 2.2 * noteScale / k, 0)));
    radius = 2.4 * noteScale;
    pivot.set(ring.position.x, ring.position.y, ring.position.z);
    if (roomMesh && depth) {
      const position = roomMesh.geometry.attributes.position as THREE.BufferAttribute, uv = roomMesh.geometry.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const u = uv.getX(i), v = 1 - uv.getY(i), push = pushAt(u, v);
        position.setXYZ(i, (u - 0.5) * imageW * push, (0.5 - v) * imageH * push, CAMERA_Z - CAMERA_Z * push);
      }
      position.needsUpdate = true; roomMesh.geometry.computeBoundingSphere();
    }
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let hover = false, loaded = false, frame = 0, disposed = false;
  let dragging: 'note' | 'room' | null = null, dragStart = 0, lastX = 0, lastY = 0, spinVelocity = 0, angle = 0;
  const clock = new THREE.Clock();

  function resize() {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); layout(w, h);
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();

  if (room) {
    const texture = new THREE.TextureLoader().load(room.image);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    loadDepth(room.depth).then(map => {
      if (disposed) return;
      depth = map;
      roomMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, SEGMENTS.x, SEGMENTS.y), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
      roomMesh.renderOrder = -1; scene.add(roomMesh);
      layout(frameW, frameH);
      renderer.domElement.dataset.room = 'true';
      onRoomReady?.();
    }, () => {});
  }

  function hit(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.distanceToPoint(holder.position) < radius;
  }
  // Nốt nhạc: kéo để xoay 360°, chạm nhẹ để mở. Nền phòng: kéo để xoay camera nhìn quanh.
  const down = (event: PointerEvent) => {
    const onNote = hit(event);
    if (!onNote && !roomMesh) return;
    dragging = onNote ? 'note' : 'room'; dragStart = lastX = event.clientX; lastY = event.clientY; spinVelocity = 0;
    renderer.domElement.setPointerCapture(event.pointerId);
    if (dragging === 'room') renderer.domElement.style.cursor = 'grabbing';
  };
  const move = (event: PointerEvent) => {
    const dx = event.clientX - lastX, dy = event.clientY - lastY;
    if (dragging === 'note') { lastX = event.clientX; angle += dx * 0.012; spinVelocity = dx * 0.012; return; }
    if (dragging === 'room') {
      lastX = event.clientX; lastY = event.clientY;
      view.yawTarget = THREE.MathUtils.clamp(view.yawTarget - dx * 0.0016, -YAW, YAW);
      view.pitchTarget = THREE.MathUtils.clamp(view.pitchTarget - dy * 0.0012, -PITCH, PITCH);
      return;
    }
    hover = hit(event); renderer.domElement.style.cursor = hover ? 'grab' : roomMesh ? 'move' : 'default';
  };
  const up = (event: PointerEvent) => {
    if (!dragging) return;
    const was = dragging; dragging = null; renderer.domElement.releasePointerCapture(event.pointerId);
    renderer.domElement.style.cursor = 'default';
    if (was === 'note' && Math.abs(event.clientX - dragStart) < 5) onNote();
  };
  // Nhấp đúp vào nền để camera về góc nhìn ban đầu.
  const reset = (event: MouseEvent) => { if (!hit(event as PointerEvent)) { view.yawTarget = 0; view.pitchTarget = 0; } };
  renderer.domElement.addEventListener('pointerdown', down);
  renderer.domElement.addEventListener('pointermove', move);
  renderer.domElement.addEventListener('pointerup', up);
  renderer.domElement.addEventListener('dblclick', reset);

  const orbit = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ'), offset = new THREE.Vector3();
  function render() {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (dragging !== 'note') { spinVelocity *= 0.95; angle += spinVelocity + dt * 0.45; }
    spinner.rotation.y = angle;
    holder.position.set(base.x, base.y + Math.sin(t * 1.1) * 0.48 * noteScale, base.z);
    const target = noteScale * (hover || dragging === 'note' ? 1.1 : 1);
    holder.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    material.emissiveIntensity = (loaded ? 1.15 : 0.85) + Math.sin(t * 2) * 0.12 + (hover ? 0.25 : 0);
    glow.material.opacity = (loaded ? 0.85 : 0.6) + Math.sin(t * 1.6) * 0.1;
    ring.rotation.z = t * 0.15; (ring.material as THREE.MeshBasicMaterial).opacity = (loaded ? 0.6 : 0.35) + Math.sin(t * 1.3) * 0.08;
    for (let i = 0; i < count; i++) {
      const a = seeds[i * 3] + t * (0.25 + (i % 7) * 0.03), r = seeds[i * 3 + 1];
      positions[i * 3] = Math.cos(a) * r; positions[i * 3 + 1] = seeds[i * 3 + 2] + Math.sin(t + i) * 0.15; positions[i * 3 + 2] = Math.sin(a) * r * 0.5;
    }
    dustGeometry.attributes.position.needsUpdate = true;
    // Camera quay cứng quanh vòng hoa văn: góc 0 trùng đúng góc chụp của ảnh.
    view.yaw += (view.yawTarget + view.swayX - view.yaw) * 0.08;
    view.pitch += (view.pitchTarget + view.swayY - view.pitch) * 0.08;
    euler.set(view.pitch, view.yaw, 0); orbit.setFromEuler(euler);
    offset.set(0, 0, CAMERA_Z).sub(pivot).applyQuaternion(orbit);
    camera.position.copy(pivot).add(offset); camera.quaternion.copy(orbit);
    renderer.render(scene, camera);
  }
  render();
  renderer.domElement.dataset.ready = 'true';

  return {
    setLoaded(value) { loaded = value; },
    setTilt(x, y) { view.swayX = -x * SWAY * 2; view.swayY = -y * SWAY; },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('dblclick', reset);
      scene.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); const own = mesh.material as THREE.MeshBasicMaterial | undefined; own?.map?.dispose(); own?.dispose(); });
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
