export interface CatalogAudio { stage: string; label: string; fileName: string; size: number | null; path: string }
export interface CatalogInfo { published: { youtube: boolean; distrokid: boolean; tiktok: boolean; bilibili: boolean; shorts: boolean }; claimYoutube: boolean; isrc: string; cover: boolean; v60: boolean; memento: boolean; links: { platform: string; url: string }[]; notes: string; meaning: string; titleNote: string; createdAt: number | null; mvDone: number; shorts: number; workCover: boolean; workCoverNote: string; tiktokThumbs: number; bilibiliThumbs: number }
export interface CatalogSong { id: string; title: string; singer: string; genre: string; themes: string[]; languages: string[]; lyrics: string; audio: CatalogAudio[]; info?: CatalogInfo; updatedAt?: number | null }
export interface Catalog { root: string; name: string; songs: CatalogSong[] }

export interface ThungDoAudio { path: string; size: number; giay: number; lufs: number | null; sha256: string; suno: { id: string; createdAt: string } | null; taiVe: number }
export interface Mon {
  id: string; nguon: string[]; audio: ThungDoAudio; audios?: ThungDoAudio[];
  anh: { path: string; w: number; h: number; khung: '16:9' | '9:16' | '1:1' | '4:3' | 'khac' }[];
  srt?: string; docx?: string;
  deXuat: { bai: string; caSi: string; phongCach: string; loi: string };
  trung: { muc: 'kho' | 'thung'; file: string; ly_do: 'cung-dung-luong-khac-lufs' | 'trung-ma-bam' | 'cung-thoi-luong' }[];
}
export type ThungDoNhap = Mon & { bai: string; caSi: string; phongCach: string; loai: 'Gốc' | 'Master'; loi?: string };
export interface ThungDoKetQua { thuMuc: string; files: string[]; catalogId: string }

export interface Project {
  id: string; sourceKey: string; title: string; singer: string; genre: string; themes: string[]; languages: string[]; lyrics: string; lyricsSource: 'catalog' | 'api' | 'manual' | null; theme?: string;
  audio: { path: string; name: string; duration: number; size: number; trimmed?: { head: number; tail: number } };
  source: { kind: 'file' } | { kind: 'catalog'; songId: string; stage: string };
  createdAt: string; updatedAt: string;
  approved: { version: number; approvedAt: string } | null;
  words: boolean; captions: boolean; candidates: number; chosen: string | null; thumbs: number; transcribing: boolean;
}

// Lời & Album (<kho>/QuanLy): mỗi dòng là một bài + một ca sĩ.
export interface LyricsRow { songId: string; title: string; singer: string; genre: string; themes: string[]; lyrics: string; hasLyrics: boolean; edited: boolean; updatedAt: string | null }
export interface AlbumTrack { songId: string; titleSnapshot: string; singer: string; genre: string }
export interface Album { id: string; name: string; tracks: AlbumTrack[]; youtubeEnabled: boolean; youtubeUrl: string; tuneCore: boolean; note: string; createdAt: number; updatedAt: number }
export interface AlbumDraft { id?: string; name: string; tracks: { songId: string; singer: string; genre?: string }[]; youtubeEnabled?: boolean; youtubeUrl?: string; tuneCore?: boolean; note?: string }
export interface Word { text: string; start: number; end: number }
export interface Cue { start: number; end: number; text: string; words?: Word[] }
export interface SubtitleStyle { width: 1920 | 1080; font: string; size: number; color: string; highlight: string; karaoke: boolean }
export interface SubtitleDraft { cues: Cue[]; mode: 'lyrics' | 'heard' | 'none' | 'library'; version?: number; approvedAt?: string; coverage: number; missing?: string[]; duration: number; saved?: boolean; needsTranscription?: boolean; style?: SubtitleStyle }

