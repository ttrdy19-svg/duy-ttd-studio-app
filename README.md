# Duy TTD Studio

Ứng dụng máy tính (Electron + React + three.js) phục vụ kênh nhạc sáng tác **Duy TTD**: từ bài hát trong kho đến MV hoàn chỉnh, gần như tự động, với một "phòng họp" nơi nhiều trợ lý AI cùng bàn việc.

## Làm được gì
- **Kho nhạc**: nhập bài (mp3 + wav), đọc thông tin, làm sạch lời, master âm thanh (−14 LUFS, −1 dBTP), phụ đề SRT căn theo giọng hát, ký âm, hợp âm.
- **Xưởng MV**: lập kế hoạch cảnh theo lời bài → vẽ ảnh từng cảnh → hát nhép (lip-sync) → video ngắn từ ảnh → ráp MV 1080p/4K có phụ đề kiểu karaoke và mô tả YouTube.
- **Phòng họp AI**: chủ tịch đưa yêu cầu, các trợ lý (Claude, ChatGPT, Gemini, Muse, Copilot) lần lượt góp ý theo vai, mỗi ý một dòng, chủ tịch duyệt từng ý.
- **Tổng đài tài khoản**: theo dõi hạn mức từng trợ lý / tài khoản, tự đổi người làm khi hết lượt; không lưu hay hiển thị email, khoá.
- **Kho clip, Tạo hình, Master nhạc, Chỉ mục phát hành, Sức máy** và nhiều mini app khác.

> **Bản giới thiệu**: repo này chỉ chứa phần GIAO DIỆN (React + three.js). Phần lõi — dây chuyền làm MV, căn phụ đề theo giọng, bộ điều phối các trợ lý AI, Tổng đài tài khoản, tiện ích điều khiển trình duyệt và máy chủ ứng dụng — đã được lược bỏ.

## Chạy thử giao diện
```bash
npm install
npm run dev
```

Khoá API, tài khoản và dữ liệu nhạc **không** nằm trong repo — app đọc từ file cấu hình cục bộ trên máy người dùng.

## Bản quyền
Mã nguồn công bố để giới thiệu dự án. Hình ảnh nhân vật và âm nhạc thuộc kênh Duy TTD.
