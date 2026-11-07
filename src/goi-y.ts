// Chủ tịch yêu cầu (2026-11-02): mọi chỗ có mũi tên thả xuống (ô chọn, dòng gập/mở) phải nổi bật và rê chuột vào có chú thích.
// Chỗ nào chưa tự ghi chú thích thì gắn tự động lúc rê chuột: ô chọn → "Bấm để chọn <tên ô> (đang: …)",
// dòng gập/mở → "Bấm để mở/gập: <tiêu đề>". Chú thích tự gắn được tính lại mỗi lần rê (giá trị/trạng thái có thể đã đổi).
export function goiYTuDong(element: Element | null): string | null {
  if (!element) return null;
  if (element.tagName === 'SUMMARY') {
    const open = (element.parentElement as HTMLDetailsElement | null)?.open;
    return `Bấm để ${open ? 'gập' : 'mở'}: ${element.textContent?.trim() || 'mục này'}`;
  }
  if (element.tagName === 'SELECT') {
    const select = element as HTMLSelectElement;
    const label = select.closest('label');
    const name = select.getAttribute('aria-label') || (label ? [...label.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(' ').trim() : '') || 'mục này';
    const now = select.selectedOptions?.[0]?.textContent?.trim();
    return `Bấm để chọn ${name}${now ? ` (đang: ${now})` : ''}`;
  }
  return null;
}

export function batGoiY(root: Document = document) {
  root.addEventListener('pointerover', event => {
    const element = (event.target as Element | null)?.closest?.('select, summary') as HTMLElement | null;
    if (!element || (element.title && !element.dataset.goiY)) return;
    const text = goiYTuDong(element);
    if (text) { element.title = text; element.dataset.goiY = '1'; }
  }, true);
}