export interface Candidate { id: string; file: string; url: string; prompt: string; adapter: string; model: string; account: string; round: string }
export type Ratio = '16:9' | '9:16' | '1:1' | '2:3' | '4:3';
export interface ImageState {
  candidates: Candidate[]; chosen: string | null; folder: string;
  thumbs: { mode: 'ai' | 'font'; sourceId?: string; title: string; font: string; adapter: string; errors: string[]; checks: Partial<Record<Ratio, SpellCheck>>; files: Partial<Record<Ratio, string>>; urls: Partial<Record<Ratio, string>> } | null;
  run: { kind: 'candidates' | 'thumbs' | 'set'; stage?: string; error?: string; done?: number; errors?: string[]; frames?: Partial<Record<Ratio, ThumbFrame>> } | null;
  set?: ImageSet | null;
}
export interface ImageSlot { service: 'flow' | 'chatgpt'; status: 'waiting' | 'running' | 'done' | 'error'; percent: number; stage: string; account: string; candidateId: string | null; error: string }
export interface ImageSet { round: string; presetId: string; slots: ImageSlot[] }
export interface ThumbFrame { status: 'waiting' | 'running' | 'checking' | 'done' | 'bad' | 'error'; text: string; percent: number; attempt?: number; tries?: number; account?: string; startedAt?: number; endedAt?: number }
export interface SpellCheck { ok: boolean; read?: string; coverage?: number | null; problems: string[]; attempt?: number; final?: boolean }
export interface SrtEntry { key: string; title: string; singer: string; genre: string; audioName: string; projectId: string | null; active: number; versions: number; approvedAt: string }
export interface Provider { id: string; name: string; ok: boolean; detail: string }
export interface Preset { id: string; name: string; description: string; sample?: string }

export type Service = 'flow' | 'chatgpt';
export interface AccountCheck { ok: boolean; email?: string; error?: string; billing?: string; at: string }
export interface Site { id: string; name: string; group: 'ai' | 'publish' | 'custom'; plans: string[]; detect: boolean; scans?: boolean; url?: string; channel?: boolean }
export interface ProfileConnect { dir: string; name: string; state: 'co-san' | 'dang-noi' | 'da-noi' | 'khong-noi' }
export interface YoutubeChannel { name: string; handle: string; selected: boolean; google?: string; byline?: string }
export interface SiteScan { at: string; error: string; plan: string; until: string; pages: { url: string; loggedIn: boolean | null; error: string }[] }
export interface SiteCredits { credits: number | null; loggedIn: boolean | null; at?: string }
// Hạn mức ghi tay của một trang (cl-015): chữ tự do, vd. "50 tín dụng, làm mới 07:57".
export interface SiteQuota { ngay?: string; thang?: string; ghiChu?: string }
export interface AccountSite { scan?: SiteScan; plan: string; loggedIn?: boolean; checkedAt?: string; until?: string; autoRenew?: boolean | null; note?: string; channel?: string; channels?: YoutubeChannel[]; hanMuc?: SiteQuota; dungLam?: string; nhanLuc?: string }
export interface SitePatch { id: string; plan?: string | null; until?: string; autoRenew?: boolean | null; note?: string; channel?: string; hanMuc?: SiteQuota; dungLam?: string }
// trangThai: 'moi' = dấu "!" đỏ; 'cho-kiem' = chủ tịch đã phản hồi, dấu vàng, chờ Claude kiểm lại. Lỗi cũ chưa có trường mới thì coi như 'moi'.
export interface AccountErrorFeedback { luc: string; daXuLy: boolean; nhanXet: string }
export interface AccountErrorCheck { luc: string; ketQua: 'ok' | 'van-loi'; ghiChu: string }
export interface AccountError { id: string; dichVu: string; viec: string; thongBao: string; goiY?: string; loai?: string; link?: string; soLan: number; dau: string; luc: string; trangThai?: 'moi' | 'cho-kiem'; daOnLai?: string; phanHoi?: AccountErrorFeedback; kiemLai?: AccountErrorCheck }
export interface Account { id: string; label: string; email: string; note?: string; profileDir?: string; dedicated?: boolean; may?: boolean; version?: string; outdated?: boolean; sites: Record<string, AccountSite>; services: Service[]; enabled: boolean; emails: Partial<Record<Service, string>>; checks: Partial<Record<string, AccountCheck>>; credits?: Partial<Record<string, SiteCredits>>; online: boolean; busy: number; firstSeen: string; loi?: AccountError[]; trangTrang?: { at: string; kiemLuc?: string } }
export interface AccountView { installDirectory?: string; sites: Site[]; accounts: Account[]; geminiKeys: string[]; legacyKeys: number; imageKey: string }

