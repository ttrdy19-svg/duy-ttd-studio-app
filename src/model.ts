export type Place = "hall" | "courtyard" | "study" | "workshop" | "library";
export type Status = "waiting" | "working" | "done";
export interface Task {
  id: string;
  title: string;
  detail: string;
  place: Place;
  status: Status;
}
export const statuses: Record<Status, string> = {
  waiting: "Chờ xử lý",
  working: "Đang làm",
  done: "Hoàn thành",
};
export const places: Record<
  Place,
  { name: string; subtitle: string; description: string }
> = {
  hall: {
    name: "Đại sảnh",
    subtitle: "Khởi nguồn ý tưởng",
    description:
      "Nơi những ý tưởng đầu tiên được đón nhận. Theo dõi toàn bộ công việc của trang viên tại đây.",
  },
  courtyard: {
    name: "Sân chính",
    subtitle: "Gặp gỡ nhân viên",
    description:
      "Gặp Minh Nhi, người đồng hành sáng tạo của bạn. Chọn nhân vật để xem những nhiệm vụ được giao.",
  },
  study: {
    name: "Thư phòng",
    subtitle: "Lắng nghe giai điệu",
    description:
      "Nhập một bản nhạc để đặt cuốn nhạc phổ đầu tiên lên bàn. File được giữ ngay trên thiết bị của bạn.",
  },
  workshop: {
    name: "Xưởng sản xuất",
    subtitle: "Ươm hình từ âm thanh",
    description:
      "Ghép ảnh bối cảnh với nhạc, xem trước và xuất video WebM thật ngay trong trình duyệt. Chưa kết nối AI sinh ảnh/video.",
  },
  library: {
    name: "Tàng thư các",
    subtitle: "Lưu giữ tác phẩm",
    description:
      "Xem bản nhạc đang nhập và video vừa xuất. Tải thành phẩm về máy để lưu lâu dài; dữ liệu trong trang chỉ giữ trong phiên.",
  },
};
export const companionDescription =
  "Minh Nhi là trợ lý sáng tạo đồng hành cùng chủ quán, phụ trách gợi ý hình ảnh, thumbnail và hỗ trợ phát triển ý tưởng.";

export const initialTasks: Task[] = [];

// Kept as reference for the original v0.1 interface; never shown as actual work.
export const legacyTasks: Task[] = [
  {
    id: "concept",
    title: "Phác thảo câu chuyện",
    detail: "Cùng Minh Nhi gieo ý tưởng về một cuộc hẹn giữa mây ngàn.",
    place: "hall",
    status: "done",
  },
  {
    id: "scenes",
    title: "Ươm hình cho giai điệu",
    detail: "Minh Nhi phác ý tưởng hình ảnh và thumbnail cổ phong.",
    place: "workshop",
    status: "working",
  },
  {
    id: "music",
    title: "Tiếp nhận bản nhạc đầu tiên",
    detail: "Mang một khúc nhạc đến thư phòng để Minh Nhi cùng lắng nghe.",
    place: "study",
    status: "waiting",
  },
];
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0)
    return "Chưa đọc được thời lượng";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
export function isMusicFile(file: File): boolean {
  return /\.(mp3|wav)$/i.test(file.name);
}
