import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompanionPortrait from "./CompanionPortrait";
import ManorScene from "./ManorScene";

vi.mock("./assets", () => ({
  manorBackground: "/test/manor-background.jpg",
  minhNhiPortrait: "/test/minh-nhi.jpg",
}));

describe("Artwork và fallback", () => {
  it("dùng ảnh local cho cảnh và giữ hotspot khi ảnh bị lỗi", () => {
    render(
      <ManorScene
        selected="study"
        onSelect={vi.fn()}
        hasMusic={false}
        onCharacter={vi.fn()}
        characterSelected={false}
      />,
    );
    const image = screen.getByRole("img", { name: /Trang viên cổ phong/ });
    expect(image.getAttribute("src")).toBe("/test/manor-background.jpg");
    expect(screen.queryByText("Chưa có ảnh trang viên.")).toBeNull();
    fireEvent.error(image);
    expect(screen.getByText("Chưa có ảnh trang viên.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Mở / })).toHaveLength(5);
  });

  it("dùng ảnh chân dung và báo thiếu ảnh thay vì vẽ nhân vật giả", () => {
    render(<CompanionPortrait />);
    const image = screen.getByRole("img", {
      name: "Minh Nhi — người đồng hành sáng tạo",
    });
    expect(image.getAttribute("src")).toBe("/test/minh-nhi.jpg");
    fireEvent.error(image);
    expect(screen.getByText("Chưa có ảnh Minh Nhi")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