export interface LiveMeta { id: string; url?: string; title?: string; loading?: boolean; error?: string; closed?: boolean }
export type LiveInput =
  | { kind: 'mouse'; type: 'mousePressed' | 'mouseReleased' | 'mouseMoved' | 'mouseWheel'; x: number; y: number; button?: 'left' | 'right' | 'middle' | 'none'; buttons?: number; clickCount?: number; deltaX?: number; deltaY?: number; modifiers?: number }
  | { kind: 'key'; type: 'keyDown' | 'rawKeyDown' | 'keyUp'; key: string; code: string; text?: string; keyCode: number; modifiers?: number }
  | { kind: 'text'; text: string }
  | { kind: 'nav'; action: 'back' | 'forward' | 'reload' | 'url'; url?: string };
export type WorldRole = 'dai-sanh' | 'hoa-that' | 'luu-anh-that' | 'tang-am-cac' | 'phong-trung-bay' | 'minh-nhi' | 'xing' | 'trang-tri' | 'dong-vat';
export interface SucMayData {
  luc: number; cpu: number; ram: number; ramGB: number; totalGB: number;
  gpu: number | null; vram: number | null; vramTotal: number | null; nhietGpu: number | null; nhietCpu: number | null; cpuNote: string;
  disks: { drive: string; freeGB: number | null }[]; top: { ten: string; so: number; gb: number }[];
  history: { luc: number; cpu: number; ram: number; gpu: number | null }[]; logs: string[]; errors: Record<string, string>;
  config: { bat: boolean; vang: number; do: number }; muc: 'vang' | 'do' | null; suspended: number[]; cocCocApp: number;
}
export interface TongDaiCua {
  id: string; loai: string; mail: string | null; nhom: string; dungDe: string; chungVoi: string[]; tat: boolean;
  tinhTrang: 'san' | 'nghi' | 'loi' | 'tat'; nghiDen: number | null; lyDo: string; chungThuc: Record<string, string>;
  soDo: Record<string, number | null>; nguonDo?: string; loaiDo?: 'do-duoc' | 'uoc-tinh'; homNay: { ok: number; loi: number; hetLuot: number };
}
export interface TongDaiMail { ma: string; nhan: string; tinhTrang: 'ok' | 'khoa' | 'het-han'; goi: { loai: string; hetHan: string | null }[]; cua: TongDaiCua[] }
export interface TongDaiData {
  canhBaoGoi?: { id: string; chu: string; nguon: string; capNhat: number | null; do: 'do-duoc' | 'uoc-tinh' }[];
  luc: number; mail?: TongDaiMail[]; cua?: TongDaiCua[]; vaiCua?: Record<string, string[]>;
  tho: { id: string; tinhTrang: 'san' | 'nghi' | 'loi' | 'tat'; nghiDen: number | null; lyDo: string; lanCuoi: number | null; homNay: { ok: number; loi: number; hetLuot: number } }[];
  vai: Record<string, string[]>;
  web: { id: string; ten?: string; trang: string; credits: number | null; daDung: number; ngay: string; lanCuoi: number | null }[];
}
export type TongDaiRequest = { action?: 'xem' | 'nghi' | 'goi-lai' | 'vai' | 'web' | 'mail' | 'gan-mail' | 'tat' | 'vai-cua'; ma?: string; nhan?: string; tinhTrang?: 'ok' | 'khoa' | 'het-han'; tat?: boolean; id?: string; nghiDen?: number; vai?: string; hang?: string[]; trang?: string; soLieu?: { credits: number; daDung?: number; lanCuoi?: number } };
export interface AppsBridge {
  phongHop?(request?: PhongHopRequest): Promise<PhongHopData>;
  onPhongHop?(callback: (data: PhongHopData) => void): () => void;
  sucMay?(config?: SucMayData['config']): Promise<SucMayData>;
  tongDai?(request?: TongDaiRequest): Promise<TongDaiData>;
  onSucMay?(callback: (data: SucMayData) => void): () => void;
  masterFilePath?(file: File): string;
  masterChon?(): Promise<string[]>;
  masterChay?(input: MasterInput): Promise<MasterKetQua>;
  masterNghe?(id: string, ban: 'truoc' | 'sau'): Promise<Uint8Array>;
  phatHanhDs?(): Promise<PhatHanhRec[]>;
  phatHanhKiem?(q: string): Promise<PhatHanhRec[]>;
  phatHanhThem?(input: { url: string; bai: string; caSi: string; ghi: string }): Promise<{ trung: boolean; rec: PhatHanhRec }>;

