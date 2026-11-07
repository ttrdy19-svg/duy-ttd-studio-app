import { describe, expect, it } from "vitest";
import { parseSrt, toSrt, validateSubtitleCues } from "./subtitles";
import type { SubtitleCue } from "./subtitles";

const cues: SubtitleCue[] = [
  { id: "one", start: 0.125, end: 1.8, text: "Mây bay qua núi" },
  { id: "two", start: 2, end: 3.75, text: "Gió ru bên thềm" },
];

describe("SRT phụ đề", () => {
  it("đọc SRT có BOM, CRLF, nhiều dòng và timestamp dấu chấm", () => {
    expect(
      parseSrt(
        "\uFEFF1\r\n00:00:00,125 --> 00:00:01,800\r\nMây bay\r\nqua núi\r\n\r\n2\r\n00:00:02.000 --> 00:00:03.750\r\nGió ru bên thềm\r\n",
      ),
    ).toEqual([
      { id: "srt-1", start: 0.125, end: 1.8, text: "Mây bay\nqua núi" },
      { id: "srt-2", start: 2, end: 3.75, text: "Gió ru bên thềm" },
    ]);
  });

  it("đọc cue không có số thứ tự và báo lỗi khi file sai cấu trúc", () => {
    expect(parseSrt("00:00:01,000 --> 00:00:02,000\nXin chào")[0]).toMatchObject({
      start: 1,
      end: 2,
      text: "Xin chào",
    });
    expect(() => parseSrt("")).toThrow(/chưa có phụ đề/);
    expect(() => parseSrt("1\nkhông phải timestamp\nXin chào")).toThrow(
      /Mốc thời gian/,
    );
    expect(() => parseSrt("1\n00:00:02,000 --> 00:00:01,000\nXin chào")).toThrow(
      /không hợp lệ/,
    );
    expect(() => parseSrt("1\n00:00:01,000 --> 00:00:02,000\n")).toThrow(
      /để trống/,
    );
  });

  it("xuất timestamp chuẩn SRT, đánh số cue và giữ dấu tiếng Việt", () => {
    expect(toSrt(cues, 4)).toBe(
      "1\r\n00:00:00,125 --> 00:00:01,800\r\nMây bay qua núi\r\n\r\n2\r\n00:00:02,000 --> 00:00:03,750\r\nGió ru bên thềm\r\n",
    );
  });

  it("từ chối cue rỗng, chồng lấn, sai thứ tự hoặc vượt độ dài nhạc", () => {
    expect(validateSubtitleCues([], 4)).toMatch(/Chưa có/);
    expect(validateSubtitleCues([{ ...cues[0], text: " " }], 4)).toMatch(/để trống/);
    expect(validateSubtitleCues([cues[0], { ...cues[1], start: 1 }], 4)).toMatch(/chồng/);
    expect(validateSubtitleCues([{ ...cues[0], end: 5 }], 4)).toMatch(/vượt/);
    expect(() => toSrt([{ ...cues[0], end: 0 }], 4)).toThrow(/không hợp lệ/);
  });
});
