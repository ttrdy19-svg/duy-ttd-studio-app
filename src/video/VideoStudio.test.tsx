import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoStudio from "./VideoStudio";
import { renderVideo } from "./renderVideo";

vi.mock("./renderVideo", () => ({
  supportedVideoType: () => "video/webm",
  renderVideo: vi.fn(),
}));
const track = { name: "Mây.wav", url: "blob:music", duration: 4, size: 1000 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.stubGlobal(
    "Image",
    class {
      onload?: () => void;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn(() => "blob:generated");
      static revokeObjectURL = vi.fn();
    },
  );
});
function setup(selectedTrack: typeof track | null = track) {
  const onResult = vi.fn();
  const onBusyChange = vi.fn();
  const onImportMusic = vi.fn();
  const onPauseMusic = vi.fn();
  const app = render(
    <VideoStudio
      track={selectedTrack}
      result={null}
      onResult={onResult}
      onBusyChange={onBusyChange}
      onImportMusic={onImportMusic}
      onPauseMusic={onPauseMusic}
    />,
  );
  return { ...app, onResult, onBusyChange, onImportMusic, onPauseMusic };
}
async function addImages() {
  fireEvent.change(screen.getByLabelText("Chọn ảnh bối cảnh"), {
    target: {
      files: [new File(["image1"], "Một.jpg"), new File(["image2"], "Hai.png")],
    },
  });
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Xuất video WebM",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
}

describe("Luồng dựng video", () => {
  it("không cho xuất khi thiếu nhạc và dẫn tới nhập file", async () => {
    const { onImportMusic } = setup(null);
    expect(
      (
        screen.getByRole("button", {
          name: "Xuất video WebM",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Chọn nhạc" }));
    expect(onImportMusic).toHaveBeenCalledOnce();
  });
  it("chia thời lượng, sắp xếp, gỡ ảnh và chặn tổng thời lượng sai", async () => {
    setup();
    await addImages();
    expect(
      (screen.getByLabelText("Thời lượng cảnh 1") as HTMLInputElement).value,
    ).toBe("2");
    await userEvent.click(
      screen.getByRole("button", { name: "Đưa cảnh 1 xuống" }),
    );
    expect(screen.getByText("01 · Hai.png")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Thời lượng cảnh 1"), {
      target: { value: "1" },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Xuất video WebM",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await userEvent.click(
      screen.getByRole("button", { name: "Chia đều theo nhạc" }),
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Xuất video WebM",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Gỡ cảnh 1" }));
    expect(
      (screen.getByLabelText("Thời lượng cảnh 1") as HTMLInputElement).value,
    ).toBe("4");
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  it("chỉ nhận kết quả sau khi encoder hoàn thành, chuyển đúng tùy chọn", async () => {
    const { onResult, onBusyChange, onPauseMusic } = setup();
    await addImages();
    vi.mocked(renderVideo).mockResolvedValue({
      blob: new Blob(["real-encoder-output"], { type: "video/webm" }),
      duration: 4,
    });
    await userEvent.selectOptions(
      screen.getByLabelText("Khung hình"),
      "portrait",
    );
    await userEvent.selectOptions(screen.getByLabelText("Chuyển cảnh"), "cut");
    await userEvent.click(
      screen.getByRole("button", { name: "Xuất video WebM" }),
    );
    await waitFor(() => expect(onResult).toHaveBeenCalledOnce());
    expect(renderVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        portrait: true,
        transition: "cut",
        audioUrl: "blob:music",
      }),
    );
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Mây-9x16.webm", duration: 4 }),
    );
    expect(onBusyChange.mock.calls.map((call) => call[0])).toEqual([
      true,
      false,
    ]);
    expect(onPauseMusic).toHaveBeenCalled();
  });
  it("encoder thất bại không tạo thành phẩm giả và cho phép thử lại", async () => {
    const { onResult } = setup();
    await addImages();
    vi.mocked(renderVideo).mockRejectedValue(
      new Error("Không giải mã được nhạc."),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Xuất video WebM" }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Không giải mã được nhạc.",
    );
    expect(onResult).not.toHaveBeenCalled();
    expect(
      (
        screen.getByRole("button", {
          name: "Xuất video WebM",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("hủy xuất không tạo thành phẩm và mở lại các thao tác", async () => {
    const { onResult } = setup();
    await addImages();
    vi.mocked(renderVideo).mockImplementation(
      ({ signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () =>
            reject(new DOMException("Cancelled", "AbortError")),
          ),
        ),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Xuất video WebM" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Hủy xuất" }));
    await screen.findByText("Đã hủy xuất. Bản xuất dở không được lưu.");
    expect(onResult).not.toHaveBeenCalled();
    expect(
      (
        screen.getByRole("button", {
          name: "Xuất video WebM",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("cho phép soát cue thủ công trước khi tải SRT", async () => {
      setup();
      await userEvent.click(screen.getByRole("button", { name: /Thêm câu/ }));
      fireEvent.change(screen.getByLabelText("Nội dung"), {
        target: { value: "Mây bay qua núi" },
      });
      expect(screen.getByRole("button", { name: "Tải file SRT" })).toBeTruthy();
      expect(screen.getByText(/1 câu/)).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Xóa phụ đề 1" }));
      expect(screen.queryByRole("button", { name: "Tải file SRT" })).toBeNull();
  });
  it("nhập SRT, cho sửa cue và xuất lại", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Nhập SRT" }));
    fireEvent.change(screen.getByLabelText("Chọn file SRT"), {
      target: {
        files: [
          new File(
            ["1\r\n00:00:00,250 --> 00:00:01,500\r\nMây bay qua núi\r\n"],
            "loi-bai-hat.srt",
            { type: "application/x-subrip" },
          ),
        ],
      },
    });
    expect(await screen.findByDisplayValue("Mây bay qua núi")).toBeTruthy();
    expect(screen.getByText("Đã nhập 1 câu từ loi-bai-hat.srt.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Tải file SRT" }));
    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: "application/x-subrip;charset=utf-8" }),
    );
  });
  it("từ chối file không phải SRT mà không làm mất cue hiện có", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Thêm câu/ }));
    fireEvent.change(screen.getByLabelText("Nội dung"), {
      target: { value: "Cue hiện tại" },
    });
    fireEvent.change(screen.getByLabelText("Chọn file SRT"), {
      target: {
        files: [new File(["nội dung"], "phu-de.txt", { type: "text/plain" })],
      },
    });
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Hãy chọn file có đuôi .srt.",
    );
    expect(screen.getByDisplayValue("Cue hiện tại")).toBeTruthy();
  });
});