  thungDoChon(): Promise<string[]>;
  thungDoPhanTich(paths: string[]): Promise<Mon[]>;
  thungDoNhap(mon: ThungDoNhap): Promise<ThungDoKetQua>;
  // giuMoi (cl-021, nút "Note" của popup Việc cần làm ngay): chỉ lưu nhận xét, lỗi vẫn ở 'moi'. Bản main cũ bỏ qua trường này.
  accountErrorFeedback?: (accountId: string, loiId: string, feedback: { daXuLy: boolean; nhanXet: string; giuMoi?: boolean }) => Promise<AccountView>;
  worldModels(): Promise<{ folder: string; roles: Record<WorldRole, string[]> }>;
  worldModel(role: WorldRole, name: string): Promise<Uint8Array>;
  openLive(accountId: string, url: string): Promise<string>;
  liveInput(id: string, event: LiveInput): Promise<void>;
  closeLive(id: string): Promise<void>;
  onLiveFrame(callback: (frame: { id: string; data: string }) => void): () => void;
  onLiveMeta(callback: (meta: LiveMeta) => void): () => void;
  catalog(): Promise<Catalog | null>; pickCatalog(): Promise<Catalog>;
  projects(): Promise<Project[]>; project(id: string): Promise<Project>;
  openCatalogSong(songId: string, stage?: string): Promise<Project>; openFile(): Promise<Project | null>;
  openBytes(name: string, bytes: Uint8Array, meta?: { title?: string; singer?: string; genre?: string; lyrics?: string }): Promise<Project>;
  updateProject(id: string, patch: { lyrics?: string; title?: string; theme?: string; singer?: string; genre?: string; themes?: string[]; languages?: string[] }): Promise<Project>;
  autoLyrics(id: string): Promise<Project>;
  transcribe(id: string, force?: boolean, engine?: 'gemini' | 'local'): Promise<Project>; cancelTranscribe(id: string): Promise<void>;
  openFolder(id: string): Promise<void>; audioUrl(id: string): Promise<string>; audioBytes(id: string): Promise<Uint8Array>;
  subtitles(id: string, rebuild?: boolean): Promise<SubtitleDraft>;
  saveSubtitles(id: string, request: { cues: Cue[]; mode: string; coverage: number; style: SubtitleStyle }): Promise<Project>;
  approveSubtitles(id: string, request: { cues: Cue[]; mode: string; coverage: number; style: SubtitleStyle }): Promise<Project>;
  srtLibrary(): Promise<SrtEntry[]>;
  exportSubtitles(id: string, kind: 'srt' | 'ass'): Promise<string | null>;
  keepAss?(id: string): Promise<boolean>;
  lyrics?(): Promise<LyricsRow[]>; setLyrics?(songId: string, singer: string, text: string): Promise<LyricsRow>;
  albums?(): Promise<Album[]>; saveAlbum?(draft: AlbumDraft): Promise<Album>; removeAlbum?(id: string): Promise<boolean>;
  importOldAlbums?(): Promise<number>; albumDocx?(id: string, reveal?: boolean): Promise<string>;
  dropTempAss?(id: string): Promise<boolean>;
  imageProviders(): Promise<Provider[]>; imageFonts(): Promise<string[]>; imagePresets(): Promise<Preset[]>;
  images(id: string): Promise<ImageState>;
  generateImages(id: string, request: { adapterId: string; theme: string; presetId: string | null }): Promise<ImageState>;
  generateImageSet(id: string, request: { presetId: string; theme?: string }): Promise<ImageState>;
  imageBytes(id: string, imageId: string): Promise<Uint8Array>;
  importImages(id: string): Promise<ImageState>; chooseImage(id: string, imageId: string): Promise<ImageState>;
  removeImage(id: string, imageId: string): Promise<ImageState>; cancelImages(id: string): Promise<void>;
  makeThumbnails(id: string, request: { adapterId: string; title: string; font: string; mode: 'ai' | 'font' }): Promise<ImageState>;
  retryThumbnail(id: string, ratio: Ratio): Promise<ImageState>;
  retitleThumbnails(id: string, request: { title: string; font: string }): Promise<ImageState>;
  exportThumbnails(id: string): Promise<string | null>;
  imageKeyStatus(): Promise<{ configured: boolean }>; saveImageKey(key: string): Promise<{ configured: boolean }>; removeImageKey(): Promise<{ configured: boolean }>;
  accounts(): Promise<AccountView>; updateAccount(id: string, patch: { label?: string; email?: string; note?: string; services?: Service[]; enabled?: boolean; site?: SitePatch; profileDir?: string; dedicated?: boolean }): Promise<AccountView>;
  browserProfiles(): Promise<{ dir: string; name: string }[]>; wakeAccount(id: string): Promise<AccountView>; createBrowserProfile(name: string): Promise<{ dir: string; name: string }>;
  openInProfile(dir: string, url?: string, cuaSo?: boolean): Promise<boolean>;
  openInAccount(accountId: string, request: { url?: string; channel?: YoutubeChannel; cuaSo?: boolean }): Promise<{ dir: string; url: string }>;
  // Trang trắng để đăng nhập (cl-022) + nhận trang vừa đăng nhập. Bản app cũ không có thì undefined.
  openBlank?(accountId: string): Promise<{ dir: string; url: string; since: number }>;
  nhanTrang?(accountId: string): Promise<{ view: AccountView; them: string[] }>;
  connectProfiles(): Promise<ProfileConnect[]>;
  soiKenh(handles: string[]): Promise<KenhSoi[]>;
  khoTep(): Promise<Record<string, KhoTep[]>>;
  khoMo(file: string, reveal?: boolean): Promise<void>;
  moLink(url: string): Promise<void>;
  xuLyBai?(songId: string, opts?: { loiChuan?: boolean }): Promise<PhanTich>;
  loiChuan?(songId: string, text: string): Promise<PhanTich>;
  anhBai?(songId: string, opts?: { lamLai?: boolean }): Promise<AnhBai>;
  onAnhBai?(callback: (p: { songId: string; step: string; percent: number }) => void): () => void;
  khoMedia?(): Promise<MediaItem[]>;
  khoMediaNho?(file: string): Promise<string>;
  khoMediaMo?(file: string): Promise<void>;
  khoMediaGan?(file: string, songIds: string[], note: string): Promise<void>;
  khoMediaNhap?(songIds: string[], note: string): Promise<string[]>;
  khoClip?(filter?: Partial<Record<'q' | 'nguon' | 'bai' | 'caSi' | 'loai' | 'khung' | 'tieng', string>>): Promise<ClipItem[]>;
  khoClipChep?(ids: string[], thuMuc?: string): Promise<ClipChepKetQua>;
  khoClipChonThuMuc?(): Promise<string | null>;
  khoClipMoThuMuc?(thuMuc?: string): Promise<string>;
  khoClipNho?(id: string): Promise<string>;
  khoClipNhan?(id: string, patch: Partial<Record<ClipNhanSua, string | null>>): Promise<ClipItem>;
  khoClipMo?(id: string): Promise<void>;
  mayDangNhap?(accountId: string): Promise<{ dir: string; installDirectory: string }>;
  mayXong?(accountId: string): Promise<boolean>;
  hanMucNhap?(id: string, input: { pct: number; reset?: string | number | null } | null): Promise<HanMuc>;  // reset: "09/11 09:00" hoặc mili giây
  banDo?(): Promise<BanDo>;
  banDoQuet?(): Promise<BanDo>;
  taoHinhKieu?(): Promise<{ kieu: KieuHinh[]; ratios: string[]; thuMuc: string }>;
  taoHinh?(input: { ten: string; bytes: Uint8Array; mime: string; kieu: string; prompt: string; them: string; ratio: string; so: number }): Promise<TaoHinhKetQua>;
  taoHinhMo?(file?: string): Promise<void>;
  onTaoHinhBuoc?(callback: (text: string) => void): () => void;
  soViec?(): Promise<ViecChuTich[]>;
  soViecLuu?(input: Partial<ViecChuTich>): Promise<ViecChuTich>;
  soViecXoa?(id: string): Promise<ViecChuTich>;
  soViecNhap?(): Promise<{ viec: ViecChuTich[]; them: number }>;
  onSoViec?(callback: (list: ViecChuTich[]) => void): () => void;
  onXuLyBai?(callback: (p: { songId: string; step: string; percent: number }) => void): () => void;
  subtitleFonts?(): Promise<string[]>;
  nhanXetKenh(channels: KenhSoi[], focus?: string): Promise<NhanXetKenh>;
  kyAm(songId: string): Promise<{ pdf: string; docx: string; musicxml: string; mid: string; info: { giong_vi: string; bpm: number; so_trang: number; so_hop_am: number } }>;
  scanCredits(ids?: string[]): Promise<({ id: string; label: string; error?: string } & Partial<Record<'dreamina' | 'flow', SiteCredits & { error?: string }>>)[]>;
  hanMuc?(): Promise<HanMuc>;
  hanMucLuu?(input: NguonKeyLuu): Promise<NguonKeyView[]>;
  hanMucDo?(ten?: string): Promise<Record<string, SoDuNguon>>;
  codexDung?(ten: string): Promise<{ goi: string }>;
  checkAllAccounts(): Promise<{ checked: number; errors: { id: string; label: string; error: string }[] }>;
  onAccountsCheck(callback: (item: { id: string; label: string; state: 'dang-kiem' | 'xong' | 'loi'; error?: string }) => void): () => void;
  onBrowserProfiles(callback: (profiles: { dir: string; name: string }[]) => void): () => void;
  onProfilesConnect(callback: (item: ProfileConnect) => void): () => void;
  addSite(text: string, accountId?: string): Promise<AccountView>; removeSite(id: string): Promise<AccountView>;
  removeAccount(id: string): Promise<AccountView>; checkAccount(id: string): Promise<AccountView>; openExtensionFolder(): Promise<string>;
  addGeminiKeys(text: string): Promise<AccountView>; removeGeminiKey(index: number): Promise<AccountView>; setImageKey(value: string): Promise<AccountView>;
  onAccounts(callback: (view: AccountView) => void): () => void;
  onProject(callback: (project: Partial<Project> & { id: string }) => void): () => void;
  onImages(callback: (change: ImageState & { id?: string }) => void): () => void;
  onImageFrame?(callback: (frame: { id: string; slots: number[]; data: string }) => void): () => void;
}

