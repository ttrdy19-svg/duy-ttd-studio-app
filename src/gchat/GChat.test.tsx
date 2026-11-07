import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GChat from "./GChat";

afterEach(() => {
  delete window.manorDesktop;
});

describe("G Chat", () => {
  it("configures an API and sends messages to the whole room or a lead/reviewer group", async () => {
    let providers: GChatProvider[] = [{
      id: "codex",
      label: "Codex CLI",
      type: "cli",
      cli: "codex",
      configured: true,
    }];
    let rooms: GChatRoom[] = [{
      id: "shared-room",
      title: "Phòng chung",
      messages: [],
      updatedAt: 1,
    }];
    const api = {
      getState: vi.fn(async () => ({
        providers,
        rooms,
        workspace: "D:\\AI-Manor-Studio",
        encryptionAvailable: true,
      })),
      saveApiProvider: vi.fn(async (request: { label: string; baseURL: string; model: string; apiKey: string }) => {
        const provider: GChatProvider = {
          id: "gemini",
          label: request.label,
          type: "api",
          baseURL: request.baseURL,
          model: request.model,
          configured: true,
        };
        providers = [...providers, provider];
        return provider;
      }),
      saveCliProvider: vi.fn(),
      startCliLogin: vi.fn(async () => ({ started: true })),
      removeProvider: vi.fn(),
      discoverModels: vi.fn(async () => [{ id: "gemini-fixture" }]),
      selectWorkspace: vi.fn(),
      send: vi.fn(async ({ roomId, providerIds, mode, text }: {
        roomId: string;
        providerIds: string[];
        mode: "free" | "task";
        text: string;
      }) => {
        const responses = mode === "free"
          ? providerIds.map((providerId) => ({
            role: "assistant" as const,
            providerId,
            providerName: providers.find((item) => item.id === providerId)?.label,
            content: `${providerId} cùng chào.`,
          }))
          : [
            { role: "assistant" as const, providerId: "codex", providerName: "Codex CLI", content: "Review." },
            { role: "assistant" as const, providerId: "gemini", providerName: "Gemini thử nghiệm", content: "Tổng hợp." },
          ];
        const room = {
          id: roomId,
          title: "Phòng chung",
          updatedAt: 2,
          messages: [
            { role: "user" as const, content: text },
            ...responses,
          ],
        };
        rooms = [room];
        return room;
      }),
      cancel: vi.fn(),
      onAgentProgress: vi.fn(() => () => {}),
    };
    Object.defineProperty(window, "manorDesktop", { configurable: true, value: { gchat: api } });

    render(<GChat />);
    await userEvent.click(await screen.findByRole("button", { name: "Thêm kết nối AI" }));
    await userEvent.clear(screen.getByLabelText("Tên kết nối"));
    await userEvent.type(screen.getByLabelText("Tên kết nối"), "Gemini thử nghiệm");
    await userEvent.type(screen.getByLabelText("API key"), "gemini-api-key-fixture");
    await userEvent.type(screen.getByLabelText("Model"), "gemini-fixture");
    await userEvent.click(screen.getByRole("button", { name: "Lưu kết nối" }));
    await waitFor(() => expect(api.saveApiProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Gemini thử nghiệm",
        model: "gemini-fixture",
        apiKey: "gemini-api-key-fixture",
      }),
    ));
    expect(await screen.findByRole("heading", { name: "Phòng chung" })).toBeTruthy();
    expect(screen.getByText("Quota do CLI/nhà cung cấp quản lý")).toBeTruthy();

    await userEvent.type(screen.getByLabelText("Tin nhắn"), "Chào cả phòng");
    await userEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith({
      roomId: "shared-room",
      providerIds: ["codex", "gemini"],
      mode: "free",
      text: "Chào cả phòng",
    }));
    expect(await screen.findByText("codex cùng chào.")).toBeTruthy();
    expect(await screen.findByText("gemini cùng chào.")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Giao việc" }));
    expect(screen.getByLabelText("Agent chủ")).toBeTruthy();
    await userEvent.clear(screen.getByLabelText("Tin nhắn"));
    await userEvent.type(screen.getByLabelText("Tin nhắn"), "Phân tích việc này");
    await userEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() => expect(api.send).toHaveBeenLastCalledWith({
      roomId: "shared-room",
      providerIds: ["codex", "gemini"],
      mode: "task",
      leadProviderId: "codex",
      text: "Phân tích việc này",
    }));

    await userEvent.click(screen.getByRole("button", { name: "Thêm kết nối AI" }));
    await userEvent.click(screen.getByRole("button", { name: "CLI cục bộ" }));
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập Codex CLI qua terminal" }));
    await waitFor(() => expect(api.startCliLogin).toHaveBeenCalledWith("codex"));
    expect(await screen.findByText(/Đã mở cửa sổ đăng nhập Codex CLI/)).toBeTruthy();
  });

  it("shows a clear platform limitation when Electron bridge is unavailable", () => {
    render(<GChat />);
    expect(screen.getByRole("heading", { name: "G Chat cần bản Windows" })).toBeTruthy();
  });
});
