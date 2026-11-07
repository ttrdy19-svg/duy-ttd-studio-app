export function clock(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

// Nhận "mm:ss.mmm", "m:ss" hoặc số giây; trả null nếu không đọc được.
export function parseClock(text: string): number | null {
  const value = text.trim().replace(',', '.');
  const match = value.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const seconds = Number(match[1] || 0) * 60 + Number(match[2]);
  return Number.isFinite(seconds) ? seconds : null;
}

export function duration(seconds: number) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Giống backend: tên bài chỉ là phần đầu, bỏ "(thể loại)" ở cuối, phần sau dấu " - " (phong cách) và lấy trong 《…》 nếu có.
export function songName(title: string, genre = '') {
  let text = String(title || '').trim();
  const quoted = text.match(/《([^》]+)》/);
  if (quoted) text = quoted[1].trim();
  text = text.split(/\s+[-–—]\s+/)[0].trim();
  const match = text.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (match && genre && match[2].trim().toLowerCase() === genre.trim().toLowerCase()) text = match[1];
  return text;
}

// Viết hoa chữ cái đầu mỗi từ của tên bài (dùng in lên thumbnail).
export function displayTitle(title: string, genre = '') {
  const text = songName(title, genre);
  return text.replace(/\s+/g, ' ').split(' ').map(word => {
    const i = word.search(/\p{L}/u);
    return i < 0 ? word : word.slice(0, i) + word[i].toLocaleUpperCase('vi') + word.slice(i + 1);
  }).join(' ');
}

export function message(error: unknown) { return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(error); }