declare global { interface Window { manorApps?: AppsBridge } }

// Trạm hạn mức (desktop/apps/han-muc.cjs): mỗi nguồn một thẻ. do: đo được / ước tính / chưa có số. Thời gian là mili giây.
export type HanMucDo = 'do-duoc' | 'uoc-tinh' | 'chua-co';
export type HanMucTrangThai = 'on' | 'gan-het' | 'het' | 'chua-ro';
export interface CodexWorkspace {
  ten: string;
  thuMuc?: string;
  goi: string;
  mail?: string;
  dangDung: boolean;
  dangHet?: boolean;
  het: number | null;
  lyDo: string;
  pct?: number | null;
  pct5h?: number | null;
  pctTuan?: number | null;
  hoi5h?: number | null;
  hoiTuan?: number | null;
  tokenHomNay?: number;
  tuan?: number;
  soPhien?: number;
  chuyenLuc?: number | null;
}
export interface AgyHanMucNhom {
  id: 'argon' | 'gemini' | 'claude-gpt';
  ten: string;
  trangThai: HanMucTrangThai;
  ketQuaCuoi?: 'het' | 'thanh-cong' | null;
  capNhat?: number | null;
  hetLuc?: number | null;
  hoiLai?: number | null;
  luotHomNay: number;
}
export interface HanMucNguon { id: string; ten: string; do: HanMucDo; trangThai: HanMucTrangThai; pct: number | null; daDung?: string; conLai?: string; hoiLai?: number | null; capNhat?: number | null; cach: string; dong: [string, string][]; loi?: string; workspace?: CodexWorkspace[];
  agyGroups?: AgyHanMucNhom[];
  // nhapDuoc: thẻ có ô chủ tịch tự nhập; nhap: số đã nhập (kèm giờ nhập); canhBao: tô đỏ (số nhập ≥ 90%).
  nhapDuoc?: boolean; nhap?: HanMucNhap | null; canhBao?: boolean }
