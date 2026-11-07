# 🏛️ Kho Mô Hình 3D Điền Trang (AI Manor Studio Models Warehouse)

Toàn bộ các mô hình 3D dưới đây là mã nguồn mở (CC0 / Public Domain / MIT), đã được tải trực tiếp về đặt tại `public/models/` để phục vụ bối cảnh Bàn Trà Cổ Phong và Điền Trang:

| Tên File | Nguồn & Bản Quyền | Mục Đích Trong Bối Cảnh Bàn Trà Điền Trang |
| :--- | :--- | :--- |
| `chinese_tea_table/` | **Poly Haven** (CC0) | **Bàn trà cổ phong**: Bàn trà gỗ sơn mài chi tiết cao kèm Texture PBR (diffuse, normal, roughness). |
| `tea_chair.glb` | **Three.js / Khronos** (CC0/MIT) | **Ghế ngồi bàn trà**: Ghế bành bọc nhung/gỗ cổ phong đặt quanh bàn trà đá. |
| `teacup.glb` | **Three.js** (CC0) | **Chén trà**: Đặt trên bàn để Minh Nhi châm trà mời Chủ nhân. |
| `michelle_character.glb` | **Three.js** (CC0/MIT) | **Nhân vật nữ cổ phong** (Rigged & Animated): Dùng làm avatar 3D cho Minh Nhi (châm trà) và Tử Âm (ngắm sen). |
| `copilot_runner.glb` | **Three.js RobotExpressive** (CC0/MIT) | **Tiểu đồng Copilot** (Rigged & Animated): Robot biểu cảm lanh chanh chạy việc, dọn dẹp, kiểm tra file. |
| `ancient_lantern.glb` | **Khronos glTF Samples** (CC0) | **Lồng đèn cổ phong**: Treo tỏa ánh sáng ấm áp góc bàn trà và vọng cảnh đình. |
| `koi_fish.glb` | **Khronos glTF Samples** (CC0) | **Đàn cá Koi / Cá chép**: Bơi lội tung tăng dưới hồ sen chân cầu đá. |
| `crane_bird.glb` | **Three.js Flamingo/Crane** (CC0/MIT) | **Hạc tiên sải cánh**: Bay lượn trên nền trời Điền Trang tạo phong vị thanh tao. |

---

### Quy ước nạp file từ Tripo3D / Meshy
Khi người dùng xuất thêm file `.glb` từ Tripo3D hoặc Meshy:
1. Đặt file vào `public/models/minh_nhi.glb`, `public/models/tu_am.glb`, `public/models/hoa_an.glb`, etc.
2. Bộ nạp `src/world/modelLoader.ts` sẽ tự động ưu tiên file tùy biến mới nhất, nếu chưa có sẽ dùng fallback các mô hình có sẵn ở trên.

