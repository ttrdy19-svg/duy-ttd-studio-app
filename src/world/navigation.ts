export interface Waypoint { x: number; z: number; links: number[] }
// Authored paths follow the courtyard and entrances, never through a building or pond.
export const paths: Waypoint[] = [
  { x: 0, z: 1.5, links: [1, 4, 5, 11] },
  { x: 0, z: -3.6, links: [0, 2, 3] },
  { x: -4.8, z: -3.6, links: [1, 6, 7] },
  { x: 4.8, z: -3.6, links: [1, 9, 10] },
  { x: -4.8, z: 1.5, links: [0, 7, 12] },
  { x: 4.8, z: 1.5, links: [0, 10, 13] },
  { x: -7, z: -3.6, links: [2, 7] },
  { x: -7, z: 1.5, links: [2, 4, 6, 8] },
  { x: -7, z: 5, links: [7, 12] },
  { x: 7, z: -3.6, links: [3, 10] },
  { x: 7, z: 1.5, links: [3, 5, 9, 14] },
  { x: 0, z: 7.5, links: [0, 12, 13] },
  { x: -4.8, z: 7.5, links: [4, 8, 11] },
  { x: 4.8, z: 7.5, links: [5, 11, 14] },
  { x: 7, z: 5, links: [10, 13] },
];
export interface Walker {
  node: number; target: number; x: number; z: number; moving: boolean;
  rest: number; distance: number; heading: number;
}
export function makeWalker(node: number): Walker {
  return { node, target: node, x: paths[node].x, z: paths[node].z, moving: false, rest: 1, distance: 0, heading: 0 };
}
export function stepWalker(walker: Walker, delta: number, paused: boolean, random = Math.random) {
  if (paused) return;
  if (!walker.moving) {
    walker.rest -= delta;
    if (walker.rest > 0) return;
    const options = paths[walker.node].links;
    walker.target = options[Math.min(options.length - 1, Math.floor(random() * options.length))];
    walker.moving = true;
  }
  const destination = paths[walker.target];
  const dx = destination.x - walker.x, dz = destination.z - walker.z;
  const remaining = Math.hypot(dx, dz), travel = Math.min(remaining, delta * 1.25);
  walker.heading = Math.atan2(dx, dz);
  if (remaining > 0) { walker.x += dx / remaining * travel; walker.z += dz / remaining * travel; }
  walker.distance += travel;
  if (remaining <= travel + 0.001) {
    walker.x = destination.x; walker.z = destination.z;
    walker.node = walker.target; walker.moving = false; walker.rest = 1.5 + random() * 4;
  }
}

export const staff = [
  { id: 'minh-nhi', name: 'Minh Nhi', role: 'Quản sự', color: '#94d7d1', hair: '#20232d', node: 0, greeting: 'Công tử giao bản nhạc cho thiếp nhé. Thiếp đưa sang Họa thất làm ảnh minh họa và phụ đề trước; có ảnh rồi mới vào Lưu Ảnh Thất.' },
  { id: 'xing', name: 'Xing', role: 'Phụ tá', color: '#b4c992', hair: '#483b2a', node: 6, greeting: 'Công tử muốn chọn nhạc trong Tàng Âm Các hay ghé Họa thất? Thiếp dẫn đường.' },
];
export const buildings = [
  { id: 'hall', name: 'Đại sảnh', subtitle: 'Sổ tài khoản', x: 0, z: -7, width: 8, depth: 4.2, height: 5.9 },
  { id: 'study', name: 'Phòng trưng bày', subtitle: 'Đăng video · Phát hành nhạc', x: -10.3, z: -3.5, width: 5, depth: 4, height: 3.4 },
  { id: 'art', name: 'Họa thất', subtitle: 'Hình ảnh · Sắc màu', x: -10.3, z: 4.6, width: 5, depth: 4, height: 3.4 },
  { id: 'workshop', name: 'Lưu Ảnh Thất', subtitle: 'Dựng hình · Ghép nhạc', x: 10.3, z: -3.5, width: 5.3, depth: 4, height: 3.4 },
  { id: 'library', name: 'Tàng Âm Các', subtitle: 'Kho nhạc · Sổ trúc', x: 10.3, z: 4.6, width: 5, depth: 4, height: 3.4 },
];