// Số chủ tịch tự nhập (vd Claude: % tuần đã dùng đọc trên trang claude.ai, giờ reset). luc = lúc nhập.
export interface HanMucNhap { pct: number; reset?: number | null; luc?: number }
// Nguồn key qua trang trung gian (cl-016). Không có key — chỉ coKey.
export type NguonKeyLoai = 'openai' | 'anthropic';
export type NguonKeyCachDo = 'tu-dong' | 'openrouter' | 'new-api' | 'billing' | 'khong';
export interface NguonKeyView { ten: string; loai: NguonKeyLoai; baseUrl: string; host: string; coKey: boolean; model: string; rpm: number | null; cachDo: NguonKeyCachDo; hetHan: string; ghiChu: string; tat: boolean; file: 'json' | 'txt' }
export interface NguonKeyLuu { tenCu?: string; ten: string; loai: NguonKeyLoai; baseUrl: string; key?: string; model?: string; rpm?: number; cachDo: NguonKeyCachDo; hetHan?: string; ghiChu?: string; tat?: boolean }
export interface SoDuNguon { cach: string; donVi?: 'usd' | 'quota'; tong?: number | null; daDung?: number | null; conLai?: number | null; hetHan?: number | null; ghi?: string; loi?: string; luc: number }
export interface HanMuc { luc: number; nguon: HanMucNguon[]; canhBao?: string[]; cauHinh?: { nguon: NguonKeyView[]; loi: string } }
// Bản đồ liên kết (tools/ban-do): url file xem.html nạp ngay trong app; null = chưa quét lần nào.
export interface BanDo { url: string | null; capNhat: number | null; nut?: number; canh?: number; git?: string; loi?: string }

