import { describe, expect, it } from "vitest";
import { distributeTime, frameAt, imageRect, timelineError } from "./timeline";

describe("Timeline video", () => {
  it("chia đủ thời lượng nhạc, không mất phần lẻ ở cảnh cuối", () => {
    const times = distributeTime(3, 10);
    expect(times[0]).toBe(3.33);
    expect(times.reduce((sum, value) => sum + value, 0)).toBeCloseTo(10, 8);
    expect(distributeTime(0, 10)).toEqual([]);
  });
  it("chặn thiếu nhạc/ảnh, cảnh rỗng và timeline lệch nhạc", () => {
    expect(timelineError([], 10)).toContain("ít nhất một ảnh");
    expect(timelineError([10], null)).toContain("thời lượng");
    expect(timelineError([NaN], 10)).toContain("0,1");
    expect(timelineError([3, 3], 10)).toContain("chưa khớp");
    expect(timelineError([601], 601)).toContain("10 phút");
    expect(timelineError([4, 6], 10)).toBeNull();
  });
  it("đổi đúng cảnh ở biên, hòa tan trước biên và giữ ảnh cuối hết nhạc", () => {
    expect(frameAt([3, 7], 0, "fade")).toEqual({
      current: 0,
      next: 1,
      blend: 0,
    });
    expect(frameAt([3, 7], 2.7, "fade").blend).toBeCloseTo(0.5);
    expect(frameAt([3, 7], 2.7, "cut").blend).toBe(0);
    expect(frameAt([3, 7], 3, "fade").current).toBe(1);
    expect(frameAt([3, 7], 10, "fade")).toEqual({
      current: 1,
      next: 1,
      blend: 0,
    });
  });
  it("giới hạn hòa tan để cảnh ngắn không bị nuốt toàn bộ", () => {
    expect(frameAt([0.2, 0.2], 0.1, "fade").blend).toBe(0);
    expect(frameAt([0.2, 0.2], 0.15, "fade").blend).toBeCloseTo(0.5);
  });
  it("giữ tỉ lệ ảnh cho cover và contain, căn giữa phần crop/viền", () => {
    expect(imageRect(100, 100, 1280, 720, "cover")).toEqual({
      x: 0,
      y: -280,
      width: 1280,
      height: 1280,
    });
    expect(imageRect(100, 100, 1280, 720, "contain")).toEqual({
      x: 280,
      y: 0,
      width: 720,
      height: 720,
    });
  });
});
