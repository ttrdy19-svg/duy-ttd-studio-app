import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildings, makeWalker, staff, stepWalker } from './navigation';

export function createManor(host: HTMLElement, labels: HTMLElement, onSelect: (id: string) => void) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dca58f');
  scene.fog = new THREE.Fog('#dca58f', 36, 145);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(150, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      vertexShader: 'varying vec3 direction; void main(){ direction=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec3 direction; void main(){ float h=clamp(normalize(direction).y*0.5+0.5,0.0,1.0); vec3 low=vec3(0.91,0.67,0.57); vec3 rose=vec3(0.58,0.39,0.48); vec3 dusk=vec3(0.22,0.24,0.34); vec3 c=mix(low,rose,smoothstep(0.18,0.62,h)); c=mix(c,dusk,smoothstep(0.52,0.98,h)); gl_FragColor=vec4(c,1.0); }',
    })
  );
  sky.renderOrder = -10;
  scene.add(sky);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute('aria-label', 'Trang viên cổ phong 3D lúc hoàng hôn');
  host.appendChild(renderer.domElement);

  // Pleasant, eye-level isometric perspective
  const camera = new THREE.OrthographicCamera(-20, 20, 13.5, -13.5, 0.1, 260);
  camera.position.set(26, 24, 28);
  camera.zoom = 1.1;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.8, 0);
  controls.enableRotate = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minZoom = 0.75;
  controls.maxZoom = 3.5;
  controls.minPolarAngle = 0.32;
  controls.maxPolarAngle = 1.28;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.screenSpacePanning = false;
  controls.update();

  scene.add(new THREE.HemisphereLight('#ffe4d2', '#51434b', 2.1));
  const sunlight = new THREE.DirectionalLight('#ffd0a1', 4.2);
  sunlight.position.set(-24, 30, -16);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -26, right: 26, top: 24, bottom: -24, near: 1, far: 95 });
  sunlight.shadow.normalBias = 0.04;
  sunlight.shadow.bias = -0.0002;
  scene.add(sunlight);

  const fill = new THREE.DirectionalLight('#c2b5dc', 1.05);
  fill.position.set(18, 12, 20);
  scene.add(fill);
  const sunset = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#ffe2b0' })
  );
  sunset.position.set(18, 14, -43);
  scene.add(sunset);

  const solid = new THREE.Group();
  scene.add(solid);
  const placeHitboxes:THREE.Mesh[]=[];

  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: string, glow = false, roughness = 0.65, metalness = 0.05) {
    const key = `${color}_${glow}_${roughness}_${metalness}`;
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        ...(glow ? { emissive: color, emissiveIntensity: 1.2 } : {}),
      }));
    }
    return materials.get(key)!;
  }

  function mesh(geometry: THREE.BufferGeometry, color: string, parent: THREE.Object3D = solid, glow = false) {
    const object = new THREE.Mesh(geometry, material(color, glow));
    object.castShadow = !glow;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, parent: THREE.Object3D = solid, glow = false) {
    const object = mesh(new THREE.BoxGeometry(w, h, d), color, parent, glow);
    object.position.set(x, y, z);
    return object;
  }

  function sphere(x: number, y: number, z: number, radius: number, color: string, parent: THREE.Object3D = solid, glow = false) {
    const object = mesh(new THREE.SphereGeometry(radius, 14, 12), color, parent, glow);
    object.position.set(x, y, z);
    return object;
  }

  function cylinder(x: number, y: number, z: number, top: number, bottom: number, height: number, color: string, parent: THREE.Object3D = solid) {
    const object = mesh(new THREE.CylinderGeometry(top, bottom, height, 14), color, parent);
    object.position.set(x, y, z);
    return object;
  }

  // The garden shares one continuous ground with its distant lake and mountain valley.
  box(0, -0.18, 0, 120, 0.35, 120, '#64765a');
  const distantWater = mesh(new THREE.CircleGeometry(1, 64), '#4f7787');
  distantWater.material.fog = false;
  distantWater.material.roughness = 0.24;
  distantWater.material.metalness = 0.08;
  distantWater.rotation.x = -Math.PI / 2;
  distantWater.scale.set(36, 13, 1);
  distantWater.position.set(0, 0.006, -24);
  for (let i = 0; i < 18; i++) {
    const shimmer = box(-31 + i * 3.6, 0.014, -18.5 - (i % 4) * 1.25, 1.2 + (i % 3) * 0.75, 0.012, 0.055, i % 2 ? '#e5b996' : '#f0d7b2');
    shimmer.material.transparent = true;
    shimmer.material.opacity = 0.52;
  }
  for (const [x, z] of [[-13, -25], [12, -20]]) {
    const boat = new THREE.Group();
    boat.position.set(x, 0.04, z);
    solid.add(boat);
    const hull = sphere(0, 0, 0, 0.62, '#56383b', boat);
    hull.scale.set(1.45, 0.18, 0.36);
    cylinder(0, 0.38, 0, 0.025, 0.035, 0.76, '#56383b', boat);
    const sail = new THREE.Shape();
    sail.moveTo(0.04, 0.1);
    sail.lineTo(0.04, 0.7);
    sail.lineTo(0.52, 0.18);
    sail.closePath();
    const cloth = mesh(new THREE.ShapeGeometry(sail), '#e4c9a8', boat);
    cloth.position.z = 0.02;
    boat.rotation.y = x < 0 ? 0.22 : -0.3;
  }
  for (let row = 0; row < 3; row++) {
    const count = row === 0 ? 13 : 11;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * (row === 0 ? 5.2 : 6.1);
      const height = row === 0
        ? 5 + ((i * 7 + row * 5) % 7) * 0.5
        : row === 1 ? 4 + ((i * 7 + row * 5) % 6) * 0.4 : 3 + ((i * 7 + row * 5) % 6) * 0.35;
      const radius = height * 0.95;
      const peak = mesh(new THREE.ConeGeometry(radius, height, 7), row === 0 ? '#7f686c' : row === 1 ? '#aa8180' : '#c08e82');
      peak.position.set(x + (row === 1 ? 2 : 0), height / 2 - 0.75, -32 - row * 8 + (i % 3) * 1.1);
      peak.rotation.y = i * 1.7;
      peak.castShadow = false;
      peak.receiveShadow = false;
      if (row === 0 && i % 2 === 0) {
        const mist = mesh(new THREE.ConeGeometry(radius * 0.33, height * 0.38, 7), '#d9aaa0');
        mist.position.set(peak.position.x, height * 0.73 - 0.75, peak.position.z + 0.05);
        mist.rotation.y = peak.rotation.y;
        mist.castShadow = false;
        mist.receiveShadow = false;
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    const cloud = mesh(new THREE.SphereGeometry(1.5 + (i % 3) * 0.45, 12, 8), '#e8b8a7');
    cloud.position.set(-25 + i * 7.2, 3.2 + (i % 3) * 1.3, -27 - (i % 2) * 4);
    cloud.scale.set(2.4, 0.42, 0.65);
  }

  // Courtyard walkways & stone pavers
  box(0, 0.015, 2, 10.5, 0.04, 13, '#aa9179');
  box(0, 0.02, -3.6, 15.5, 0.06, 1.65, '#c7ae91');
  box(0, 0.025, 1.5, 15.5, 0.06, 1.55, '#c7ae91');
  box(0, 0.025, 7.5, 15.5, 0.06, 1.5, '#c7ae91');
  for (const x of [-7, -4.8, 4.8, 7]) box(x, 0.02, 2, 1.25, 0.05, 12.5, '#bda68b');
  for (let x = -4; x <= 4; x += 1) {
    for (let z = -2.5; z <= 6.5; z += 1) {
      box(x, 0.05, z, 0.94, 0.025, 0.94, (Math.round(x + z * 2) % 3) ? '#b79c7e' : '#cbb397');
    }
  }

  // Courtyard gold & jade ring inlay
  const inlay = mesh(new THREE.RingGeometry(1.3, 1.45, 64), '#e8ca84');
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.set(0, 0.083, 1.5);
  const middle = mesh(new THREE.CircleGeometry(0.38, 24), '#7b8b70');
  middle.rotation.x = -Math.PI / 2;
  middle.position.set(0, 0.084, 1.5);

  // --- NATIVE 3D GLTF/GLB ASSETS (COURTYARD TEA TABLE & 3D MODELS) ---
  const gltfAnimators: ((delta: number) => void)[] = [];
  const gltfLoader = new GLTFLoader();

  // 1. Chinese Tea Table (Bàn Trà Cổ Phong Poly Haven CC0)
  gltfLoader.load('./models/chinese_tea_table/chinese_tea_table_1k.gltf', (gltf) => {
    const table = gltf.scene;
    table.position.set(0, 0.08, 1.5);
    table.scale.set(1.35, 1.35, 1.35);
    table.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(table);
  }, undefined, () => {});

  // 2. Tea Chairs (Ghế Bành Cổ Phong)
  gltfLoader.load('./models/tea_chair.glb', (gltf) => {
    const chairLeft = gltf.scene;
    chairLeft.position.set(-1.25, 0.08, 1.5);
    chairLeft.rotation.y = Math.PI / 2;
    chairLeft.scale.set(0.95, 0.95, 0.95);
    chairLeft.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    scene.add(chairLeft);

    const chairRight = chairLeft.clone();
    chairRight.position.set(1.25, 0.08, 1.5);
    chairRight.rotation.y = -Math.PI / 2;
    scene.add(chairRight);
  }, undefined, () => {});

  // 3. Teacup (Chén Trà)
  gltfLoader.load('./models/teacup.glb', (gltf) => {
    const cup = gltf.scene;
    cup.position.set(0.15, 0.62, 1.45);
    cup.scale.set(0.075, 0.075, 0.075);
    scene.add(cup);
  }, undefined, () => {});

  // Copilot model files are retained; only Minh Nhi and Xing inhabit the courtyard.

  // 5. Ancient Lantern (Lồng Đèn Cổ Phong)
  gltfLoader.load('./models/ancient_lantern.glb', (gltf) => {
    const lanternObj = gltf.scene;
    lanternObj.position.set(-2.2, 0.08, 0.5);
    lanternObj.scale.set(0.22, 0.22, 0.22);
    scene.add(lanternObj);
  }, undefined, () => {});

  // 6. Crane Bird (Hạc Tiên Sải Cánh)
  gltfLoader.load('./models/crane_bird.glb', (gltf) => {
    const bird = gltf.scene;
    bird.position.set(-3.2, 7.2, -1.2);
    bird.rotation.y = Math.PI * 0.35;
    bird.scale.set(0.016, 0.016, 0.016);
    scene.add(bird);
    if (gltf.animations && gltf.animations.length) {
      const mixer = new THREE.AnimationMixer(bird);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
      gltfAnimators.push((delta) => mixer.update(delta));
    }
  }, undefined, () => {});

  // --- CUTE CHINESE FANTASY BUILDINGS ---
  function roof(parent: THREE.Group, y: number, width: number, depth: number, height: number) {
    const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
    const nx = 20, nz = 14;
    for (let iz = 0; iz <= nz; iz++) {
      for (let ix = 0; ix <= nx; ix++) {
        const tx = (ix / nx) * 2 - 1, tz = (iz / nz) * 2 - 1;
        const slope = Math.max(Math.abs(tz), Math.max(0, (Math.abs(tx) - 0.63) / 0.37));
        const lift = Math.pow(Math.max(Math.abs(tx), Math.abs(tz)), 7) * 0.42;
        vertices.push((tx * width) / 2, y + height * (1 - slope) + lift, (tz * depth) / 2);
        uv.push(ix / nx, iz / nz);
      }
    }
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const a = iz * (nx + 1) + ix, b = a + 1, c = a + nx + 1, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const surface = mesh(geometry, '#49303a', parent);
    surface.material.side = THREE.DoubleSide;

    box(0, y + height + 0.09, 0, width * 0.64, 0.16, 0.15, '#c5965f', parent);
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const tip = box(x * width * 0.48, y + 0.36, z * depth * 0.48, 0.45, 0.12, 0.15, '#d5a76c', parent);
        tip.rotation.z = -x * 0.35;
      }
    }
  }

  function lantern(x: number, y: number, z: number, parent: THREE.Object3D = solid, red = false) {
    const lColor = red ? '#e8453c' : '#f5ad38';
    cylinder(x, y, z, 0.18, 0.18, 0.38, lColor, parent);
    const light = sphere(x, y, z, 0.20, red ? '#ff6b57' : '#ffd778', parent, true);
    light.scale.set(1.1, 1.25, 1.1);
    box(x, y + 0.24, z, 0.32, 0.06, 0.32, '#503828', parent);
    box(x, y - 0.24, z, 0.24, 0.05, 0.24, '#503828', parent);
    cylinder(x, y - 0.38, z, 0.02, 0.05, 0.22, '#f6c358', parent);
  }

  function floor(parent: THREE.Group, y: number, width: number, depth: number, height: number) {
    box(0, y + height / 2, 0, width * 0.96, height, depth * 0.92, '#b88b70', parent);
    box(0, y + 0.08, 0, width + 0.3, 0.16, depth + 0.3, '#5e4140', parent);
    for (const x of [-width / 2, -width / 4, 0, width / 4, width / 2]) {
      for (const z of [-depth / 2, depth / 2]) {
        cylinder(x, y + height / 2, z, 0.10, 0.12, height + 0.18, '#50373a', parent);
      }
    }
    box(0, y + height - 0.1, depth / 2 + 0.04, width + 0.1, 0.17, 0.16, '#58383b', parent);
    box(0, y + height - 0.1, -depth / 2 - 0.04, width + 0.1, 0.17, 0.16, '#58383b', parent);

    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const x = side * width * (0.21 + i * 0.18);
        box(x, y + height * 0.56, depth / 2 + 0.015, width * 0.13, height * 0.55, 0.045, '#f1bb82', parent, true);
        for (let v = -1; v <= 1; v++) {
          box(x + v * width * 0.035, y + height * 0.56, depth / 2 + 0.05, 0.025, height * 0.56, 0.04, '#57383b', parent);
        }
        box(x, y + height * 0.56, depth / 2 + 0.07, width * 0.14, 0.035, 0.04, '#57383b', parent);
      }
      lantern(side * width * 0.45, y + height - 0.38, depth / 2 + 0.42, parent, true);
    }
    box(0, y + height * 0.43, depth / 2 + 0.03, width * 0.18, height * 0.85, 0.06, '#51353a', parent);
    box(0, y + height * 0.43, depth / 2 + 0.075, 0.035, height * 0.85, 0.03, '#c89c69', parent);
  }

  for (const building of buildings) {
    const parent = new THREE.Group();
    parent.position.set(building.x, 0, building.z);
    solid.add(parent);
    const { width: w, depth: d } = building;
    // Rạp Lưu Ảnh Thất có bảng hiệu cao và quầy vé nhô ra trước: vùng bấm phủ cả hai.
    const front=building.id==='workshop'?1.6:0,tall=building.id==='workshop'?5.3:building.height;
    const hitbox=new THREE.Mesh(new THREE.BoxGeometry(w+(front?1.4:0),tall,d+front),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hitbox.position.set(building.x,tall/2,building.z+front/2);hitbox.userData.place=building.id;scene.add(hitbox);placeHitboxes.push(hitbox);
    if(building.id==='library'){
      box(0,.18,0,w+.6,.36,d+.4,'#78604b',parent);
      for(const side of [-1,1]){box(side*1.7,.65,0,.18,1,.4,'#543a29',parent);cylinder(side*2.25,2.15,0,.24,.24,3.7,'#91713b',parent);}
      for(let slat=0;slat<23;slat++){const x=-2.1+slat*.19;const strip=cylinder(x,2.2,0,.115,.115,3.5,slat%2?'#c2a264':'#b99656',parent);strip.scale.z=.55;}
      for(const y of [.78,1.02,3.38,3.62])box(0,y,.09,4.45,.065,.045,'#493c28',parent);
      const noteColor='#493725';for(const x of [-.5,.7]){const head=sphere(x-.15,1.85,.16,.25,noteColor,parent);head.scale.set(1.3,.65,.32);box(x,2.38,.16,.095,1.15,.08,noteColor,parent);}
      const beam=box(.1,2.94,.16,1.3,.16,.08,noteColor,parent);beam.rotation.z=.1;
      continue;
    }
    if(building.id==='workshop'){
      box(0,.25,0,w+.6,.5,d+.6,'#4b3d40',parent);box(0,2,-d/2,w,3.4,.2,'#382a35',parent);
      for(const side of [-1,1]){box(side*w/2,2,0,.22,3.5,d,'#5b303c',parent);for(let curtain=0;curtain<3;curtain++)cylinder(side*(w/2-.14)-side*curtain*.15,2.25,d/2,.12,.12,2.9,curtain%2?'#803c49':'#5f293b',parent);lantern(side*w*.44,3.8,d/2,parent);}
      box(0,2.35,-d/2+.15,w*.82,2.05,.1,'#ddcbb0',parent,true);box(0,3.86,0,w+.4,.24,d+.4,'#523b3a',parent);
      // Mặt tiền rạp chiếu: bảng hiệu sáng viền bóng đèn, hai khung áp phích phát sáng và quầy vé trước cửa.
      box(0,4.42,d/2+.16,w*.72,.86,.16,'#3a1820',parent);box(0,4.42,d/2+.25,w*.62,.6,.04,'#ffd98a',parent,true);
      for(let bulb=0;bulb<14;bulb++){const t=bulb/13,x=(t-.5)*w*.7;sphere(x,4.83,d/2+.27,.055,bulb%2?'#fff1c2':'#ffb648',parent,true);sphere(x,4.01,d/2+.27,.055,bulb%2?'#ffb648':'#fff1c2',parent,true);}
      for(const y of [4.2,4.42,4.64])for(const side of [-1,1])sphere(side*w*.36,y,d/2+.27,.055,'#fff1c2',parent,true);
      for(const side of [-1,1]){box(side*(w/2+.12),2.2,d/2+.18,.62,1.05,.06,'#2a1218',parent);box(side*(w/2+.12),2.2,d/2+.22,.5,.9,.02,side<0?'#ff9a6b':'#8fb6ff',parent,true);}
      box(w/2-.35,.95,d/2+.7,.8,.9,.55,'#5b2a33',parent);box(w/2-.35,1.18,d/2+.98,.6,.3,.02,'#ffe2a8',parent,true);box(w/2-.35,1.48,d/2+.7,.95,.08,.68,'#bf9b5d',parent);
      for(let row=0;row<3;row++)for(let seat=0;seat<4;seat++){const x=(seat-1.5)*1.02,z=-.6+row*.84;box(x,.7,z,.7,.4,.65,'#813e4d',parent);box(x,1.03,z+.29,.7,.65,.14,'#6b303e',parent);}
      continue;
    }
    box(0, 0.22, 0, w + 0.65, 0.44, d + 0.65, '#725b50', parent);
    for (let i = 0; i < 3; i++) {
      box(0, 0.08 + i * 0.09, d / 2 + 0.9 - i * 0.28, 2.3, 0.16 + i * 0.18, 0.3, '#c9a477', parent);
    }
    floor(parent, 0.43, w, d, 1.7);
    roof(parent, 2.16, w + 1.15, d + 1.2, 1.15);
    if (building.id === 'hall') {
      floor(parent, 3.17, w * 0.6, d * 0.74, 1.25);
      roof(parent, 4.43, w * 0.75, d + 0.1, 1.15);
    }
    for (const side of [-1, 1]) {
      box(side * w * 0.36, 0.94, d / 2 + 0.37, w * 0.25, 0.07, 0.07, '#bb9364', parent);
      for (let k = 0; k < 5; k++) {
        box(side * (w * 0.25 + k * w * 0.055), 0.72, d / 2 + 0.37, 0.045, 0.48, 0.045, '#d0aa75', parent);
      }
    }
  }

  // Gateway
  for (const x of [-2, 2]) {
    cylinder(x, 1.35, 10.5, 0.18, 0.22, 2.7, '#754e32');
    box(x, 0.16, 10.5, 0.65, 0.32, 0.65, '#b8b297');
    lantern(x, 2.1, 10.85, solid, true);
  }
  const gate = new THREE.Group();
  gate.position.set(0, 2.7, 10.5);
  solid.add(gate);
  roof(gate, 0, 5.6, 2.1, 0.75);
  for (const x of [-9.8, 9.8]) {
    box(x, 0.55, 11.4, 10, 1.1, 0.26, '#c0bd9e');
    box(x, 1.15, 11.4, 10.3, 0.18, 0.6, '#367367');
  }

  // --- SPARKLING LOTUS POND & BRIDGE ---
  box(-11.7, 0.045, 9.1, 6.4, 0.08, 3.8, '#385f62');
  const water = mesh(new THREE.PlaneGeometry(6.1, 3.5), '#55777a');
  water.rotation.x = -Math.PI / 2;
  water.position.set(-11.7, 0.1, 9.1);

  // Lotus pads and blossoms
  for (let i = 0; i < 7; i++) {
    const lx = -13.5 + (i % 3) * 1.8 + Math.sin(i * 2) * 0.4;
    const lz = 7.8 + Math.floor(i / 3) * 1.1 + Math.cos(i * 3) * 0.3;
    const pad = mesh(new THREE.CircleGeometry(0.32 + (i % 2) * 0.08, 16), '#647e5b');
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(lx, 0.11, lz);
    if (i % 2 === 0) {
      const bloom = sphere(lx, 0.20, lz, 0.14, '#d98a9b', solid, true);
      bloom.scale.set(1.2, 0.8, 1.2);
      sphere(lx, 0.22, lz, 0.06, '#f2d09a', solid, true);
    }
  }

  const ripples: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const ripple = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.21, 32),
      new THREE.MeshBasicMaterial({ color: '#f0d7b9', transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(-13 + (i % 2) * 2.5, 0.12, 8.4 + Math.floor(i / 2) * 1.2);
    scene.add(ripple);
    ripples.push(ripple);
  }

  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const stone = mesh(new THREE.DodecahedronGeometry(0.36, 1), '#988573');
    stone.position.set(-11.7 + Math.cos(a) * 3.35, 0.16, 9.1 + Math.sin(a) * 2);
    stone.scale.y = 0.55;
  }

  for (let i = 0; i < 15; i++) {
    const x = -14.7 + i * 0.43, y = 0.35 + Math.sin((i / 14) * Math.PI) * 0.6;
    box(x, y, 9.1, 0.4, 0.12, 1.25, '#9d7c54');
    if (i % 2 === 0) {
      for (const z of [8.43, 9.77]) box(x, y + 0.35, z, 0.055, 0.75, 0.055, '#8f6a47');
    }
  }
  for (const z of [8.43, 9.77]) {
    const points = Array.from({ length: 15 }, (_, i) => new THREE.Vector3(-14.7 + i * 0.43, 0.73 + Math.sin((i / 14) * Math.PI) * 0.6, z));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.055, 6, false), '#c7a364');
  }

  // --- REFINED BONSAI FLOWERING PEACH TREES (DELICATE, NATURAL) ---
  function fairyTree(x: number, z: number, size: number, isBlossom = false) {
    cylinder(x, size * 0.45, z, size * 0.05, size * 0.09, size * 0.9, '#604437');
    for (const side of [-1, 1]) {
      const branch = cylinder(x + side * size * 0.14, size * 0.69, z, size * 0.025, size * 0.045, size * 0.58, '#604437');
      branch.rotation.z = side * 0.6;
    }
    if (isBlossom) {
      const blossomShades = ['#df8d9d', '#f0b5b5', '#f7d8c6', '#fff0d9'];
      for (let i = 0; i < 9; i++) {
        const angle = i * 2.4;
        const radius = (0.12 + (i % 3) * 0.12) * size;
        const cx = x + Math.cos(angle) * radius;
        const cy = size * (0.72 + (i % 4) * 0.12);
        const cz = z + Math.sin(angle) * radius * 0.72;
        const flowerScale = size * (0.105 + (i % 2) * 0.012);
        for (let petal = 0; petal < 5; petal++) {
          const petalAngle = (petal / 5) * Math.PI * 2;
          const floret = sphere(
            cx + Math.cos(petalAngle) * flowerScale * 0.62,
            cy + Math.sin(petalAngle) * flowerScale * 0.34,
            cz + Math.sin(petalAngle) * flowerScale * 0.48,
            flowerScale * 0.68,
            blossomShades[(i + petal) % blossomShades.length]
          );
          floret.scale.set(0.74, 0.92, 0.52);
        }
        sphere(cx, cy, cz + flowerScale * 0.28, flowerScale * 0.3, '#edc778');
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const crown = mesh(new THREE.ConeGeometry(size * (0.42 - i * 0.06), size * 0.62, 8), i % 2 ? '#61795a' : '#49634f');
        crown.position.set(x, size * (0.68 + i * 0.26), z);
        crown.rotation.y = i * 0.8;
      }
    }
  }

  for (let i = 0; i < 13; i++) {
    const x = -15.2 + i * 2.5;
    fairyTree(x, -11, 2.4 + (i % 3) * 0.35, true);
    if (i % 3 === 0) fairyTree(x, -12, 3.2, true);
  }
  for (const x of [-15.2, 15.2]) {
    for (let i = 0; i < 5; i++) fairyTree(x, -7 + i * 3.4, 2.0 + (i % 2) * 0.5, i % 2 === 1);
  }
  for (const [x, z] of [[-5.6, -0.6], [5.6, -0.6], [-5.6, 5], [5.6, 5]]) {
    box(x, 0.18, z, 0.95, 0.36, 0.95, '#8e9d85');
    fairyTree(x, z, 1.8, true);
  }

  for (const x of [-3, 3]) {
    box(x, 0.35, 4.5, 1.65, 0.13, 0.5, '#a3875d');
    for (const dx of [-0.6, 0.6]) box(x + dx, 0.15, 4.5, 0.1, 0.3, 0.38, '#7e6c4e');
  }
  for (const [x, z] of [[-4.8, -5], [4.8, -5], [-8.1, 7], [8.1, 7], [-3, 9.8], [3, 9.8]]) {
    cylinder(x, 0.9, z, 0.06, 0.08, 1.8, '#716e53');
    box(x, 1.85, z, 0.58, 0.07, 0.07, '#7d6d4a');
    lantern(x + 0.22, 1.58, z, solid, true);
  }

  // Merge static landscape
  solid.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const oldGeometries = new Set<THREE.BufferGeometry>();
  solid.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    oldGeometries.add(object.geometry);
    const collection = batches.get(object.material) ?? [];
    collection.push(geometry);
    batches.set(object.material, collection);
  });
  solid.clear();
  for (const [mat, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const object = new THREE.Mesh(merged, mat);
      object.castShadow = true;
      object.receiveShadow = true;
      solid.add(object);
    }
    geometries.forEach((g) => g.dispose());
  }
  oldGeometries.forEach((g) => g.dispose());

  // --- STYLIZED, ADULT-PROPORTION HANFU FIGURES ---
  const eyeColors: Record<string, string> = {
    'minh-nhi': '#147685',  // Sparkling azure-teal
    'hoa-an': '#663985',    // Amethyst violet
    'moc-lan': '#2b733f',   // Emerald jade
    'tu-am': '#4f2c6d',     // Deep violet
    'nhu-y': '#94384b',     // Peach ruby
    'van-trinh': '#242a35', // Obsidian slate
    'thanh-phong': '#483526',// Tiger brown
    'bach-vu': '#30393d',   // Midnight silver
  };

  const walkers = staff.map((person) => {
    const isFemale = ['minh-nhi', 'xing', 'hoa-an', 'moc-lan', 'tu-am', 'nhu-y'].includes(person.id);
    const isNhi = person.id === 'minh-nhi';
    const group = new THREE.Group();
    scene.add(group);

    // --- LONG SILK ROBES AND EMBROIDERED SHOES ---
    const leftFoot = new THREE.Group(), rightFoot = new THREE.Group();
    leftFoot.position.set(-0.11, 0.16, 0);
    rightFoot.position.set(0.11, 0.16, 0);
    group.add(leftFoot, rightFoot);

    for (const foot of [leftFoot, rightFoot]) {
      cylinder(0, -0.02, 0, 0.045, 0.05, 0.14, '#ead8c7', foot);
      const shoe = mesh(new THREE.SphereGeometry(0.085, 12, 8), isFemale ? '#6e2636' : '#392d32', foot);
      shoe.scale.set(0.82, 0.52, 1.45);
      shoe.position.set(0, -0.11, 0.05);
      sphere(0, -0.09, 0.105, 0.018, '#d4ad72', foot, true);
    }

    const robeColor = isNhi ? '#ead7bf' : person.color;
    const accentColor = isNhi ? '#782a3b' : isFemale ? '#55404a' : '#49333a';
    const gold = '#c9a166';
    const skirtProfile = isFemale
      ? [new THREE.Vector2(0.37, 0.14), new THREE.Vector2(0.38, 0.24), new THREE.Vector2(0.31, 0.53), new THREE.Vector2(0.22, 0.88), new THREE.Vector2(0.15, 1.2), new THREE.Vector2(0, 1.2)]
      : [new THREE.Vector2(0.29, 0.14), new THREE.Vector2(0.31, 0.35), new THREE.Vector2(0.25, 0.72), new THREE.Vector2(0.19, 1.1), new THREE.Vector2(0, 1.1)];
    mesh(new THREE.LatheGeometry(skirtProfile, 24), robeColor, group);
    const robePanel = new THREE.Shape();
    robePanel.moveTo(-0.15, 0.16);
    robePanel.lineTo(0.15, 0.16);
    robePanel.lineTo(0.09, 0.91);
    robePanel.lineTo(0, 1.07);
    robePanel.lineTo(-0.09, 0.91);
    robePanel.closePath();
    const panel = mesh(new THREE.ShapeGeometry(robePanel), accentColor, group);
    panel.position.z = 0.31;
    const hem = mesh(new THREE.TorusGeometry(isFemale ? 0.37 : 0.3, 0.012, 6, 32), gold, group);
    hem.rotation.x = Math.PI / 2;
    hem.position.y = 0.16;

    const bodiceProfile = [new THREE.Vector2(0.13, 1.12), new THREE.Vector2(0.16, 1.22), new THREE.Vector2(0.2, 1.4), new THREE.Vector2(0.17, 1.57), new THREE.Vector2(0.11, 1.62), new THREE.Vector2(0, 1.62)];
    mesh(new THREE.LatheGeometry(bodiceProfile, 20), accentColor, group);
    const sash = mesh(new THREE.TorusGeometry(0.17, 0.025, 7, 24), gold, group);
    sash.rotation.x = Math.PI / 2;
    sash.position.y = 1.19;
    sphere(0.08, 1.18, 0.155, 0.032, '#5e988c', group, true);
    const sashTail = box(0.12, 0.91, 0.16, 0.045, 0.4, 0.025, isNhi ? '#a84b50' : gold, group);
    sashTail.rotation.z = -0.08;

    const collarPoints = [
      new THREE.Vector3(-0.14, 1.57, 0.105),
      new THREE.Vector3(-0.075, 1.43, 0.178),
      new THREE.Vector3(0.015, 1.33, 0.198),
      new THREE.Vector3(0.14, 1.55, 0.105),
    ];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(collarPoints), 18, 0.018, 6, false), '#f4e4cc', group);

    // --- LONG SLEEVES AND DELICATE HANDS ---
    const leftArm = new THREE.Group(), rightArm = new THREE.Group();
    leftArm.position.set(-0.21, 1.48, 0);
    rightArm.position.set(0.21, 1.48, 0);
    group.add(leftArm, rightArm);

    for (const [arm, side] of [[leftArm, -1], [rightArm, 1]] as const) {
      const sleeve = mesh(new THREE.CylinderGeometry(0.095, 0.18, 0.56, 14), robeColor, arm);
      sleeve.position.set(side * 0.035, -0.27, 0);
      sleeve.rotation.z = side * 0.12;
      const cuff = mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 18), gold, arm);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(side * 0.04, -0.52, 0);
      sphere(side * 0.04, -0.61, 0.015, 0.043, '#efcbb9', arm);
    }

    // --- CELESTIAL RIBBON (MINH NHI SPECIAL) ---
    if (isNhi) {
      const ribbonPoints = [
        new THREE.Vector3(-0.46, 0.68, 0.18),
        new THREE.Vector3(-0.32, 0.98, -0.12),
        new THREE.Vector3(0, 1.08, -0.26),
        new THREE.Vector3(0.32, 0.98, -0.12),
        new THREE.Vector3(0.46, 0.68, 0.18),
        new THREE.Vector3(0.52, 0.42, 0.32),
      ];
      const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPoints);
      mesh(new THREE.TubeGeometry(ribbonCurve, 28, 0.022, 8, false), '#b75b63', group);
    }

    // --- REFINED ADULT-PROPORTION FACE AND ORNAMENTED HAIR ---
    const head = new THREE.Group();
    head.position.set(0, 1.66, 0);
    head.rotation.x = -0.04;
    group.add(head);

    cylinder(0, -0.25, 0, 0.075, 0.09, 0.2, '#efcbb9', head);
    const face = mesh(new THREE.SphereGeometry(0.3, 28, 22), '#f2d5c2', head);
    face.scale.set(0.9, 1.12, 0.82);

    const eColor = eyeColors[person.id] || '#22242a';
    for (const side of [-1, 1]) {
      const ex = side * 0.105;
      const sclera = sphere(ex, 0.025, 0.243, 0.061, '#fff5e8', head);
      sclera.scale.set(0.82, 1.12, 0.42);
      const eye = sphere(ex, 0.024, 0.288, 0.041, eColor, head);
      eye.scale.set(0.82, 1.17, 0.42);
      sphere(ex - side * 0.012, 0.042, 0.305, 0.013, '#ffffff', head, true);
      sphere(ex + side * 0.012, 0.002, 0.305, 0.006, '#ffffff', head, true);
      const lash = box(ex, 0.096, 0.244, 0.105, 0.014, 0.025, '#493139', head);
      lash.rotation.z = -side * 0.14;
      const brow = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ex - side * 0.045, 0.135, 0.235),
        new THREE.Vector3(ex, 0.15, 0.255),
        new THREE.Vector3(ex + side * 0.045, 0.13, 0.235),
      ]);
      mesh(new THREE.TubeGeometry(brow, 8, 0.009, 5, false), person.hair, head);
      const blush = sphere(side * 0.19, -0.055, 0.213, 0.047, '#dc978d', head);
      blush.scale.set(1.3, 0.48, 0.22);
    }

    sphere(0, -0.105, 0.253, 0.023, '#ad5962', head);
    const hair = mesh(new THREE.SphereGeometry(0.32, 24, 18), person.hair, head);
    hair.position.set(0, 0.075, -0.095);
    hair.scale.set(1.02, 1.03, 0.88);
    const crown = mesh(new THREE.SphereGeometry(0.32, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.57), person.hair, head);
    crown.position.set(0, 0.045, -0.005);
    crown.rotation.x = -0.08;

    for (const side of [-1, 1]) {
      const bang = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.22, 0.2, 0.16),
        new THREE.Vector3(side * 0.14, 0.1, 0.245),
        new THREE.Vector3(side * 0.08, -0.015, 0.26),
      ]);
      mesh(new THREE.TubeGeometry(bang, 12, 0.042, 8, false), person.hair, head);
      const lock = mesh(new THREE.SphereGeometry(0.09, 12, 10), person.hair, head);
      lock.position.set(side * 0.255, -0.18, 0.045);
      lock.scale.set(0.58, 1.55, 0.68);
    }

    for (const side of [-1, 1]) {
      const earring = cylinder(side * 0.145, -0.16, 0.08, 0.009, 0.012, 0.1, gold, head);
      earring.rotation.z = side * 0.08;
    }

    if (isNhi) {
      const topBun = sphere(0, 0.32, -0.075, 0.12, person.hair, head);
      topBun.scale.set(1.05, 0.9, 0.9);
      box(0, 0.34, -0.07, 0.42, 0.022, 0.022, gold, head);
      sphere(0.2, 0.34, -0.055, 0.052, '#a64450', head);
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5;
        const blossom = sphere(0.2 + Math.cos(angle) * 0.055, 0.34 + Math.sin(angle) * 0.055, -0.035, 0.032, '#eab9b1', head);
        blossom.scale.set(0.75, 1.15, 0.6);
      }
      sphere(0.2, 0.34, 0.004, 0.018, '#f1d080', head, true);
      cylinder(0.2, 0.2, -0.045, 0.008, 0.012, 0.2, '#d9bd87', head);
      const backHair = cylinder(0, -0.28, -0.2, 0.14, 0.09, 0.7, person.hair, head);
      backHair.rotation.x = -0.14;
    } else if (isFemale) {
      for (const side of [-1, 1]) {
        sphere(side * 0.22, 0.27, -0.06, 0.105, person.hair, head);
        sphere(side * 0.22, 0.28, 0.025, 0.028, gold, head);
      }
    } else {
      cylinder(0, 0.3, -0.04, 0.06, 0.07, 0.12, gold, head);
      box(0, 0.3, -0.04, 0.28, 0.025, 0.025, gold, head);
    }

    // Hitbox for raycaster selection
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.45, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    hitbox.position.y = 1.15;
    hitbox.userData.person = person.id;
    group.add(hitbox);

    const walker = makeWalker(person.node);
    walker.rest = 1 + staff.indexOf(person) * 0.7;

    // Contact shadow grounded on courtyard stones
    const contact = new THREE.Mesh(
      new THREE.CircleGeometry(0.38, 18),
      new THREE.MeshBasicMaterial({ color: '#274b48', transparent: true, opacity: 0.26, depthWrite: false })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.015;
    group.add(contact);

    return { person, group, leftFoot, rightFoot, leftArm, rightArm, head, hitbox, walker };
  });

  // Stationary architecture shadow map rendered once
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  // --- FLOATING PINK PEACH BLOSSOM PETALS ---
  const petalCount = 80;
  const petalGeometry = new THREE.BufferGeometry();
  const petalPositions = new Float32Array(petalCount * 3);
  for (let i = 0; i < petalCount; i++) {
    petalPositions[i * 3] = Math.sin(i * 12.3) * 16;
    petalPositions[i * 3 + 1] = 0.6 + (i % 12) * 0.45;
    petalPositions[i * 3 + 2] = Math.cos(i * 7.7) * 12;
  }
  petalGeometry.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));
  const petals = new THREE.Points(
    petalGeometry,
    new THREE.PointsMaterial({ color: '#ff9cb2', size: 0.09, transparent: true, opacity: 0.88 })
  );
  scene.add(petals);

  // Labels mapping
  const labelMap = new Map<string, HTMLElement>();
  labels.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => labelMap.set(el.dataset.anchor!, el));

  const projected = new THREE.Vector3();
  function placeLabel(id: string, x: number, y: number, z: number) {
    const element = labelMap.get(id);
    if (!element) return;
    projected.set(x, y, z).project(camera);
    element.style.transform = `translate(${((projected.x + 1) / 2) * host.clientWidth}px,${((1 - projected.y) / 2) * host.clientHeight}px) translate(-50%,-100%)`;
    element.style.visibility = Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1 ? 'visible' : 'hidden';
  }

  // Pointer interactions
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0, downY = 0;
  const pointerDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; };
  const pointerUp = (e: PointerEvent) => {
    if (e.button !== 0 || Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - bounds.left) / bounds.width) * 2 - 1, -((e.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(walkers.map((w) => w.hitbox), false)[0];
    if (hit) onSelect(hit.object.userData.person);
    else{const place=raycaster.intersectObjects(placeHitboxes,false)[0];if(place)onSelect(place.object.userData.place);}
  };
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);

  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    camera.left = (-16 * width) / height;
    camera.right = (16 * width) / height;
    camera.top = 16;
    camera.bottom = -16;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let selected = '', paused = false, frame = 0, lastRender = performance.now(), elapsed = 0;

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (paused || document.hidden || now - lastRender < 1000 / 30) return;
    const step = Math.min((now - lastRender) / 1000, 1);
    lastRender = now;
    elapsed += step;

    controls.update();
    gltfAnimators.forEach((anim) => anim(step));

    walkers.forEach((character, i) => {
      stepWalker(character.walker, step, character.person.id === selected);

      const moving = character.walker.moving && character.person.id !== selected;
      // Cute anime waddling hop
      const bounce = moving ? Math.abs(Math.sin(character.walker.distance * 8)) * 0.045 : Math.sin(elapsed * 2.2 + i) * 0.008;
      const hipSway = moving ? Math.sin(character.walker.distance * 8) * 0.035 : 0;

      character.group.position.set(character.walker.x, 0.02 + bounce, character.walker.z);
      character.group.rotation.y = character.walker.heading;
      character.group.rotation.z = hipSway;

      // Limb swing
      const swing = moving ? Math.sin(character.walker.distance * 8) * 0.2 : 0;
      character.leftFoot.rotation.x = swing;
      character.rightFoot.rotation.x = -swing;
      character.leftArm.rotation.x = -swing * 0.7;
      character.rightArm.rotation.x = swing * 0.7;

      // Head tilt
      character.head.rotation.z = moving ? 0 : Math.sin(elapsed * 1.5 + i) * 0.09;
      character.head.rotation.y = moving ? 0 : Math.sin(elapsed * 0.8 + i) * 0.12;

      placeLabel(character.person.id, character.walker.x, 2.72, character.walker.z);
    });

    buildings.forEach((building) => placeLabel(building.id, building.x, building.height + 0.4, building.z));

    // Water ripple expansion
    ripples.forEach((ripple, i) => {
      const phase = (elapsed * 0.28 + i * 0.23) % 1;
      ripple.scale.setScalar(0.8 + phase * 2.5);
      (ripple.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.35;
    });

    // Drifting peach blossom petals
    petals.rotation.y = Math.sin(elapsed * 0.04) * 0.08;
    const positions = petalGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < petalCount; i++) {
      positions[i * 3 + 1] -= step * 0.25;
      positions[i * 3] += Math.sin(elapsed * 1.5 + i) * 0.008;
      if (positions[i * 3 + 1] < 0.2) {
        positions[i * 3 + 1] = 4.5 + (i % 5) * 0.5;
      }
    }
    petalGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    renderer.domElement.dataset.ready = 'true';
    renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
    renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
  }

  frame = requestAnimationFrame(tick);

  return {
    setSelected(id: string) { selected = id; },
    setPaused(value: boolean) { paused = value; lastRender = performance.now(); },
    focusStaff(id: string) {
      const person = walkers.find((w) => w.person.id === id);
      if (!person) return;
      const target = new THREE.Vector3(person.walker.x, 0.8, person.walker.z);
      camera.position.add(target.clone().sub(controls.target));
      controls.target.copy(target);
      camera.zoom = 1.85;
      camera.updateProjectionMatrix();
      controls.update();
    },
    reset() {
      controls.target.set(0, 0.8, 0);
      camera.position.set(26, 24, 28);
      camera.zoom = 1.1;
      camera.updateProjectionMatrix();
      controls.update();
    },
    zoom(direction: number) {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * direction, 0.75, 3.5);
      camera.updateProjectionMatrix();
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      const geometries = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((mat) => mats.add(mat));
        }
      });
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