// Soi kênh YouTube: số liệu công khai đọc từ trang kênh + nhận xét Gemini.
export interface KenhVideo { id: string; title: string; views: number | null; viewsText: string; age: string; length: string; thumb: string }
export interface KenhSoi { handle: string; at?: string; name?: string; avatar?: string; subscribers?: number | null; subscribersText?: string; videoCountText?: string; videos: KenhVideo[]; error?: string }
export interface NhanXetKenh { model?: string; tomTat?: string; diemManh?: string[]; vanDe?: string[]; nenLam?: string[]; videoNoiBat?: string[] }
// Kho nhạc mới: file cạnh từng bài theo quy ước tên.
export type KhoTepKind = 'phantich' | 'ass' | 'loinghe' | 'master' | 'goc' | 'srt' | 'kyam' | 'musicxml' | 'midi' | 'hopam' | 'thumb-mv' | 'thumb-tiktok' | 'thumb-dis' | 'minhhoa' | 'thumb' | 'anh' | 'nhac' | 'video' | 'khac';
export interface PhanTich { luc: string; loi: { khop: number | null; thieu: string[]; thua: string[]; nguon: 'kho' | 'gemini' | 'chuan' } | null; phuDe: { cau: number; phuLoi: number } | null; kyAm: { giong_vi: string; bpm: number; so_trang: number; so_hop_am: number } | null; chuDe: { chuDe: string[]; boiCanh: string; lyDo: string } | null; loiBuoc: Record<string, string> }
export interface AnhBai { boQua?: boolean; chon?: number; diem?: number[]; lyDo?: string; soLan?: number; files?: Record<string, string>; loi?: string[] }
export interface MediaItem { path: string; name: string; folder: string; loai: 'anh' | 'video'; kind: 'minhhoa' | 'thumb' | 'anh' | 'video' | 'rieng'; nguon: 'bai' | 'rieng';
  size: number; mtime: number; url: string; songs: string[]; owner: string | null; note: string; ratio: string }
