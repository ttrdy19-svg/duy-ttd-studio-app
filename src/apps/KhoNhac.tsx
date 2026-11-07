import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, FolderOpen, Image as ImageIcon, LayoutGrid, List, Music4, Search, X } from 'lucide-react';
import type { Album, Catalog, CatalogSong, KhoTep, KhoTepKind } from './types';
import '@fontsource/dancing-script/600.css';
import './kho-nhac.css';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const fileUrl = (file: string) => 'file:///' + encodeURI(file.replace(/\\/g, '/')).replace(/#/g, '%23');
const date = (ts?: number | null) => ts ? new Date(ts).toLocaleDateString('vi-VN') : '';
// Tên tác phẩm: bỏ hậu tố phân biệt "(Country, rock)" như kho S2 (displaySongTitle) — hậu tố chỉ để tách thư mục/dữ liệu.
const workTitle = (s: CatalogSong) => s.title.replace(/\s*\([^)]*\)\s*$/, '').trim() || s.title;
// Gom phiên bản cùng tác phẩm theo tên đã chuẩn hóa (normalizedSongGroupTitle của kho S2).
const workKey = (s: CatalogSong) => workTitle(s).normalize('NFC').replace(/[​-‍⁠﻿]/g, '').replace(/[‘’`´]/g, "'").replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');
// Màu theo ca sĩ (bảng màu cố định của kho S2 + màu riêng cho Duy TTD, Xing).
const SINGER_COLOR: Record<string, string> = { 'chú lạ': '#36a66f', 'minh nhi': '#e45f72', 'chú lạ ft minh nhi': '#c58a3c', 'người hát rong': '#f07850', 'the wayfaring bard': '#b575e6', 'duy ttd': '#3d8fd6', xing: '#e8a33a' };
const singerColor = (name: string) => SINGER_COLOR[name.trim().toLocaleLowerCase('vi')] || `hsl(${[...name].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 0) % 360} 60% 52%)`;
const KIND_LABEL: Partial<Record<KhoTepKind, string>> = { master: 'Master', goc: 'Gốc', srt: 'Phụ đề', kyam: 'Ký âm PDF', musicxml: 'MusicXML', midi: 'MIDI', hopam: 'Hợp âm', 'thumb-mv': 'Thumb MV', 'thumb-tiktok': 'Thumb TikTok', 'thumb-dis': 'Thumb DistroKid', minhhoa: 'Ảnh minh họa', thumb: 'Thumbnail', video: 'Video', anh: 'Ảnh', nhac: 'Nhạc', khac: 'Khác' };
const hasYoutubeLink = (s: CatalogSong) => (s.info?.links || []).some(l => /youtube|youtu\.be/i.test(l.platform + ' ' + l.url));
// Màu ngôn ngữ, chủ đề, phong cách theo bảng màu kho S2 (songLanguageColor, CUSTOM_THEME_PALETTE, GENRE_COLOR_FIXED).
const LANGUAGE_COLOR: Record<string, string> = { 'Việt': '#35C98A', 'Trung Quốc': '#F0647A', Anh: '#59A8FF', Croatia: '#B77AF0', 'Ý': '#F2B84B', 'Nhật': '#FF7F9F', Indo: '#F28C45' };
const PALETTE = ['#43BCCD', '#F4D35E', '#EE6C4D', '#8E7DBE', '#4CAF78', '#E56B9F', '#4D96FF', '#F29E4C', '#7CB342', '#B86BCE', '#00A6A6', '#D95D39', '#6C8CD5', '#A67C52', '#D1495B', '#52B788'];
const GENRE_FIXED: Record<string, string> = { acoustic: '#2F86C9', pop: '#A469C2', ballad: '#C58A3C', 'pop ballad': '#35B96F', rock: '#C84B4B', 'r&b': '#755CC7', lofi: '#4F8F87', 'lofi r&b': '#4F8F87', edm: '#3F78D7', jazz: '#B6813D', folk: '#71964A', vinahouse: '#E064B7' };
const hashColor = (s: string) => PALETTE[[...s.toLocaleLowerCase('vi')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
const genreColor = (g: string) => GENRE_FIXED[g.toLocaleLowerCase('vi')] || hashColor(g);
const genreParts = (s: CatalogSong) => s.genre.split(',').map(g => g.trim()).filter(Boolean);
// Chữ cái đầu của tên bài (firstLetterOf kho S2): bỏ dấu, riêng Đ giữ nguyên.
const firstLetter = (t: string) => { const c = t.trim().charAt(0).toUpperCase(); return c === 'Đ' ? 'Đ' : c.normalize('NFD').replace(/[̀-ͯ]/g, ''); };
const NO_LANGUAGE = '__chua-co__';

interface Work { key: string; title: string; versions: CatalogSong[]; singers: string[] }
// Trạng thái phát hành của một tác phẩm, đúng logic kho S2 (mnqRebuildWorkMetaIndex): gộp mọi phiên bản + album.
function workMeta(w: Work, albums: Album[]) {
  const v = w.versions, inAlbums = albums.filter(a => a.tracks.some(t => v.some(s => s.id === t.songId)));
  const youtube = v.filter(s => s.info?.published.youtube || hasYoutubeLink(s)).length + v.filter(s => s.info?.published.shorts).length + inAlbums.filter(a => a.youtubeEnabled).length;
  return {
    youtube, shorts: v.some(s => s.info?.published.shorts),
    release: v.some(s => s.info?.published.distrokid) || inAlbums.some(a => a.tuneCore),
    tiktok: v.filter(s => s.info?.published.tiktok && (s.info?.tiktokThumbs || 0) > 0).length, bilibili: v.filter(s => s.info?.published.bilibili && (s.info?.bilibiliThumbs || 0) > 0).length,
    suno: v.filter(s => (s.info?.links || []).some(l => /suno/i.test(l.platform + l.url))).length, albums: inAlbums,
    cover: v.some(s => s.info?.workCover), claim: v.some(s => s.info?.claimYoutube), v60: v.some(s => s.info?.v60), isrc: v.map(s => s.info?.isrc).filter(Boolean) as string[],
    beat: v.some(s => s.info?.memento),
    languages: [...new Set(v.flatMap(s => s.languages))], themes: [...new Set(v.flatMap(s => s.themes))].sort((a, b) => a.localeCompare(b, 'vi')),
    meaning: v.map(s => s.info?.meaning).find(Boolean) || '', created: Math.min(...v.map(s => s.info?.createdAt || Infinity)), updated: Math.max(...v.map(s => s.updatedAt || 0)),
  };
}
// Bộ lọc tình trạng: Cover, Phát hành, Bán beat, YouTube như kho S2 (ô thống kê bấm được) + tình trạng file của app mới.
type Flag = 'cover' | 'release' | 'beat' | 'youtube' | 'chua-youtube' | 'loi' | 'thieu-loi' | 'thumb' | 'kyam';
const FILE_FLAGS: [Flag, string, string][] = [['chua-youtube', 'Chưa lên YouTube', 'Tác phẩm chưa có nguồn YouTube nào'], ['loi', 'Có lời', 'Có lời bài hát'], ['thieu-loi', 'Thiếu lời', 'Có phiên bản chưa có lời'],
  ['thumb', 'Có thumbnail', 'Có thumbnail trong thư mục bài'], ['kyam', 'Có ký âm', 'Đã có bản ký âm PDF']];

// Kho nhạc (giao diện mới, thay app S2 nhúng cũ) — giữ đủ thông tin kho S2: mỗi thẻ là MỘT tác phẩm gom mọi phiên bản (ca sĩ ×
// phong cách); ô lớn ghi tên bài + ca sĩ, màu theo ca sĩ; nhãn phát hành (YouTube, Phát hành/DistroKid–TuneCore, TikTok, Bilibili,
// Suno, Album, Cover, Claim, V6.0, ISRC), ngôn ngữ, chủ đề, file cạnh bài. Bấm thẻ: chi tiết từng phiên bản, nghe, ký âm, link.
export default function KhoNhac({ onOld }: { onOld?: () => void }) {
  const bridge = window.manorApps;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [files, setFiles] = useState<Record<string, KhoTep[]>>({});
  const [albums, setAlbums] = useState<Album[]>([]);
  const [query, setQuery] = useState(''), [singer, setSinger] = useState(''), [genre, setGenre] = useState(''), [theme, setTheme] = useState('');
  const [langs, setLangs] = useState<string[]>([]), [letter, setLetter] = useState('');
  const [flags, setFlags] = useState<Flag[]>([]);
  const [sort, setSort] = useState<'moi' | 'az' | 'za'>('moi');
  // Gọn: mỗi tác phẩm một thẻ (gom phiên bản); Đầy đủ: mỗi phiên bản một thẻ — như nút Gọn/Đầy đủ của kho S2.
  const [density, setDensity] = useState<'gon' | 'day-du'>('gon');
  const [layout, setLayout] = useState<'luoi' | 'danh-sach'>('luoi');
  const [chon, setChon] = useState(''), [version, setVersion] = useState(''), [tab, setTab] = useState<'thong-tin' | 'loi' | 'tep'>('thong-tin');
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [step, setStep] = useState<{ step: string; percent: number } | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => { setDraft(null); }, [chon, version]);

  useEffect(() => {
    if (!bridge?.catalog) return;
    bridge.catalog().then(setCatalog, e => setError(message(e)));
    bridge.khoTep?.().then(setFiles, () => {});
    bridge.albums?.().then(setAlbums, () => {});
  }, [bridge]);

  const songs = catalog?.songs || [];
  // Tác phẩm = gom mọi phiên bản cùng tên (dùng cho thống kê và chế độ Gọn); chế độ Đầy đủ: mỗi phiên bản một thẻ.
  const groups = useMemo(() => {
    const map = new Map<string, Work>();
    for (const s of songs) { const k = workKey(s); const w = map.get(k) || { key: k, title: workTitle(s), versions: [], singers: [] }; w.versions.push(s); if (s.singer && !w.singers.includes(s.singer)) w.singers.push(s.singer); map.set(k, w); }
    return [...map.values()];
  }, [songs]);
  const works = useMemo(() => density === 'gon' ? groups : songs.map(s => ({ key: s.id, title: workTitle(s), versions: [s], singers: s.singer ? [s.singer] : [] })), [density, groups, songs]);
  const metas = useMemo(() => new Map([...groups, ...works].map(w => [w.key, workMeta(w, albums)])), [groups, works, albums]);
  const cover = (id: string) => { const f = files[id] || []; return (f.find(x => x.kind === 'thumb-mv') || f.find(x => x.kind === 'thumb' && /16x9/.test(x.name)) || f.find(x => x.kind === 'minhhoa') || f.find(x => x.kind === 'thumb-dis') || f.find(x => x.kind === 'thumb-tiktok') || f.find(x => x.kind === 'anh'))?.url; };
  const has = (id: string, kind: KhoTepKind) => (files[id] || []).some(x => x.kind === kind);
  // Bảng thống kê đếm theo TÁC PHẨM (như kho S2): ca sĩ, ngôn ngữ, chủ đề, phong cách.
  const countWorks = (pick: (w: Work) => string[]) => [...groups.reduce((m, w) => { for (const v of new Set(pick(w))) m.set(v, (m.get(v) || 0) + 1); return m; }, new Map<string, number>())];
  const singers = useMemo(() => countWorks(w => w.singers.length ? w.singers : ['Chưa có ca sĩ']).sort((a, b) => a[0].localeCompare(b[0], 'vi')), [groups]); // eslint-disable-line react-hooks/exhaustive-deps
  const languages = useMemo(() => countWorks(w => metas.get(w.key)!.languages), [groups, metas]); // eslint-disable-line react-hooks/exhaustive-deps
  const noLanguage = groups.filter(w => !metas.get(w.key)?.languages.length).length;
  const themes = useMemo(() => countWorks(w => metas.get(w.key)!.themes).sort((a, b) => a[0].localeCompare(b[0], 'vi')), [groups, metas]); // eslint-disable-line react-hooks/exhaustive-deps
  const genres = useMemo(() => countWorks(w => w.versions.flatMap(genreParts)).sort((a, b) => a[0].localeCompare(b[0], 'vi')), [groups]); // eslint-disable-line react-hooks/exhaustive-deps
  const stat = (test: (m: ReturnType<typeof workMeta>) => boolean) => groups.filter(w => test(metas.get(w.key)!)).length;
  const needle = fold(query.trim());
  // Tìm như kho S2: tên bài, ca sĩ, phong cách, chủ đề, LỜI BÀI HÁT, mã ISRC.
  const shown = works.filter(w => {
    const m = metas.get(w.key)!, v = w.versions;
    return (!singer || w.singers.includes(singer)) && (!genre || v.some(s => genreParts(s).includes(genre))) && (!theme || m.themes.includes(theme))
      && (!langs.length || (langs.includes(NO_LANGUAGE) && !m.languages.length) || m.languages.some(l => langs.includes(l)))
      && (!letter || firstLetter(w.title) === letter)
      && (!needle || fold([w.title, ...w.singers, ...v.map(s => s.genre), ...m.themes, ...v.map(s => s.lyrics), ...m.isrc].join(' ')).includes(needle))
      && flags.every(f => f === 'cover' ? m.cover : f === 'release' ? m.release : f === 'beat' ? m.beat : f === 'youtube' ? m.youtube > 0 : f === 'chua-youtube' ? m.youtube === 0
        : f === 'loi' ? v.some(s => s.lyrics) : f === 'thieu-loi' ? v.some(s => !s.lyrics) : f === 'thumb' ? v.some(s => cover(s.id)) : v.some(s => has(s.id, 'kyam')));
  }).sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title, 'vi') : sort === 'za' ? b.title.localeCompare(a.title, 'vi')
    : (metas.get(b.key)!.created === Infinity ? 0 : metas.get(b.key)!.created) - (metas.get(a.key)!.created === Infinity ? 0 : metas.get(a.key)!.created));
  const activeFilters = (query ? 1 : 0) + (singer ? 1 : 0) + (genre ? 1 : 0) + (theme ? 1 : 0) + (langs.length ? 1 : 0) + (letter ? 1 : 0) + flags.length;
  const clearAll = () => { setQuery(''); setSinger(''); setGenre(''); setTheme(''); setLangs([]); setLetter(''); setFlags([]); };
  const work = works.find(w => w.key === chon) || null, meta = work ? metas.get(work.key)! : null;
  const song = work ? work.versions.find(s => s.id === version) || work.versions[0] : null;
  const phanTich = song ? (files[song.id] || []).find(f => f.kind === 'phantich')?.data || null : null;

  if (!bridge?.catalog) return <section className="kho-nhac"><p className="apps-note warn">Kho nhạc chỉ chạy trong bản Windows (Electron) của app.</p></section>;

  // Xử lý bài (một nút): Gemini nghe lời + so lời kho → SRT/ASS → ký âm + hợp âm → 2 chủ đề. Vài phút/bài, có tiến độ từng bước.
  async function xuLy(s: CatalogSong) {
    setBusy(`xu-ly:${s.id}`); setError(''); setNotice(''); setStep(null);
    const off = bridge!.onXuLyBai?.(p => { if (p.songId === s.id) setStep({ step: p.step, percent: p.percent }); });
    try {
      const r = await bridge!.xuLyBai!(s.id);
      const loi = Object.entries(r.loiBuoc || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
      setNotice(`✓ Đã xử lý "${s.title}"${r.loi?.khop != null ? ` · lời khớp ${r.loi.khop}%` : ''}${r.kyAm ? ` · giọng ${r.kyAm.giong_vi}` : ''}${r.chuDe ? ` · chủ đề ${r.chuDe.chuDe.join(', ')} · bối cảnh ${r.chuDe.boiCanh}` : ''}${loi ? ` · bước lỗi: ${loi}` : ''}`);
      setFiles(await bridge!.khoTep());
    } catch (e) { setError(message(e)); } finally { off?.(); setBusy(''); setStep(null); }
  }
  // Lời chuẩn: lưu lời chủ tịch nhập (thắng lời danh mục cũ) → tự làm lại SRT/ASS, ký âm, hợp âm, chủ đề theo lời đó. Không nghe lại bằng Gemini.
  async function luuLoiChuan(s: CatalogSong, text: string) {
    setBusy(`xu-ly:${s.id}`); setError(''); setNotice(''); setStep({ step: 'Đã lưu lời — chờ lượt máy (nếu đang chạy bài khác)', percent: 1 });
    const off = bridge!.onXuLyBai?.(p => { if (p.songId === s.id) setStep({ step: p.step, percent: p.percent }); });
    try {
      const r = await bridge!.loiChuan!(s.id, text);
      setDraft(null); setCatalog(await bridge!.catalog()); setFiles(await bridge!.khoTep());
      const loi = Object.entries(r.loiBuoc || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
      setNotice(`✓ Đã lưu lời chuẩn "${s.title}" và làm lại phụ đề SRT/ASS${r.kyAm ? `, ký âm + hợp âm (giọng ${r.kyAm.giong_vi})` : ''}${loi ? ` · bước lỗi: ${loi}` : ''}`);
    } catch (e) { setError(message(e)); } finally { off?.(); setBusy(''); setStep(null); }
  }
  // Ảnh bài: 2 ảnh minh họa theo phong cách ca sĩ → Gemini chọn ảnh hợp lời hơn → 5 thumbnail có tên bài. 6 ảnh vào thư mục bài.
  async function lamAnh(s: CatalogSong) {
    setBusy(`anh:${s.id}`); setError(''); setNotice(''); setStep(null);
    const off = bridge!.onAnhBai?.(p => { if (p.songId === s.id) setStep({ step: p.step, percent: p.percent }); });
    try {
      const r = await bridge!.anhBai!(s.id, { lamLai: true });
      setFiles(await bridge!.khoTep());
      setNotice(`✓ Ảnh "${s.title}": chọn ảnh ${r.chon}${r.lyDo ? ` (${r.lyDo})` : ''} · ${Object.keys(r.files || {}).length} ảnh vào thư mục bài${r.loi?.length ? ` · lưu ý: ${r.loi.join('; ')}` : ''}`);
    } catch (e) { setError(message(e)); } finally { off?.(); setBusy(''); setStep(null); }
  }
  const mo = (file: string, reveal = false) => bridge!.khoMo(file, reveal).catch(e => setError(message(e)));
  const link = (url: string) => bridge!.moLink(url).catch(e => setError(message(e)));
  const toggle = (f: Flag) => setFlags(list => {
    const pair: Partial<Record<Flag, Flag>> = { loi: 'thieu-loi', 'thieu-loi': 'loi', youtube: 'chua-youtube', 'chua-youtube': 'youtube' };
    return list.includes(f) ? list.filter(x => x !== f) : [...list.filter(x => x !== pair[f]), f];
  });
  const toggleLang = (l: string) => setLangs(list => list.includes(l) ? list.filter(x => x !== l) : [...list, l]);
  // Ô thống kê bấm được để lọc (Tác phẩm/Phiên bản chỉ đếm).
  const Stat = ({ n, label, flag, tip }: { n: number; label: string; flag?: Flag; tip: string }) => flag
    ? <button className="kn-stat" aria-pressed={flags.includes(flag)} title={`${tip} — bấm để lọc`} onClick={() => toggle(flag)}><b>{n}</b>{label}</button>
    : <span className="kn-stat" title={tip}><b>{n}</b>{label}</span>;
  const open = (w: Work) => { setChon(w.key); setVersion(w.versions[0].id); setTab('thong-tin'); };

  // Hàng nhãn trạng thái của tác phẩm: sáng = có, mờ = chưa (nền tảng luôn hiện để nhìn là biết bài đã lên đâu).
  const Badges = ({ w }: { w: Work }) => { const m = metas.get(w.key)!;
    // Chữ đầy đủ + ghi chú khi rê chuột (chủ tịch 03/11: viết tắt nhỏ xíu không biết là gì).
    return <div className="kn-badges">
      <i className={`yt ${m.youtube ? 'on' : ''}`} title={m.youtube ? `Đã lên YouTube · ${m.youtube} nguồn (bài lẻ / Shorts / album)` : 'Chưa lên YouTube (chưa tick "đã đăng" và chưa có link YouTube)'}>▶ YouTube{m.youtube > 1 ? ` ${m.youtube}` : ''}</i>
      <i className={`rel ${m.release ? 'on' : ''}`} title={m.release ? 'Đã phát hành lên nền tảng nhạc (DistroKid, hoặc nằm trong album TuneCore)' : 'Chưa phát hành lên nền tảng nhạc (DistroKid / TuneCore)'}>🚀 Phát hành</i>
      <i className={`tt ${m.tiktok ? 'on' : ''}`} title={m.tiktok ? 'Đã đăng TikTok' : 'Chưa đăng TikTok'}>♪ TikTok</i>
      <i className={`bili ${m.bilibili ? 'on' : ''}`} title={m.bilibili ? 'Đã đăng Bilibili' : 'Chưa đăng Bilibili'}>◉ Bilibili</i>
      {m.suno > 0 && <i className="suno on" title={`${m.suno} phiên bản có link bài gốc trên Suno`}>♪ Suno{m.suno > 1 ? ` ${m.suno}` : ''}</i>}
      {m.albums.length > 0 && <i className="album on" title={`Nằm trong album: ${m.albums.map(a => a.name).join(', ')}`}>▣ Album</i>}
      {m.cover && <i className="cover on" title="Bài cover (có ghi chú cover)">Cover</i>}
      {m.claim && <i className="claim on" title="Đã đăng ký Content ID (claim) trên YouTube">Claim YT</i>}
      {m.v60 && <i className="v60 on" title="Làm bằng Suno phiên bản 6.0">V6.0</i>}
      {m.isrc.length > 0 && <i className="isrc on" title={`Có mã ISRC: ${m.isrc.join(', ')}`}>ISRC</i>}
    </div>; };
  const Files = ({ w }: { w: Work }) => { const v = w.versions, langs = metas.get(w.key)!.languages;
    const item = (ok: boolean, label: string, yes: string, no: string) => <i className={ok ? 'ok' : ''} title={ok ? yes : no}>{ok ? '✓' : '✗'} {label}</i>;
    return <div className="kn-files-mini">
      {item(v.some(s => s.lyrics), 'Lời', 'Đã có lời bài hát trong kho', 'Chưa có lời bài hát')}
      {item(v.some(s => has(s.id, 'srt')), 'SRT', 'Đã có file phụ đề .srt cạnh file nhạc', 'Chưa có phụ đề .srt')}
      {item(v.some(s => has(s.id, 'kyam')), 'Ký âm', 'Đã có bản ký âm PDF (nộp đăng ký quyền tác giả)', 'Chưa ký âm')}
      {item(v.some(s => !!cover(s.id)), 'Thumb', 'Đã có thumbnail trong thư mục bài', 'Chưa có thumbnail')}
      {langs.length > 0 && <span title="Ngôn ngữ lời bài hát">🌐 {langs.join(' · ')}</span>}
    </div>; };
  // Ô màu trơn theo ca sĩ, CHỈ ghi tên bài (chủ tịch 03/11: không lót ảnh, không chữ khác trong ô); ca sĩ + số phiên bản ở dòng dưới.
  const Tile = ({ w, big }: { w: Work; big?: boolean }) => <>
    <div className={`kn-tile${big ? ' big' : ''}`} title={w.title} style={{ ['--ca-si' as string]: singerColor(w.singers[0] || '') }}><b>{w.title}</b></div>
    <div className="kn-who"><span title={`Ca sĩ: ${w.singers.join(', ') || 'chưa có'}`}>🎤 {w.singers.join(' · ') || 'Chưa có ca sĩ'}</span>
      {w.versions.length > 1 && <em title={`Các phiên bản:\n${w.versions.map(s => `${s.singer} · ${s.genre}`).join('\n')}`}>{w.versions.length} phiên bản</em>}</div>
  </>;

  return <section className={`kho-nhac${work ? ' has-detail' : ''}`} aria-label="Kho nhạc">
    <aside className="kn-rail">
      <h2><Music4 size={18} /> Kho nhạc</h2>
      <label className="kn-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên bài, ca sĩ, chủ đề, lời, mã ISRC…" aria-label="Tìm bài" title="Tìm trong tên bài, ca sĩ, phong cách, chủ đề, lời bài hát và mã ISRC" /></label>
      {/* Thống kê kho như S2: đếm theo tác phẩm; Cover / Phát hành / Bán beat / YouTube bấm vào là lọc. */}
      <h3>Thống kê kho</h3>
      <div className="kn-stats">
        <Stat n={groups.length} label="Tác phẩm" tip="Số tác phẩm (các phiên bản cùng tên gom thành một)" />
        <Stat n={songs.length} label="Phiên bản" tip="Số phiên bản (mỗi ca sĩ × phong cách là một phiên bản)" />
        <Stat n={stat(m => m.cover)} label="Cover" flag="cover" tip="Tác phẩm cover (có ghi chú cover)" />
        <Stat n={stat(m => m.release)} label="Phát hành" flag="release" tip="Đã phát hành lên nền tảng nhạc (DistroKid / album TuneCore)" />
        <Stat n={stat(m => m.beat)} label="Bán beat" flag="beat" tip="Có phiên bản đánh dấu bán beat" />
        <Stat n={stat(m => m.youtube > 0)} label="YouTube" flag="youtube" tip="Có ít nhất một nguồn YouTube (bài lẻ / Shorts / album)" />
      </div>
      <h3>Ngôn ngữ</h3>
      <div className="kn-langs">{languages.map(([l, n]) => <button key={l} aria-pressed={langs.includes(l)} style={{ ['--mau' as string]: LANGUAGE_COLOR[l] || '#48B7A5' }} title={`Lọc tác phẩm tiếng ${l} (chọn được nhiều ngôn ngữ)`} onClick={() => toggleLang(l)}><b>{n}</b>Tiếng {l}</button>)}
        {noLanguage > 0 && <button aria-pressed={langs.includes(NO_LANGUAGE)} style={{ ['--mau' as string]: '#9AA7B8' }} title="Lọc tác phẩm chưa ghi ngôn ngữ" onClick={() => toggleLang(NO_LANGUAGE)}><b>{noLanguage}</b>Chưa có ngôn ngữ</button>}</div>
      <h3>Ca sĩ</h3>
      <ul className="kn-facet">{singers.map(([name, n]) => <li key={name}><button aria-pressed={singer === name} title={`Lọc tác phẩm của ${name} — bấm lại để bỏ`} onClick={() => setSinger(singer === name ? '' : name)}>
        <i className="kn-dot" style={{ background: singerColor(name) }} /><span>{name}</span><small>{n}</small></button></li>)}</ul>
      <h3>Tình trạng</h3>
      <div className="kn-chips">{FILE_FLAGS.map(([f, label, tip]) => <button key={f} aria-pressed={flags.includes(f)} title={tip} onClick={() => toggle(f)}>{label}</button>)}</div>
      <h3>Chủ đề</h3>
      {/* Danh sách 2 cột theo ABC (không xếp kiểu nhãn tràn dòng): chấm màu + tên + số tác phẩm. */}
      <ul className="kn-facet cols2">{themes.map(([t, n]) => <li key={t}><button aria-pressed={theme === t} title={`Chủ đề "${t}" · ${n} tác phẩm — bấm để lọc, bấm lại để bỏ`} onClick={() => setTheme(theme === t ? '' : t)}>
        <i className="kn-dot" style={{ background: hashColor(t) }} /><span>{t}</span><small>{n}</small></button></li>)}</ul>
      <h3>Phong cách</h3>
      <ul className="kn-facet cols2">{genres.map(([g, n]) => <li key={g}><button aria-pressed={genre === g} title={`Phong cách "${g}" · ${n} tác phẩm — bấm để lọc, bấm lại để bỏ`} onClick={() => setGenre(genre === g ? '' : g)}>
        <i className="kn-dot" style={{ background: genreColor(g) }} /><span>{g}</span><small>{n}</small></button></li>)}</ul>
      {onOld && <button className="kn-old" onClick={onOld} title="Kho S2 cũ (sửa dữ liệu bài)">Mở kho cũ (S2)</button>}
    </aside>

    {work && meta && song && <aside className="kn-detail" aria-label={`Chi tiết ${work.title}`}>
      <button className="kn-close" aria-label="Đóng chi tiết" onClick={() => setChon('')}><X size={15} /></button>
      <Tile w={work} big />
      <Badges w={work} />
      {meta.themes.length > 0 && <div className="kn-tags">{meta.themes.map(t => <span key={t}>{t}</span>)}</div>}
      {/* Phiên bản: mỗi ca sĩ × phong cách một nút, như tab ca sĩ của kho S2. */}
      <div className="kn-versions">{work.versions.map(s => <button key={s.id} aria-pressed={s.id === song.id} style={{ ['--ca-si' as string]: singerColor(s.singer) }} onClick={() => setVersion(s.id)}>🎤 {s.singer || '—'} · {s.genre || 'Chưa phân loại'}</button>)}</div>
      {song.audio.map(a => <label key={a.stage} className="kn-player"><span>{a.label}</span><audio controls preload="none" src={fileUrl(a.path)} /></label>)}
      <div className="kn-actions">
        <button onClick={() => song.audio[0] && void mo(song.audio[0].path, true)}><FolderOpen size={13} /> Mở thư mục</button>
        <button className="kn-main-btn" disabled={busy.startsWith('xu-ly')} onClick={() => void xuLy(song)}
          title="Một nút làm hết: Gemini nghe nhạc lấy lời và so với lời trong kho · phụ đề SRT + ASS · ký âm (PDF, MusicXML, MIDI) + hợp âm .docx · 2 chủ đề mạnh nhất + bối cảnh. Mọi file nằm cạnh file nhạc.">
          <Music4 size={13} /> {busy === `xu-ly:${song.id}` ? 'Đang xử lý…' : phanTich ? 'Xử lý lại bài' : 'Xử lý bài'}</button>
        <button disabled={busy.startsWith('anh')} onClick={() => void lamAnh(song)}
          title="ChatGPT vẽ 2 ảnh minh họa theo phong cách mặc định của ca sĩ → Gemini xem lời, chọn ảnh đẹp và sát lời hơn → 5 thumbnail có tên bài (16:9, 9:16, 1:1, 2:3, 4:3). 6 ảnh lưu vào thư mục bài, làm lại thì ghi đè.">
          <ImageIcon size={13} /> {busy === `anh:${song.id}` ? 'Đang làm ảnh…' : (files[song.id] || []).some(f => f.kind === 'minhhoa') ? 'Làm lại ảnh + thumb' : 'Làm ảnh + thumb'}</button>
      </div>
      {(busy === `xu-ly:${song.id}` || busy === `anh:${song.id}`) && step && <div className="kn-step"><progress max={100} value={step.percent} /><span>{step.step}…</span></div>}
      <div className="kn-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'thong-tin'} onClick={() => setTab('thong-tin')}>Thông tin</button>
        <button role="tab" aria-selected={tab === 'loi'} onClick={() => setTab('loi')}>Lời</button>
        <button role="tab" aria-selected={tab === 'tep'} onClick={() => setTab('tep')}>Tệp ({(files[song.id] || []).length})</button></div>
      {tab === 'thong-tin' && <dl className="kn-info">
        <dt>Phát hành</dt><dd>{[['YouTube', song.info?.published.youtube || hasYoutubeLink(song)], ['Shorts', song.info?.published.shorts], ['DistroKid', song.info?.published.distrokid], ['TikTok', song.info?.published.tiktok], ['Bilibili', song.info?.published.bilibili]]
          .map(([name, on]) => <span key={String(name)} className={on ? 'on' : ''}>{on ? '✓' : '□'} {name}</span>)}</dd>
        <dt>Cờ</dt><dd>{[['Claim YT', song.info?.claimYoutube], ['V6.0', song.info?.v60], ['Cover', song.info?.workCover], ['Memento', song.info?.memento]].map(([name, on]) => <span key={String(name)} className={on ? 'on' : ''}>{on ? '✓' : '□'} {name}</span>)}</dd>
        {song.info?.isrc && <><dt>ISRC</dt><dd className="mono">{song.info.isrc}</dd></>}
        {meta.albums.length > 0 && <><dt>Album</dt><dd>{meta.albums.map(a => <span key={a.id} className="on">▣ {a.name}{a.tuneCore ? ' · TuneCore' : ''}{a.youtubeEnabled ? ' · YouTube' : ''}</span>)}</dd></>}
        <dt>Ngôn ngữ</dt><dd>{song.languages.join(' · ') || '—'}</dd>
        <dt>Link</dt><dd>{song.info?.links.length ? song.info.links.map((l, i) => <button key={i} className="kn-link" onClick={() => void link(l.url)}><ExternalLink size={11} /> {l.platform || 'Link'}</button>) : '—'}</dd>
        {song.info?.notes && <><dt>Ghi chú</dt><dd className="pre">{song.info.notes}</dd></>}
        {song.info?.workCoverNote && <><dt>Ghi chú cover</dt><dd className="pre">{song.info.workCoverNote}</dd></>}
        {meta.meaning && <><dt>Ý nghĩa bài</dt><dd className="pre">{meta.meaning}</dd></>}
        {phanTich && <>
          <dt title="Kết quả nút Xử lý bài">AI phân tích</dt><dd className="pre">
            {phanTich.chuDe && <>Chủ đề: <b>{phanTich.chuDe.chuDe.join(', ')}</b> · Bối cảnh: <b>{phanTich.chuDe.boiCanh}</b>{'\n'}<span className="kn-why">{phanTich.chuDe.lyDo}</span>{'\n'}</>}
            {phanTich.loi && (phanTich.loi.nguon === 'gemini' ? 'Lời: kho chưa có — dùng lời Gemini nghe được\n'
              : <span title={`Thiếu (có trong kho, không nghe thấy): ${phanTich.loi.thieu.join(', ') || '—'}\nThừa (nghe thấy, không có trong kho): ${phanTich.loi.thua.join(', ') || '—'}`}>Lời kho khớp lời nghe được: <b>{phanTich.loi.khop}%</b>{'\n'}</span>)}
            {phanTich.phuDe && `Phụ đề: ${phanTich.phuDe.cau} câu (SRT + ASS)\n`}
            {phanTich.kyAm && `Ký âm: giọng ${phanTich.kyAm.giong_vi}, ♩=${phanTich.kyAm.bpm}, ${phanTich.kyAm.so_trang} trang, ${phanTich.kyAm.so_hop_am} lần đổi hợp âm\n`}
            <small>Xử lý lúc {new Date(phanTich.luc).toLocaleString('vi-VN')}</small></dd></>}
        <dt>MV · Shorts</dt><dd>{song.info?.mvDone || 0} MV xong · {song.info?.shorts || 0} Shorts</dd>
        <dt>Thời gian</dt><dd>{[song.info?.createdAt ? `Tạo ${date(song.info.createdAt)}` : '', song.updatedAt ? `Sửa ${date(song.updatedAt)}` : ''].filter(Boolean).join(' · ') || '—'}</dd>
      </dl>}
      {tab === 'loi' && (draft === null ? <>
        <button className="kn-edit-lyrics" disabled={busy.startsWith('xu-ly')} onClick={() => setDraft(song.lyrics || '')}
          title="Nhập lời chính xác cho phiên bản này. Lưu xong app tự làm lại phụ đề SRT + ASS, ký âm, hợp âm và chủ đề theo đúng lời đó.">Sửa lời chuẩn</button>
        <pre className="kn-lyrics">{song.lyrics || 'Phiên bản này chưa có lời.'}</pre></>
        : <div className="kn-lyrics-edit">
          <textarea value={draft} onChange={e => setDraft(e.target.value)} aria-label="Lời chuẩn" spellCheck={false} />
          <div className="kn-actions">
            <button className="kn-main-btn" disabled={!draft.trim() || busy.startsWith('xu-ly')} onClick={() => void luuLoiChuan(song, draft)}
              title="Lưu lời này làm lời chính thức của phiên bản, rồi tự làm lại phụ đề SRT + ASS, ký âm + hợp âm, chủ đề (không nghe lại bằng Gemini)">Lưu lời chuẩn + làm lại phụ đề, ký âm, hợp âm</button>
            <button disabled={busy.startsWith('xu-ly')} onClick={() => setDraft(null)} title="Bỏ sửa, giữ lời cũ">Hủy</button></div></div>)}
      {tab === 'tep' && <ul className="kn-files">{(files[song.id] || []).map(f => <li key={f.path}>
        {f.url ? <img src={f.url} alt="" /> : <FileText size={16} />}
        <span><b>{KIND_LABEL[f.kind] || f.kind}</b><small title={f.name}>{f.name}</small></span>
        <button onClick={() => void mo(f.path)}>Mở</button></li>)}</ul>}
    </aside>}
    <div className="kn-main">
      <div className="kn-bar"><b>{shown.length} {density === 'gon' ? 'tác phẩm' : 'phiên bản'}</b>
        <button className="kn-clear" disabled={!activeFilters} onClick={clearAll} title="Xóa toàn bộ bộ lọc và tìm kiếm đang bật"><X size={12} /> Xóa bộ lọc{activeFilters ? ` (${activeFilters})` : ''}</button>
        <span className="grow" />
        <label className="kn-ctl" title="Thứ tự hiển thị">Sắp xếp <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="moi">Mới thêm trước</option><option value="az">Tên A → Z</option><option value="za">Tên Z → A</option></select></label>
        <label className="kn-ctl" title="Gõ chữ cái đầu của tên bài để lọc">Chữ cái <input value={letter} maxLength={2} placeholder="VD: A" onChange={e => setLetter(e.target.value.trim().toUpperCase())} /></label>
        <div className="kn-seg" role="group" aria-label="Mật độ">
          <button aria-pressed={density === 'gon'} title="Gọn: mỗi tác phẩm một thẻ, gom các phiên bản" onClick={() => setDensity('gon')}>Gọn</button>
          <button aria-pressed={density === 'day-du'} title="Đầy đủ: mỗi phiên bản (ca sĩ × phong cách) một thẻ" onClick={() => setDensity('day-du')}>Đầy đủ</button></div>
        <button aria-pressed={layout === 'luoi'} aria-label="Dạng lưới" title="Dạng lưới" onClick={() => setLayout('luoi')}><LayoutGrid size={15} /></button>
        <button aria-pressed={layout === 'danh-sach'} aria-label="Dạng danh sách" title="Dạng danh sách" onClick={() => setLayout('danh-sach')}><List size={15} /></button></div>
      {error && <p className="apps-note warn" role="alert">{error}</p>}
      {notice && <p className="apps-note ok" role="status">{notice}</p>}
      {!catalog && !error && <p className="apps-note">Đang đọc kho…</p>}
      {layout === 'luoi'
        ? <div className="kn-grid">{shown.map(w => { const m = metas.get(w.key)!;
            return <button key={w.key} className={`kn-card${w.key === chon ? ' on' : ''}`} style={{ ['--ca-si' as string]: singerColor(w.singers[0] || '') }} onClick={() => open(w)}>
              <Tile w={w} /><Badges w={w} /><Files w={w} />
              {m.themes.length > 0 && <div className="kn-themes">{m.themes.slice(0, 3).map(t => <span key={t} title={`Chủ đề: ${t}`}>{t}</span>)}</div>}
              <small className="kn-date" title="Phong cách nhạc · ngày tạo bài trong kho">{[w.versions.map(s => s.genre).filter((g, i, a) => a.indexOf(g) === i).join(' · '), m.created !== Infinity ? `Tạo ${date(m.created)}` : ''].filter(Boolean).join(' · ')}</small>
            </button>; })}</div>
        : <ol className="kn-rows">{shown.map(w => <li key={w.key}><button className={w.key === chon ? 'on' : ''} style={{ ['--ca-si' as string]: singerColor(w.singers[0] || '') }} onClick={() => open(w)}>
            <i className="kn-dot big" /><b title={w.title}>{w.title}</b><span>{w.singers.join(' · ')}</span><span>{w.versions.map(s => s.genre).join(' · ')}</span><Badges w={w} /><Files w={w} /></button></li>)}</ol>}
    </div>

  </section>;
}
