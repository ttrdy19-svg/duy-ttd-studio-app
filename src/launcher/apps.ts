import type { LucideIcon } from 'lucide-react';
import { AudioWaveform, BookOpenText, Boxes, Captions, ClipboardList, Clapperboard, Film, FolderInput, Frame, Gauge, ImagePlus, Images, Library, MonitorPlay, Network, Palette, ScanFace, Settings, Sparkles, Wallet } from 'lucide-react';

// Danh mục mini app của Mộc Ngư Quán: số thứ tự cố định, mỗi app một màu, một biểu tượng, một dòng giải thích,
// vài bước dùng ngắn và nút bấm riêng. Mỗi nút làm đúng một việc: mở khung app, mở app riêng, gọi Tiên Nhỏ, mở Sổ tài khoản.
export type ToolView = 'video' | 'library' | 'creation' | 'hall' | 'gallery' | 'mv' | 'phude' | 'thumb' | 'loi-album' | 'kho3d' | 'soi-kenh' | 'kho-nhac' | 'kho-media' | 'so-viec' | 'han-muc' | 'ban-do' | 'kho-clip' | 'tao-hinh' | 'thung-do' | 'master-nhac' | 'phat-hanh' | 'suc-may' | 'tong-dai';
export type AppAction =
  | { label: string; open: ToolView; primary?: true }
  | { label: string; external: 'song-khac' | 'channel-desk'; primary?: true }
  | { label: string; assistant: true; primary?: true };
// ready: dùng được; wait: dùng được nhưng công tử chưa duyệt quy trình; soon: chưa làm.
// Đèn (chủ tịch chốt 03/11/2026): xanh = chạy ổn, đã kiểm thật · vàng = chạy được, chưa kiểm · xám = chưa chạy.
export type AppStatus = 'xanh' | 'vang' | 'xam';
// Nhóm trên bảng Mini app (cl-021, chủ tịch 05/11/2026), xếp theo việc app thật sự làm.
export type AppNhom = 'dieu-khien' | 'kho' | 'may' | 'dich-vu' | 'giao-dien';
export const NHOM_APP: { id: AppNhom; ten: string; giai: string }[] = [
  { id: 'dieu-khien', ten: 'Điều khiển & tài khoản', giai: 'Tài khoản, việc giao, hạn mức của các thợ AI' },
  { id: 'kho', ten: 'Kho', giai: 'Xem, lọc, lấy file đã có trên máy' },
  { id: 'may', ten: 'Chạy trên máy (không tốn phí)', giai: 'Chạy bằng máy này (ffmpeg, Python, card đồ hoạ), không tốn tín dụng' },
  { id: 'dich-vu', ten: 'Dịch vụ AI · tốn tín dụng / gói Plus–Pro', giai: 'Gọi ChatGPT, Gemini, Dreamina hoặc trang web ngoài bằng tài khoản của mày' },
  { id: 'giao-dien', ten: 'Giao diện & tính năng app', giai: 'Bản đồ app, cài đặt nền và tính năng giao diện' },
];
export type MiniApp = {
  id: string; no: number; name: string; home: string; short: string; steps: string[];
  icon: LucideIcon; tint: [string, string]; status: AppStatus; actions: AppAction[];
  nhom: AppNhom;
  rieng?: 'cai-dat-nen';   // bảng tự vẽ nội dung riêng thay cho nút bấm (vd. Cài đặt nền)
};

const LOGIN: AppAction = { label: 'Đăng nhập ChatGPT', open: 'hall' };