// Kho clip (desktop/apps/kho-clip.cjs): nhãn tự suy từ đường dẫn + kế hoạch MV; "sua" = các trường chủ tịch đã sửa tay.
export type ClipNguon = 'veo' | 'dreamina' | 'chatgpt' | '3d' | 'broll' | 'media' | 'bai';
export type ClipLoai = 'video' | 'nhep' | 'anh' | 'thumb';
export type ClipNhanSua = 'bai' | 'caSi' | 'moTa' | 'nguon' | 'loai' | 'khung' | 'tieng' | 'nhanVat' | 'ghiChu';
export interface ClipItem { id: string; path: string; name: string; folder: string; url: string; nguon: ClipNguon | string; loai: ClipLoai | string;
  bai: string; caSi: string; songId: string; tieng: string; canh?: string; doan?: string; moTa: string; nhanVat?: boolean | string | null;
  size: number; mtime: number; w: number; h: number; giay: number; khung: string; ghiChu: string; sua: string[] }
export interface ClipChepKetQua { thuMuc: string; chep: number; daCo: number; thieu: string[]; files: { id: string; goc: string; ten?: string; daCo?: boolean }[] }
export interface KhoTep { name: string; kind: KhoTepKind; path: string; url?: string; data?: PhanTich }
// Tạo hình theo lệnh (desktop/apps/tao-hinh.cjs)
export interface KieuHinh { id: string; nhom: string; lenh: string; ten: string; giai: string; ratio: string; prompt: string; anh?: string; tacGia?: string; nguon?: string }
export interface TaoHinhKetQua { prompt: string; ratio: string; ketQua: { file?: string; account?: string; dataUrl?: string; error?: string }[] }
// Sổ việc chủ tịch (desktop/apps/so-viec.cjs): "xoá" chỉ chuyển trạng thái "bo".
export type TrangThaiViec = 'cho' | 'dang-lam' | 'cho-duyet' | 'da-duyet' | 'bo';
export interface ViecChuTich { id: string; luc: string; yeuCau: string; ghiChu: string; trangThai: TrangThaiViec; nguoiLam: string; ketQua: { text: string; link: string }[]; ghiChuClaude: string; capNhat: string }

export interface MasterInput { path?: string; songId?: string; cach: 'A' | 'B' | 'C'; theLoai: string; mau?: string }
export interface DoAm { lufs: number; lra: number; peak: number }
export interface MasterKetQua { id: string; source: string; file: string; truoc: DoAm; sau: DoAm; cach: string; theLoai: string }
export interface PhatHanhRec { ma: string; url: string; nenTang: string; bai: string; caSi: string; ghi: string; ngay: string; luc: string }

export interface PhongHopMember { id: string; ten: string; vai: string; bieuTuong: string; model?: string; ghiChu?: string; anh?: string; daDatTen?: boolean }
export interface PhongHopLine { id: number; ai: string; vong: number; luc: number; loai: string; noiDung: string; traLoi: number | null; quyetDinh: string; ghiChu: string; vang?: boolean }
export interface PhongHopRoom { id: string; tieuDe: string; vong: number; trangThai: string; dong: PhongHopLine[]; dangNoi?: { ai: string; tu: number } | null; vang?: Record<string, string>; cu?: boolean; markdown?: string; theViec?: string; dangVietThe?: boolean; loiThe?: string; loi?: string; capNhat?: number }
export interface PhongHopConfig { thanhVien: PhongHopMember[]; thuTu: string[] }
export interface PhongHopTask { id: string; noiDung: string; ai: string; ma?: string; capNhat: number | string; xong: boolean }
export interface PhongHopData { config: PhongHopConfig; danhSach: { id: string; tieuDe: string; trangThai: string; cu: boolean }[]; cuocHop: PhongHopRoom | null; bangViec?: PhongHopTask[]; dangHop?: boolean; yCho?: number }
export interface PhongHopRequest { action?: 'xem' | 'mo' | 'vong' | 'tam-dung' | 'ket-thuc' | 'noi' | 'quyet-dinh' | 'cau-hinh' | 'anh' | 'viet-the' | 'viec-xong'; id?: string; tieuDe?: string; noiDung?: string; dong?: number; quyetDinh?: 'ok' | 'ghi-chu'; ghiChu?: string; ai?: string; config?: PhongHopConfig; viec?: string; xong?: boolean }
