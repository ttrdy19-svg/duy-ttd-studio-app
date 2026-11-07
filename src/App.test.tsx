import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { formatDuration } from "./model";

beforeEach(() => {
  let index = 0;
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn(() => `blob:local-test-${++index}`);
      static revokeObjectURL = vi.fn();
    },
  );
});
const music = (name = "Mây núi.wav") =>
  new File(["local audio data"], name, { type: "audio/wav" });
function upload(file: File) {
  fireEvent.change(screen.getByLabelText("Chọn file nhạc MP3 hoặc WAV"), {
    target: { files: [file] },
  });
}

describe("Trang viên tương tác", () => {
  it("mở được năm không gian và nhân viên bằng bàn phím", async () => {
    render(<App />);
    screen.getByRole("button", { name: "Mở Đại sảnh" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(
      within(screen.getByLabelText("Chi tiết không gian")).getByRole(
        "heading",
        { name: "Đại sảnh" },
      ),
    ).toBeTruthy();
    for (const name of [
      "Đại sảnh",
      "Sân chính",
      "Thư phòng",
      "Xưởng sản xuất",
      "Tàng thư các",
    ]) {
      await userEvent.click(screen.getByRole("button", { name: `Mở ${name}` }));
      expect(
        within(screen.getByLabelText("Chi tiết không gian")).getByRole(
          "heading",
          { name },
        ),
      ).toBeTruthy();
    }
    screen.getByRole("button", { name: "Xem nhiệm vụ của Minh Nhi" }).focus();
    await userEvent.keyboard(" ");
    const detail = within(screen.getByLabelText("Chi tiết không gian"));
    expect(detail.getByRole("heading", { name: "Minh Nhi" })).toBeTruthy();
    expect(detail.queryByText("Phác thảo câu chuyện")).toBeNull();
  });

  it("nhập nhạc, hiển thị nhạc phổ, thời lượng và thư viện", async () => {
    render(<App />);
    upload(music());
    const detail = within(screen.getByLabelText("Chi tiết không gian"));
    expect(detail.getByText("Mây núi.wav")).toBeTruthy();
    expect(detail.getByText(/Chưa đọc được thời lượng/)).toBeTruthy();
    const audio = screen.getByLabelText("Nghe Mây núi.wav");
    Object.defineProperty(audio, "duration", { value: 185.7 });
    fireEvent.loadedMetadata(audio);
    expect(detail.getByText(/3:05/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /^Tàng Âm Các/ }));
    expect(screen.getByRole("heading", { name: "Mây núi.wav" })).toBeTruthy();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("từ chối định dạng khác và file trống mà không mất nhạc hiện có", () => {
    render(<App />);
    upload(music("Hợp lệ.MP3"));
    upload(new File(["text"], "khong-phai-nhac.txt", { type: "text/plain" }));
    expect(screen.getByRole("alert").textContent).toContain(".mp3 hoặc .wav");
    expect(screen.getByLabelText("Nghe Hợp lệ.MP3")).toBeTruthy();
    upload(new File([], "trong.wav"));
    expect(screen.getByRole("alert").textContent).toContain("File nhạc trống");
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("thu hồi URL cục bộ khi thay, gỡ nhạc và tháo ứng dụng", async () => {
    const { unmount } = render(<App />);
    upload(music("Một.wav"));
    upload(music("Hai.wav"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-test-1");
    await userEvent.click(screen.getByRole("button", { name: "Gỡ bản nhạc" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-test-2");
    expect(screen.queryByLabelText("Nghe Hai.wav")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Mang giai điệu đến đây/ }),
    ).toBeTruthy();
    upload(music("Ba.wav"));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-test-3");
  });

  it("không tạo nhiệm vụ hay trạng thái hoàn thành mẫu khi nhập nhạc", async () => {
    render(<App />);
    upload(music());
    await userEvent.click(
      screen.getByRole("button", { name: /^Nhiệm vụ/ }),
    );
    expect(screen.getByRole('heading', {name:'Chưa có tác vụ'})).toBeTruthy();
    expect(screen.queryByText('Phác thảo câu chuyện')).toBeNull();
    expect(screen.queryByText('Ươm hình cho giai điệu')).toBeNull();
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
  });

  it("mở hướng dẫn và đóng bằng Escape", async () => {
    render(<App />);
    await userEvent.click(
      screen.getByRole("button", { name: "Hướng dẫn sử dụng" }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Hướng dẫn sử dụng" }),
    );
  });
});

describe("Thời lượng âm thanh", () => {
  it("định dạng theo phút, giây và xử lý metadata không hợp lệ", () => {
    expect(formatDuration(125.9)).toBe("2:05");
    expect(formatDuration(0)).toBe("0:00");
    for (const value of [null, Infinity, NaN, -1])
      expect(formatDuration(value)).toBe("Chưa đọc được thời lượng");
  });
});
