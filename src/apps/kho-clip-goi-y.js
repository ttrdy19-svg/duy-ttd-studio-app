// Luật chọn clip dùng chung cho giao diện và CLI; không truy cập đĩa / dịch vụ AI.
export const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
const text = s => typeof s === 'string' ? s : '';
export function suyNhan(plan = {}, c = {}, file = '') {
  const ta = fold([c.ta, c.veoTa, file].join(' '));
  const style = fold(c.phongCach || (c.nv === false ? plan.phongCachCanh : '') || plan.phongCach || file);
  const character = fold([c.nhanVat, plan.nhanVat, plan.caSi, style, ta].join(' '));
  const nhanVat = text(c.nhanVat) || (c.nv === false ? 'không người' : text(plan.nhanVat) ||
    (/du ca|silver.hair|eastern.bard/.test(character) ? 'Du Ca lãng tử tóc bạc' : /xing/.test(character) ? 'Xing + chó' : text(plan.caSi)));
  const hanhDong = c.hanhDong || (/tango/.test(ta) ? 'nhảy tango' : c.nhep || /^nhep-/i.test(file) ? 'nhép' : /danc|nhay|mua/.test(ta) ? 'nhảy' : /walking|walks|di bo/.test(ta) ? 'đi' : /standing|stands|dung/.test(ta) ? 'đứng' : c.nv === false ? 'cảnh vật' : '');
  const boiCanh = c.boiCanh || [['quán trà', /tea.?house|quan tra/], ['phố đêm', /night.*street|pho dem/], ['sông', /river|song\b/], ['núi', /mountain|\bnui\b/], ['rừng tre', /bamboo/], ['biển', /sea|ocean|bien\b/]].find(([, re]) => re.test(ta))?.[0] || '';
  // Cận ưu tiên hơn trung ("medium close-up"); không tự đoán xa cho cảnh nhép thiếu mô tả.
  const canh = ['xa', 'trung', 'cận'].includes(c.canh) ? c.canh : /close.up|portrait|can can|can mat/.test(ta) ? 'cận' : /wide|distant|long.shot|toan canh|canh xa/.test(ta) ? 'xa' : /medium|trung canh|canh trung/.test(ta) ? 'trung' : '';
  const phongCach = c.phongCach || (/cartoon|animation|anime|hoat hinh/.test(style) ? 'hoạt hình' : /photoreal|cinematic|dien anh/.test(style) && /ancient|eastern|historical|co phong/.test(style) ? 'cổ phong điện ảnh' : /photoreal|cinematic|dien anh/.test(style) ? 'điện ảnh' : text(plan.phongCach));
  const tieng = c.tieng || plan.tieng || (/[一-鿿]/.test(plan.bai || '') ? 'zh' : /[\u00c0-\u1eff]/.test(plan.bai || '') ? 'vi' : plan.bai ? 'en' : '');
  return { nhanVat, hanhDong, boiCanh, canh, phongCach, tieng };
}
export function thoiLuongCanh(plan, c) {
  if (Number(c.den) > Number(c.tu)) return c.den - c.tu;
  const d = plan.doan?.find(d => d.ten === c.doan);
  return d ? (d.den - d.tu) / plan.canh.filter(x => x.doan === c.doan).length : Number(c.thoiLuong) || 0;
}
export function canhBaoGanNhat(clip, recent) {
  const uses = clip.daDung || [];
  return recent.length >= 2 && recent.slice(0, 2).every(bai => uses.some(u => (typeof u === 'string' ? u : u.bai) === bai)) ? 'Đã dùng ở 2 MV gần nhất' : '';
}
export function goiY(plan, items) {
  const used = new Set(), warnings = [];
  const byKey = new Map(items.flatMap(i => [[i.id, i], [i.path, i]]));
  const canonical = key => byKey.get(key)?.id || key;
  const recent = [...new Map(items.flatMap(i => (i.daDung || []).map(u => typeof u === 'string' ? { bai: u, luc: '' } : u))
    .filter(u => u.bai !== plan.bai).sort((a, b) => String(b.luc).localeCompare(String(a.luc))).map(u => [u.bai, u])).keys()].slice(0, 2);
  // Giữ lựa chọn tay, không bao giờ đề xuất cùng clip hai lần trong một MV.
  for (const c of plan.canh) if (c.dungLai?.clip) {
    const key = canonical(c.dungLai.clip);
    if (used.has(key)) throw new Error(`Clip lặp trong MV: ${c.dungLai.clip}`);
    used.add(key);
  }
  const tango = /tango/.test(fold([plan.theLoai, plan.prompt, plan.sunoPrompt, plan.phongCach, ...plan.canh.map(c => `${c.ta || ''} ${c.veoTa || ''} ${c.hanhDong || ''}`)].join(' ')));
  const rows = plan.canh.map((c, i) => ({ c, i, len: thoiLuongCanh(plan, c) }));
  // Chọn cảnh nhảy trước để clip tango không bị cảnh đứng lấy mất.
  rows.sort((a, b) => Number(/tango/.test(fold(suyNhan(plan, b.c).hanhDong))) - Number(/tango/.test(fold(suyNhan(plan, a.c).hanhDong))));
  const result = rows.map(({ c, i, len }) => {
    const target = suyNhan(plan, c);
    const candidates = items.filter(clip => {
      if (!['video', 'nhep'].includes(clip.loai) || used.has(canonical(clip.path))) return false;
      if (!target.nhanVat || !target.phongCach || fold(clip.nhanVat) !== fold(target.nhanVat) || fold(clip.phongCach) !== fold(target.phongCach)) return false;
      const lip = clip.loai === 'nhep' || /nhep|dreamina/.test(fold(clip.nguon)) || /nhep/.test(fold(clip.hanhDong));
      // Cảnh nhép đích phải tái sử dụng clip nhép. Cận/trung cần cùng bài, tiếng và chính cảnh gốc để giữ mốc giọng.
      if (c.nhep && !lip) return false;
      if (lip && clip.canh !== 'xa' && (!plan.bai || !target.tieng || clip.bai !== plan.bai || clip.tieng !== target.tieng || String(clip.canhId) !== String(c.id))) return false;
      if (lip && !['xa', 'trung', 'cận'].includes(clip.canh)) return false;
      return true;
    }).map(clip => {
      let diem = 60; const reasons = ['cùng nhân vật, phong cách'];
      if (target.hanhDong && fold(clip.hanhDong) === fold(target.hanhDong)) { diem += 25; reasons.push('cùng hành động'); }
      if (target.boiCanh && fold(clip.boiCanh) === fold(target.boiCanh)) { diem += 10; reasons.push('cùng bối cảnh'); }
      if (target.canh && clip.canh === target.canh) diem += 5;
      if (tango && clip.hanhDong === 'nhảy tango' && !c.nhep) { diem += 20; reasons.push('ưu tiên tango'); }
      const canhBao = canhBaoGanNhat(clip, recent);
      if (canhBao) diem -= 15;
      if (len && (clip.thoiLuong || clip.giay) && len > (clip.thoiLuong || clip.giay)) reasons.push('clip ngắn: cần kéo dài thuận chiều');
      return { clip: clip.path, id: clip.id, diem, lyDo: reasons.join('; '), canhBao, hanhDong: clip.hanhDong };
    }).sort((a, b) => b.diem - a.diem || a.clip.localeCompare(b.clip));
    const chosen = c.dungLai ? { ...c.dungLai, diem: null, canhBao: canhBaoGanNhat(items.find(x => x.path === c.dungLai.clip || x.id === c.dungLai.clip) || {}, recent), hanhDong: items.find(x => x.path === c.dungLai.clip || x.id === c.dungLai.clip)?.hanhDong } : candidates[0] || null;
    if (chosen) used.add(canonical(chosen.clip));
    return { index: i, canh: c.id, thoiLuong: len, goiY: chosen, ungVien: candidates.slice(0, 5) };
  }).sort((a, b) => a.index - b.index);
  if (tango) {
    const total = result.reduce((s, r) => s + r.thoiLuong, 0);
    const dance = result.reduce((s, r) => s + (r.goiY?.hanhDong === 'nhảy tango' || !r.goiY && suyNhan(plan, plan.canh[r.index]).hanhDong === 'nhảy tango' ? r.thoiLuong : 0), 0);
    if (!total || dance < total / 3) warnings.push(`Tango: nhảy ${dance.toFixed(1)}/${total.toFixed(1)} giây, cần ≥ 1/3 thời lượng; bổ sung cảnh nhảy.`);
  }
  return { canh: result, canhBao: warnings };
}
