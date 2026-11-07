export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

function parseSrtTime(value: string): number | null {
  const match = /^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(value);
  if (!match) return null;
  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  );
}

export function parseSrt(source: string): SubtitleCue[] {
  const blocks = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n[ \t]*\n+/)
    .filter((block) => block.trim());

  if (!blocks.length) throw new Error("File SRT chưa có phụ đề.");

  return blocks.map((block, index) => {
    const lines = block.trim().split("\n");
    if (/^\d+$/.test(lines[0].trim())) lines.shift();
    const timing = lines.shift()?.trim() ?? "";
    const match =
      /^(\d{2,}:[0-5]\d:[0-5]\d[,.]\d{3})\s+-->\s+(\d{2,}:[0-5]\d:[0-5]\d[,.]\d{3})$/.exec(
        timing,
      );
    const start = match ? parseSrtTime(match[1]) : null;
    const end = match ? parseSrtTime(match[2]) : null;
    const text = lines.join("\n").trim();

    if (start === null || end === null || end <= start) {
      throw new Error(`Mốc thời gian ở câu phụ đề ${index + 1} không hợp lệ.`);
    }
    if (!text) throw new Error(`Câu phụ đề ${index + 1} đang để trống.`);

    return { id: `srt-${index + 1}`, start, end, text };
  });
}

export function validateSubtitleCues(
  cues: SubtitleCue[],
  duration: number | null,
): string | null {
  if (!cues.length) return "Chưa có phụ đề để xuất.";
  if (!Number.isFinite(duration) || !duration || duration <= 0)
    return "Chọn bản nhạc có thời lượng đọc được trước.";
  let previousEnd = 0;
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) ||
        cue.start < 0 || cue.end <= cue.start || cue.end > duration + 0.01)
      return `Mốc thời gian phụ đề ${index + 1} không hợp lệ hoặc vượt thời lượng nhạc.`;
    if (cue.start < previousEnd - 0.001)
      return `Phụ đề ${index + 1} bị chồng thời gian với câu trước.`;
    if (!cue.text.trim()) return `Phụ đề ${index + 1} đang để trống.`;
    if (cue.text.length > 200) return `Phụ đề ${index + 1} dài quá 200 ký tự.`;
    previousEnd = cue.end;
  }
  return null;
}

function toSrtTime(seconds: number): string {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((milliseconds % 60_000) / 1000);
  const remainder = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")},${String(remainder).padStart(3, "0")}`;
}

export function toSrt(cues: SubtitleCue[], duration: number | null): string {
  const error = validateSubtitleCues(cues, duration);
  if (error) throw new Error(error);
  return srtText(cues);
}

// Chữ SRT của các câu, không kiểm tra mốc (để sửa thô cả khi đang có câu sai mốc).
export function srtText(cues: SubtitleCue[]): string {
  return `${cues
    .map(
      (cue, index) =>
        `${index + 1}\r\n${toSrtTime(cue.start)} --> ${toSrtTime(cue.end)}\r\n${cue.text.trim()}`,
    )
    .join("\r\n\r\n")}\r\n`;
}
