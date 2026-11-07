import { describe, expect, it } from 'vitest';
import { makeWalker, paths, stepWalker } from './navigation';

describe('Sinh hoạt trong trang viên', () => {
  it('mọi đường đi đều hai chiều và nối được toàn bộ khu vực', () => {
    const visited = new Set<number>(); const queue = [0];
    while (queue.length) { const node = queue.pop()!; if (visited.has(node)) continue; visited.add(node); queue.push(...paths[node].links); }
    expect(visited.size).toBe(paths.length);
    paths.forEach((node, i) => node.links.forEach(next => expect(paths[next].links).toContain(i)));
  });
  it('nhân viên chỉ chọn lối đi có sẵn, dừng khi trò chuyện và đi tiếp khi đóng thoại', () => {
    const walker = makeWalker(0); walker.rest = 0;
    stepWalker(walker, 0.1, false, () => 0);
    expect(paths[0].links).toContain(walker.target);
    const snapshot = { ...walker };
    stepWalker(walker, 5, true); expect(walker).toEqual(snapshot);
    stepWalker(walker, 10, false, () => 0);
    expect(walker.node).toBe(snapshot.target); expect(walker.moving).toBe(false);
    expect(walker.x).toBe(paths[walker.node].x); expect(walker.z).toBe(paths[walker.node].z);
  });
});
