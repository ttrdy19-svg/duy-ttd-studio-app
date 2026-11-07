export interface ReleaseBrief { title: string; artist: string; theme: string; style: string; credits: string; lyrics: string; links: { label: string; url: string }[]; tags: string[] }
export interface ReleasePackage { title: string; description: string; tags: string[]; privacyStatus: 'private'; madeForKids: null; needsReview: string[] }
export function prepareRelease(brief: ReleaseBrief): ReleasePackage {
  const title = brief.title.trim(), artist = brief.artist.trim();
  if (!title) throw new Error('Cần tên tác phẩm trước khi chuẩn bị phát hành.');
  const finalTitle = artist ? `${title} — ${artist}` : title;
  if ([...finalTitle].length > 100) throw new Error('Tiêu đề dài quá 100 ký tự.');
  const sections = [brief.theme.trim(), brief.style.trim() ? `Phong cách: ${brief.style.trim()}` : '', brief.credits.trim(), brief.lyrics.trim() ? `LỜI BÀI HÁT\n${brief.lyrics.trim()}` : ''].filter(Boolean);
  const links = brief.links.map(link => {
    const url = new URL(link.url); if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Liên kết phát hành không hợp lệ.');
    return `${link.label.trim() || url.hostname}: ${url.href}`;
  });
  if (links.length) sections.push(links.join('\n'));
  const description = sections.join('\n\n');
  if ([...description].length > 5000) throw new Error('Mô tả dài quá 5.000 ký tự.');
  const tags = [...new Set(brief.tags.map(tag => tag.trim()).filter(Boolean))];
  if (tags.join(',').length > 450) throw new Error('Danh sách thẻ quá dài; hãy rút gọn trước khi tải lên.');
  return { title: finalTitle, description, tags, privacyStatus: 'private', madeForKids: null,
    needsReview: ['Xác nhận quyền sử dụng nhạc và hình ảnh', 'Chọn đối tượng người xem', 'Duyệt tiêu đề và mô tả', 'Kết nối kênh và xác nhận tải lên'] };
}
export function releaseAsText(release: ReleasePackage) {
  return `${release.title}\n\n${release.description}\n\nTHẺ\n${release.tags.join(', ')}\n`;
}