export const MINI_APPS: MiniApp[] = [
  // Giữ số cố định; Tổng đài được đặt ở cuối danh sách bên dưới.
  { id: 'anh-mau', nhom: 'dich-vu', no: 1, name: 'Tạo ảnh 16:9', home: 'Họa thất', icon: Palette, tint: ['#d98c6a', '#8a3f58'], status: 'xanh',
    short: 'Ảnh minh họa ngang 16:9 theo lời bài hát, hai luồng tài khoản ChatGPT chạy song song.',
    steps: ['Chọn bài trong kho hoặc thả file nhạc: lời tự đọc từ file.', 'Hoặc dán lời / gõ vài chữ gợi ý cảnh muốn có.', 'Bấm tạo: hai tài khoản ChatGPT vẽ cùng lúc, chọn ảnh ưng ý.', 'Chưa đăng nhập: bấm “Đăng nhập ChatGPT”, đánh thức profile Cốc Cốc có sẵn hoặc tạo profile mới đăng nhập một lần.'],
    actions: [{ label: 'Mở app', open: 'creation', primary: true }, LOGIN] },
  { id: 'thumb', nhom: 'dich-vu', no: 2, name: 'Tạo thumbnail', home: 'Bàn nhạc · Họa ảnh', icon: ImagePlus, tint: ['#e8b85c', '#b0582f'], status: 'vang',
    short: 'Năm khung 16:9 · 9:16 · 1:1 · 2:3 · 4:3, tên bài to chiếm 40–60% khung, tương phản cao.',
    steps: ['Ảnh gốc lấy từ app 01 nếu đi theo quy trình, hoặc thả ảnh mẫu vào.', 'ChatGPT vẽ tên bài đúng như tên gốc (Việt / Anh / Trung tùy bài).', 'Gemini đọc lại chữ trên ảnh: sai chính tả hoặc chữ nhỏ quá thì tự vẽ lại.', 'Khung 16:9 làm gốc, bốn khung còn lại dựng lại từ khung gốc.'],
    actions: [{ label: 'Mở app', open: 'thumb', primary: true }, LOGIN] },
  { id: 'video', nhom: 'may', no: 3, name: 'Video lặp', home: 'Lưu Ảnh Thất', icon: Film, tint: ['#6fb3c9', '#2f5d8a'], status: 'vang',
    short: 'Ảnh + nhạc thành video lặp có phụ đề.',
    steps: ['Đang chờ công tử chốt quy trình, tạm dùng bản cũ.'],
    actions: [{ label: 'Mở app', open: 'video', primary: true }] },
  { id: 'phu-de', nhom: 'may', no: 4, name: 'Tạo SRT & ASS', home: 'Bàn nhạc', icon: Captions, tint: ['#9bc57a', '#3f7350'], status: 'xanh',
    short: 'Khớp lời theo giọng hát, ra SRT; ASS karaoke đi kèm khi làm video.',
    steps: ['Chọn bài: Gemini nghe giọng hát lấy mốc từng chữ, ghép với lời chuẩn.', 'Sửa dòng nào lệch rồi Lưu hoặc Duyệt vào kho SRT.', 'Mỗi lần lưu có kèm ASS tạm: đem đi làm video (hoặc xuất ASS) thì giữ.', 'Chỉ lấy SRT rồi chuyển bài khác hoặc mở phiên app mới: ASS tạm tự bỏ.'],
    actions: [{ label: 'Mở app', open: 'phude', primary: true }, { label: 'Nhờ Tiên Nhỏ làm', assistant: true }] },
  { id: 'mv', nhom: 'may', no: 5, name: 'Dựng MV 3D', home: 'Xưởng MV', icon: Clapperboard, tint: ['#c99ae0', '#5d3f8f'], status: 'vang',
    short: 'Bối cảnh 3D, nhân vật VRM nhép môi, máy quay theo nhịp bài.',
    steps: ['Chọn bài, bối cảnh, nhân vật rồi bấm dựng; chạy nền, xong có file trong MV-xuat.', 'Công tử chưa xem bản mới, đang chờ duyệt.'],
    actions: [{ label: 'Mở app', open: 'mv', primary: true }] },
  { id: 'nhep-moi', nhom: 'dich-vu', no: 6, name: 'Nhép môi AI', home: 'Lưu Ảnh Thất', icon: ScanFace, tint: ['#9a9a9a', '#4f4f57'], status: 'xam',
    short: 'Luồng miễn phí Dreamina: mỗi tài khoản 25 giây nhép môi một ngày.',
    steps: ['Mỗi tài khoản Dreamina cho 25 giây/ngày; nhiều tài khoản thì ghép dần cho đủ bài.', 'Có ô dán cookie, hoặc lấy cookie từ profile Cốc Cốc đã đăng nhập.', 'Đang làm: chưa bấm được.'],
    actions: [] },
  { id: 'kho-nhac', nhom: 'kho', no: 7, name: 'Kho nhạc', home: 'Tàng Âm Các', icon: Library, tint: ['#d7b483', '#6e4b2e'], status: 'xanh',
    short: 'Bài theo ca sĩ / thể loại / tình trạng: nghe Master, xem lời, phụ đề, ký âm, thumbnail.',
    steps: ['Lọc bên trái (ca sĩ, thể loại, có lời / thiếu lời / có thumb / có ký âm), tìm theo tên hoặc chủ đề.', 'Bấm một bài: nghe thử, đọc lời, mọi file cạnh bài; Ký âm ngay trong bảng chi tiết.', 'Bản thảo giao diện mới; kho S2 cũ vẫn mở được bằng nút "Mở kho cũ".'],
    actions: [{ label: 'Mở app', open: 'kho-nhac', primary: true }, { label: 'Kho cũ (S2)', open: 'library' }] },
  { id: 'trung-bay', nhom: 'dich-vu', no: 8, name: 'Trưng bày & đăng bài', home: 'Phòng trưng bày', icon: Frame, tint: ['#e59ab0', '#93405f'], status: 'vang',
    short: 'Thành phẩm và cửa sổ YouTube Studio / TikTok / DistroKid / TuneCore ngay trong app.',
    steps: ['Trang web chạy ngầm trong Cốc Cốc, app hiện cửa sổ sống bấm được.', 'Đăng YouTube: app tự điền và bấm Lưu luôn (mặc định Riêng tư), xong đóng tab.'],
    actions: [{ label: 'Mở app', open: 'gallery', primary: true }] },
  { id: 'tai-khoan', nhom: 'dieu-khien', no: 9, name: 'Tài khoản & hạn mức', home: 'Đại sảnh', icon: Wallet, tint: ['#8fc7b6', '#2f6a5d'], status: 'xanh',
    short: 'Mỗi mail một dòng: ChatGPT, Flow, YouTube, TikTok… kiểm tra cùng lúc.',
    steps: ['Mỗi mail gắn một profile Cốc Cốc, đăng nhập một lần là app tự dùng lại.', 'Bấm kiểm tra: mọi trang chạy song song, ra hạn gói, gia hạn, kênh.', 'YouTube / TikTok chỉ hiện kênh; mỗi mail chọn đúng một kênh để đăng.'],
    actions: [{ label: 'Mở sổ', open: 'hall', primary: true }] },
  { id: 'cover', nhom: 'may', no: 10, name: 'Cover nhạc', home: 'Sóng Khác', icon: AudioWaveform, tint: ['#7fa7e0', '#33508f'], status: 'vang',
    short: 'Dựng lại bài thành bản cover / không lời (app riêng).',
    steps: ['Mở app riêng trong trình duyệt, thả bài vào là chạy.'],
    actions: [{ label: 'Mở app', external: 'song-khac', primary: true }] },
  { id: 'soi-kenh', nhom: 'dich-vu', no: 11, name: 'Soi kênh YouTube', home: 'Mộc Channel Desk', icon: MonitorPlay, tint: ['#e07f7f', '#8f3333'], status: 'vang',
    short: '5 kênh YouTube: đăng ký, lượt xem từng video, video nổi/chìm, AI nhận xét và so sánh.',
    steps: ['Mở app là đọc ngay số liệu công khai của 5 kênh trong Sổ tài khoản, không mở trình duyệt.', 'Chọn kênh: danh sách video mới nhất, thanh lượt xem so với trung vị, đánh dấu video nổi (×2) và chìm.', '"Nhận xét kênh này" / "So sánh 5 kênh": Gemini chỉ ra điểm mạnh, vấn đề, việc nên làm tuần tới.', '"Mở Studio" mở đúng Studio của kênh trong profile Cốc Cốc của kênh đó.'],
    actions: [{ label: 'Mở app', open: 'soi-kenh', primary: true }] },
  { id: 'loi-album', nhom: 'kho', no: 12, name: 'Album', home: 'Tàng Âm Các', icon: BookOpenText, tint: ['#b8d28a', '#5a7a3a'], status: 'vang',
    short: 'Gom 1–50 bài thành album / tuyển tập để đăng YouTube, phát hành TuneCore, xuất Word.',
    steps: ['Tạo album: gõ tên bài để thêm, kéo lên/xuống sắp thứ tự (tối đa 50 bài).', 'Đánh dấu YouTube (kèm link video tuyển tập) / TuneCore để nhớ album đã phát hành ở đâu.', 'Xuất Word: danh sách bài, phong cách, chủ đề, lời — dùng khi làm video tuyển tập hoặc nộp phát hành.', '"Lấy album tuyển chọn cũ" chuyển album từ kho cũ sang; kho cũ không bị sửa.'],
    actions: [{ label: 'Mở app', open: 'loi-album', primary: true }, { label: 'Nhờ Tiên Nhỏ', assistant: true }] },
  { id: 'kho-3d', nhom: 'kho', no: 13, name: 'Kho 3D', home: 'Xưởng MV', icon: Boxes, tint: ['#c9b07a', '#5a4a2e'], status: 'vang',
    short: 'Duyệt mọi mô hình trên máy: map, nhân vật, chuyển động, kiến trúc, thiên nhiên, đồ vật, thú.',
    steps: ['Chọn loại bên trái, tìm theo tên hoặc lọc theo nguồn (Kenney, Quaternius, BlenderKit…).', 'Bấm một món: xem 3D xoay tự do, 2.5D góc chéo kiểu game, 2D nhìn thẳng trước/ngang/trên.', 'Có động tác thì bấm từng động tác để chạy thử; bảng dưới ghi nguồn, bản quyền, số mặt, xương.', 'Mọi định dạng (.blend, .fbx, .obj, .bvh…) được chuyển dần về GLB — định dạng chung của app.'],
    actions: [{ label: 'Mở kho', open: 'kho3d', primary: true }] },
  { id: 'kho-media', nhom: 'kho', no: 14, name: 'Kho media', home: 'Tàng Âm Các', icon: Images, tint: ['#e6c27a', '#7a5a2a'], status: 'vang',
    short: 'Mọi ảnh / video của các bài (ảnh minh họa, 5 thumbnail) và ảnh / video riêng: xem phóng to, lấy file.',
    steps: ['Lọc theo loại, khung thumbnail, ca sĩ; tìm theo tên bài hoặc ghi chú.', 'Bấm một ảnh: phóng to / thu nhỏ bằng lăn chuột, kéo để di, ← → chuyển ảnh.', 'Lấy file: mở đúng thư mục bài đang chứa (ảnh riêng thì thư mục Kho media). Một ảnh gắn được nhiều bài.'],
    actions: [{ label: 'Mở kho', open: 'kho-media', primary: true }] },
  { id: 'so-viec', nhom: 'dieu-khien', no: 15, name: 'Sổ việc chủ tịch', home: 'Mộc Ngư Quán', icon: ClipboardList, tint: ['#7fd0a8', '#2f6f50'], status: 'vang',
    short: 'Việc chủ tịch giao: thời gian, yêu cầu nguyên văn, ghi chú, ai làm, kết quả, trạng thái duyệt.',
    steps: ['Gõ việc mới vào ô trên cùng rồi Enter: việc vào sổ với trạng thái "Chờ làm".', 'Lọc theo trạng thái (Chờ làm · Đang làm · Xong, chờ duyệt · Đã duyệt · Bỏ) hoặc gõ chữ để tìm.', 'Bấm một việc: sửa ghi chú, đổi trạng thái, bấm "Chủ tịch duyệt" khi đã xem xong.', 'Claude đọc / ghi cùng sổ này; "Nhập lại từ DO-DANG" chỉ thêm việc mới, không đè việc đã sửa.'],
    actions: [{ label: 'Mở sổ', open: 'so-viec', primary: true }] },
  { id: 'han-muc', nhom: 'dieu-khien', no: 16, name: 'Trạm hạn mức', home: 'Đại sảnh', icon: Gauge, tint: ['#7fd6b0', '#2f6a55'], status: 'vang',
    short: 'Hạn mức đã dùng / còn lại của từng thợ AI: Claude Code, thợ Claude (mwapi), Codex, Gemini, tín dụng Flow / Dreamina. Số không đọc được thì ghi rõ, không đoán.',
    steps: ['Mở app là đọc ngay file phiên trên máy (Claude Code, Codex) và số đã dò sẵn trong Sổ tài khoản — không gọi API, không mở trình duyệt.', 'Mỗi nguồn một thẻ: đã dùng, còn lại, giờ hồi; xanh còn nhiều, vàng gần hết, đỏ hết / bị chặn, xám chưa rõ. Claude: file máy chỉ có token, % tuần thật thì mày nhập ở ô dưới thẻ (≥ 90% tô đỏ).', 'Nhãn Đo được / Ước tính / Chưa có số cho biết số liệu tin tới đâu; rê chuột để xem cách đo.', 'Tín dụng Flow / Dreamina muốn mới thì bấm "Dò tín dụng" trong Sổ tài khoản rồi Làm mới ở đây.'],
    actions: [{ label: 'Mở app', open: 'han-muc', primary: true }] },
  { id: 'ban-do', nhom: 'giao-dien', no: 17, name: 'Bản đồ sao', home: 'Mộc Ngư Quán', icon: Network, tint: ['#8fb8ff', '#2f3f8a'], status: 'vang',
    short: 'Bản đồ liên kết cả app: mỗi file, kênh IPC, mini app là một ngôi sao; đường nối cho biết cái gì gọi cái gì.',
    steps: ['Mở app là thấy bản đồ 3D (tools/ban-do/xem.html) ngay trong khung, kéo xoay, lăn chuột phóng to.', 'Bấm một ngôi sao: xem nó nối với file / kênh / dữ liệu nào.', 'Code đổi thì bấm “Quét lại”: app quét mã nguồn dựng lại bản đồ (như npm run ban-do).', 'Lần đầu cần mạng để nạp thư viện vẽ 3D.'],
    actions: [{ label: 'Mở bản đồ', open: 'ban-do', primary: true }] },
  { id: 'kho-clip', nhom: 'kho', no: 18, name: 'Kho clip', home: 'Xưởng MV', icon: FolderInput, tint: ['#8fc7d8', '#2a5a6a'], status: 'vang',
    short: 'Mọi clip / ảnh đã làm (Veo, Dreamina nhép, ảnh ChatGPT, video quay 3D, Kho media): lọc, chọn, chép ra một thư mục.',
    steps: ['Mở app là quét thư mục dựng MV, video 3D, Kho media, thư mục bài; nhãn bài / ca sĩ / cảnh / mô tả tự lấy từ kế hoạch MV.', 'Lọc theo nguồn, loại, khung, tiếng, ca sĩ, bài; gõ chữ để tìm theo mô tả cảnh. Rê chuột lên video là chạy thử.', 'Bấm ô để chọn (Shift + bấm chọn cả dải), rồi "Chép ra": bản sao vào E:\\AI Duy TTD\\AI Clip chon\\<ngày> hoặc thư mục tự chọn, kèm nguon.txt ghi file gốc. File gốc không bị dời.', 'Bút chì trên ô: sửa nhãn tay (bài, ca sĩ, mô tả…); quét lại vẫn giữ nhãn đã sửa.'],
    actions: [{ label: 'Mở kho', open: 'kho-clip', primary: true }] },
  { id: 'cai-dat-nen', nhom: 'giao-dien', no: 19, name: 'Cài đặt nền', home: 'Màn hình chính', icon: Settings, tint: ['#b9b3d8', '#4a4470'], status: 'xanh', rieng: 'cai-dat-nen',
    short: 'Bật/tắt hiệu ứng nền (nhẹ máy) và bật lại nền 3D cũ. Giống nút bánh răng góc dưới phải màn hình chính.',
    steps: ['Hiệu ứng nền: rê chuột có chiều sâu, quả cầu thở sáng, đom đóm bay. Tắt cho nhẹ máy.', 'Nền 3D cũ: bật lại đảo bay / trang viên 3D thay cho ảnh cây tinh tú.'],
    actions: [] },
  { id: 'tao-hinh', nhom: 'dich-vu', no: 20, name: 'Tạo hình theo lệnh', home: 'Họa thất', icon: Sparkles, tint: ['#c7a6ff', '#5a3f8a'], status: 'vang',
    short: 'Nhập một ảnh, chọn phong cách có sẵn (xoay 360°, X-quang, tách bộ phận, drone, phân tích cấu trúc, ảnh sản phẩm sang, poster quảng cáo…): câu lệnh tự điền, Codex Business vẽ.',
    steps: ['Bấm ô ảnh (hoặc kéo thả) để nhập một ảnh.', 'Chọn một phong cách: câu lệnh tiếng Anh tự điền vào ô bên phải, khung ảnh tự chọn theo kiểu; sửa câu lệnh hoặc thêm ghi chú nếu muốn.', 'Chọn số ảnh rồi bấm Tạo: Codex suất Business vẽ (hết tín dụng tự sang suất Plus), 1–3 phút mỗi ảnh.', 'Ảnh lưu ở E:\\AI Duy TTD\\AI Ket Qua\\_Tao hinh\\<ngày>; bấm ảnh kết quả để mở thư mục.'],
    actions: [{ label: 'Mở app', open: 'tao-hinh', primary: true }] },
  { id: 'thung-do', nhom: 'kho', no: 21, name: 'Thùng đồ', home: 'Tàng Âm Các', icon: FolderInput, tint: ['#9dd7c5', '#376b60'], status: 'vang',
    short: 'Thả file hoặc thư mục, phân tích bản thu, sửa thông tin rồi nhập vào kho nhạc.',
    steps: ['Kéo file hoặc thư mục từ Explorer, hoặc bấm Chọn file / thư mục rồi Phân tích.', 'Sửa tên bài, ca sĩ, phong cách; kiểm trùng, xem lời và ảnh, nghe thử từng món. Món trùng mã băm mặc định bỏ chọn.', 'Chọn món đủ tên bài và ca sĩ rồi bấm Nhập các món đã chọn. Nhập thành công: file nguồn vào Thùng rác; bấm đường dẫn kết quả để mở thư mục kho.'],
    actions: [{ label: 'Mở app', open: 'thung-do', primary: true }] },
  { id: 'master-nhac', nhom: 'may', no: 22, name: 'Master nhạc', home: 'Tàng Âm Các', icon: AudioWaveform, tint: ['#90d8cb', '#376b60'], status: 'vang',
    short: 'Master WAV bằng C (mặc định), B theo bài mẫu hoặc A. Đo trước/sau, nghe so cùng độ to.',
    steps: ['Thả WAV hoặc chọn bài trong kho.', 'Chọn cách master, thể loại hoặc Master mẫu trong kho.', 'Nghe so -14 LUFS; ghi đè có xác nhận và bản cũ vào Thùng rác.'], actions: [{ label: 'Mở app', open: 'master-nhac', primary: true }] },
  { id: 'phat-hanh', nhom: 'kho', no: 23, name: 'Chỉ mục phát hành', home: 'Tàng Âm Các', icon: Library, tint: ['#bdc5f0', '#485580'], status: 'vang',
    short: 'Kiểm link theo mã video, ghi bài và ca sĩ, tra danh sách phát hành.',
    steps: ['Dán link để kiểm trùng.', 'Chọn bài, nhập ca sĩ, ghi chú rồi Ghi.', 'Lọc bảng theo bài, nền tảng, ca sĩ; bấm link mở trình duyệt.'], actions: [{ label: 'Mở app', open: 'phat-hanh', primary: true }] },
  { id: 'suc-may', nhom: 'may', no: 24, name: 'Sức máy', home: 'Đại sảnh', icon: Gauge, tint: ['#66cfb4', '#243645'], status: 'vang',
    short: 'Theo dõi CPU, RAM, GPU, nhiệt độ và tự hãm tải khi RAM đầy.',
    steps: ['Đo ngầm ngay khi mở app; xem biểu đồ và tiến trình dùng nhiều RAM.', 'Bật hãm tải, đặt mức vàng và đỏ; dưới 88% thả tiến trình, dưới 85% nhận việc mới.'],
    actions: [{ label: 'Mở app', open: 'suc-may', primary: true }] },
  { id: 'tong-dai', nhom: 'may', no: 25, name: 'Tổng đài', home: 'Đại sảnh', icon: Network, tint: ['#79cbbd', '#34495f'], status: 'vang',
    short: 'Chọn thợ còn lượt, nhớ giờ hồi và xếp hàng dự phòng; theo dõi tín dụng tài khoản web.',
    steps: ['Xem đèn trạng thái, giờ hồi và số việc hôm nay.', 'Đổi thứ tự thợ bằng nút Lên / Xuống; cho nghỉ hoặc gọi lại ngay.', 'Nhập tín dụng còn lại của tài khoản web; ưu tiên 50 tín dụng đầu mỗi ngày.'],
    actions: [{ label: 'Mở app', open: 'tong-dai', primary: true }] },

];
