# Ảnh do chủ dự án cung cấp

Hai ảnh gốc do chủ dự án cung cấp đã có trong repository và được kiểm tra hiển thị. Đường dẫn:

- `manor-background.jpg`: ảnh trang viên trên núi có thác nước, ánh đèn vàng, kích thước reference 2048 × 1009.
- `minh-nhi.jpg`: ảnh cô gái áo xanh trắng bên biển. Giữ ảnh gốc; component sẽ tự crop chân dung, không cần cắt hoặc xóa nền.

Cũng hỗ trợ `.jpg`, `.jpeg`, `.png`, `.webp` cho cả hai tên gốc. Chỉ giữ một file mỗi tên để tránh nhầm phiên bản. Không đổi đuôi để giả chuyển định dạng; ví dụ ảnh cô gái là JPEG thì dùng `minh-nhi.jpg`.

Vite tự nhận asset khi chạy dev. Nếu đang xem production, chạy lại `npm run build` sau khi thêm/thay ảnh. Không cần sửa import, không dùng URL bên ngoài.

Khi thiếu ảnh, app hiển thị thông báo và nền gradient/ô chân dung trống, không tạo ảnh giả hoặc quay lại bản đồ SVG cũ. Hai ảnh thực tế hiện được đóng gói cùng bản build.
