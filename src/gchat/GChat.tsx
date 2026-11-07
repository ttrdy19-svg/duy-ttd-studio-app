import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Bot,
  Check,
  FolderOpen,
  LoaderCircle,
  MessageSquare,
  Send,
  Settings2,
  X,
} from "lucide-react";
import "./gchat.css";

type ProviderKind = "api" | "cli";
type CliKind = "codex" | "gemini" | "copilot";
type Provider = GChatProvider;
type State = GChatState;

const apiPresets = {
  gemini: {
    label: "Gemini API",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  openai: { label: "OpenAI API", baseURL: "https://api.openai.com/v1" },
  compatible: { label: "OpenAI-compatible", baseURL: "" },
} as const;

const cliLabels: Record<CliKind, string> = {
  codex: "Codex CLI",
  gemini: "Gemini CLI",
  copilot: "Copilot CLI",
};

function messageOf(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

export default function GChat({ initialPrompt }: { initialPrompt?: string } = {}) {
  const desktop = window.manorDesktop;
  const [state, setState] = useState<State | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [chatMode, setChatMode] = useState<"free" | "task">("free");
  const [leadProviderId, setLeadProviderId] = useState("");
  const [agentProgress, setAgentProgress] = useState<Record<string, GChatAgentProgress>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (initialPrompt) {
      setDraft(initialPrompt);
      setSelectedProviderIds((prev) => (prev.includes("tu-am") ? prev : [...prev, "tu-am"]));
    }
  }, [initialPrompt]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerKind, setProviderKind] = useState<ProviderKind>("api");
  const [apiPreset, setApiPreset] = useState<keyof typeof apiPresets>("gemini");
  const [editingProviderId, setEditingProviderId] = useState("");
  const [providerLabel, setProviderLabel] = useState("");
  const [baseURL, setBaseURL] = useState<string>(apiPresets.gemini.baseURL);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [cli, setCli] = useState<CliKind>("codex");
  const [busyAction, setBusyAction] = useState("");
  const transcript = useRef<HTMLDivElement>(null);

  const providers = state?.providers ?? [];
  const rooms = state?.rooms ?? [];
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const availableProviders = useMemo(() => providers.filter((item) => item.configured), [providers]);
  const participants = useMemo(
    () => availableProviders.filter((item) => selectedProviderIds.includes(item.id)),
    [availableProviders, selectedProviderIds],
  );

  async function refreshState(preferredRoomId?: string) {
    if (!desktop) return;
    const next = await desktop.gchat.getState();
    setState(next);
    setSelectedRoomId((current) =>
      preferredRoomId ?? (next.rooms.some((room) => room.id === current) ? current : next.rooms[0]?.id ?? ""),
    );
    setSelectedProviderIds((current) => {
      const available = next.providers.filter((item) => item.configured).map((item) => item.id);
      const selected = current.filter((id) => available.includes(id));
      return selected.length ? selected : available;
    });
    setLeadProviderId((current) => current || next.providers.find((item) => item.configured)?.id || "");
  }

  useEffect(() => {
    if (!desktop) {
      setLoading(false);
      return;
    }
    desktop.gchat.getState()
      .then((next) => {
        setState(next);
        setSelectedRoomId(next.rooms[0]?.id ?? "");
        const configured = next.providers.filter((item) => item.configured).map((item) => item.id);
        setSelectedProviderIds(configured);
        setLeadProviderId(configured[0] ?? "");
      })
      .catch((reason) => setError(messageOf(reason, "Không mở được G Chat.")))
      .finally(() => setLoading(false));
  }, [desktop]);

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [selectedRoomId, selectedRoom?.messages.length, sending, agentProgress]);

  useEffect(() => {
    if (!desktop) return;
    return desktop.gchat.onAgentProgress((progress) => {
      if (progress.roomId !== selectedRoomId) return;
      setAgentProgress((current) => ({ ...current, [progress.providerId]: progress }));
    });
  }, [desktop, selectedRoomId]);

  function resetProviderForm(nextKind: ProviderKind) {
    setProviderKind(nextKind);
    setEditingProviderId("");
    setProviderLabel(nextKind === "api" ? apiPresets.gemini.label : cliLabels.codex);
    setApiKey("");
    setModel("");
    setModelOptions([]);
    setApiPreset("gemini");
    setBaseURL(apiPresets.gemini.baseURL);
    setCli("codex");
    setError("");
    setNotice("");
  }

  function editProvider(item: Provider) {
    setEditingProviderId(item.id);
    setProviderLabel(item.label);
    setApiKey("");
    setModelOptions([]);
    setError("");
    setNotice("");
    if (item.type === "cli") {
      setProviderKind("cli");
      setCli(item.cli ?? "codex");
    } else {
      setProviderKind("api");
      setBaseURL(item.baseURL ?? "");
      setModel(item.model ?? "");
      setApiPreset(
        Object.entries(apiPresets).find(([, preset]) => preset.baseURL === item.baseURL)?.[0] as keyof typeof apiPresets ?? "compatible",
      );
    }
    setSettingsOpen(true);
  }

  async function discoverModels() {
    if (!desktop) return;
    setBusyAction("models");
    setError("");
    try {
      const options = await desktop.gchat.discoverModels({
        baseURL,
        apiKey,
        ...(editingProviderId ? { providerId: editingProviderId } : {}),
      });
      setModelOptions(options.map((item) => item.id));
      setNotice(`Đã tìm thấy ${options.length} model.`);
    } catch (reason) {
      setError(messageOf(reason, "Không lấy được danh sách model."));
    } finally {
      setBusyAction("");
    }
  }

  async function saveProvider(event: FormEvent) {
    event.preventDefault();
    if (!desktop) return;
    setBusyAction("save");
    setError("");
    setNotice("");
    try {
      let saved: Provider;
      if (providerKind === "api") {
        saved = await desktop.gchat.saveApiProvider({
          ...(editingProviderId ? { id: editingProviderId } : {}),
          label: providerLabel,
          baseURL,
          model,
          apiKey,
        });
      } else {
        saved = await desktop.gchat.saveCliProvider({
          ...(editingProviderId ? { id: editingProviderId } : {}),
          label: providerLabel,
          cli,
        });
      }
      setApiKey("");
      await refreshState();
      setSelectedProviderIds((current) => current.includes(saved.id) ? current : [...current, saved.id]);
      setLeadProviderId((current) => current || saved.id);
      setSettingsOpen(false);
      setNotice(saved.configured ? `${saved.label} đã sẵn sàng.` : `${saved.label} đã lưu, nhưng chưa cài CLI tương ứng.`);
    } catch (reason) {
      setError(messageOf(reason, "Không lưu được kết nối."));
    } finally {
      setBusyAction("");
    }
  }

  async function startCliLogin() {
    if (!desktop || cli === "copilot") return;
    setBusyAction("login");
    setError("");
    setNotice("");
    try {
      await desktop.gchat.startCliLogin(cli);
      setNotice(`Đã mở cửa sổ đăng nhập ${cliLabels[cli]}. Hoàn tất đăng nhập trong cửa sổ đó rồi quay lại G Chat.`);
    } catch (reason) {
      setError(messageOf(reason, `Không mở được đăng nhập ${cliLabels[cli]}.`));
    } finally {
      setBusyAction("");
    }
  }

  async function removeProvider(id: string) {
    if (!desktop) return;
    setBusyAction("remove");
    setError("");
    try {
      const next = await desktop.gchat.removeProvider(id);
      setState(next);
      setSelectedProviderIds((current) => current.filter((item) => item !== id));
      setLeadProviderId((current) => current === id ? next.providers.find((item) => item.configured)?.id ?? "" : current);
      setSettingsOpen(false);
      setNotice("Đã xóa kết nối.");
    } catch (reason) {
      setError(messageOf(reason, "Không xóa được kết nối."));
    } finally {
      setBusyAction("");
    }
  }

  function toggleParticipant(providerId: string) {
    setSelectedProviderIds((current) => {
      if (current.includes(providerId)) {
        const next = current.filter((id) => id !== providerId);
        if (leadProviderId === providerId) setLeadProviderId(next[0] ?? "");
        return next;
      }
      if (current.length >= 8) {
        setError("Có thể chọn tối đa 8 AI cho một lượt.");
        return current;
      }
      setError("");
      setLeadProviderId((lead) => lead || providerId);
      return [...current, providerId];
    });
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!desktop || !selectedRoom || !participants.length || !text || sending) return;
    setDraft("");
    setSending(true);
    setAgentProgress(Object.fromEntries(participants.map((item) => [item.id, {
      roomId: selectedRoom.id,
      providerId: item.id,
      providerName: item.label,
      status: chatMode === "task" && item.id === leadProviderId ? "waiting" : "running",
    }])));
    setError("");
    try {
      const room = await desktop.gchat.send({
        roomId: selectedRoom.id,
        providerIds: participants.map((item) => item.id),
        mode: chatMode,
        ...(chatMode === "task" ? { leadProviderId } : {}),
        text,
      });
      setState((current) => current ? {
        ...current,
        rooms: current.rooms.map((item) => item.id === room.id ? room : item)
          .sort((a, b) => b.updatedAt - a.updatedAt),
      } : current);
      try {
        const latest = await desktop.gchat.getState();
        setState((current) => current ? { ...current, providers: latest.providers } : current);
      } catch {
        setNotice("Các AI đã trả lời; chưa cập nhật được trạng thái quota mới nhất.");
      }
    } catch (reason) {
      setDraft(text);
      setError(messageOf(reason, "AI chưa trả lời được."));
      try { await refreshState(); } catch { /* Keep the original request error visible. */ }
    } finally {
      setSending(false);
      setAgentProgress({});
    }
  }

  async function cancelMessage() {
    if (!desktop || !selectedRoom) return;
    await desktop.gchat.cancel(selectedRoom.id);
  }

  async function selectWorkspace() {
    if (!desktop) return;
    try {
      const workspace = await desktop.gchat.selectWorkspace();
      if (workspace) {
        setState((current) => current ? { ...current, workspace } : current);
        setNotice("Đã đổi thư mục làm việc của CLI.");
      }

    } catch (reason) {
      setError(messageOf(reason, "Không đổi được thư mục làm việc."));
    }
  }

  const quotaLabel = (item: Provider) => {
    if (!item.configured) return "Chưa cài hoặc chưa kết nối";
    if (item.status === "limited") return "Đã chạm giới hạn";
    if (item.status === "error") return "Lượt gần nhất gặp lỗi";
    if (item.type === "cli") return "Quota do CLI/nhà cung cấp quản lý";
    const total = item.usage?.total_tokens;
    return typeof total === "number"
      ? `${total.toLocaleString()} token lượt gần nhất`
      : "Quota còn lại không được cung cấp";
  };

  if (!desktop) {
    return (
      <section className="gchat-unavailable" aria-label="G Chat">
        <MessageSquare size={28} />
        <h2>G Chat cần bản Windows</h2>
        <p>API key được giữ an toàn trong Electron; CLI cần được cài trên máy này.</p>
      </section>
    );
  }

  return (
    <section className="gchat" aria-label="G Chat">
      <aside className="gchat-sidebar">
        <div className="gchat-side-heading">
          <div>
            <span className="gchat-kicker">AI MANOR STUDIO</span>
            <h2>G Chat</h2>
          </div>
          <button className="gchat-icon-button" aria-label="Thêm kết nối AI" disabled={sending} onClick={() => {
            resetProviderForm("api");
            setSettingsOpen(true);
          }}>
            <Settings2 size={17} />
          </button>
        </div>

        <div className="gchat-connections">
          <div className="gchat-section-label">
            <span>KẾT NỐI AI</span>
            <button onClick={() => {
              resetProviderForm("api");
              setSettingsOpen(true);
            }}>Thêm</button>
          </div>
          {providers.length ? providers.map((item) => {
            const participating = selectedProviderIds.includes(item.id);
            return (
              <div className={`gchat-provider ${participating ? "selected" : ""} ${!item.configured ? "unavailable" : ""}`} key={item.id}>
                <button
                  className="gchat-provider-select"
                  aria-pressed={participating}
                  disabled={sending || !item.configured}
                  onClick={() => toggleParticipant(item.id)}
                  title={item.configured ? `${participating ? "Bỏ" : "Thêm"} ${item.label} ${participating ? "khỏi" : "vào"} lượt chat` : `${item.label} chưa kết nối`}
                >
                  <span className={`gchat-status ${item.configured ? "online" : ""}`}>{participating && <Check size={9} />}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.type === "api" ? item.model : cliLabels[item.cli ?? "codex"]}</small>
                    <small className={`gchat-provider-quota ${item.status === "limited" ? "limited" : ""}`}>{quotaLabel(item)}</small>
                  </span>
                </button>
                <button className="gchat-provider-edit" aria-label={`Cấu hình ${item.label}`} onClick={() => editProvider(item)}>
                  <Settings2 size={13} />
                </button>
              </div>
            );
          }) : <p className="gchat-empty-small">Thêm API hoặc CLI để bắt đầu.</p>}
        </div>

        <div className="gchat-rooms">
          <div className="gchat-section-label"><span>CHẾ ĐỘ PHÒNG CHUNG</span></div>
          <div className="gchat-mode-tabs" role="group" aria-label="Chế độ chat">
            <button type="button" className={chatMode === "free" ? "active" : ""} disabled={sending} onClick={() => setChatMode("free")}>Chat tự do</button>
            <button type="button" className={chatMode === "task" ? "active" : ""} disabled={sending} onClick={() => setChatMode("task")}>Giao việc</button>
          </div>
          {chatMode === "task" && (
            <label className="gchat-lead-picker">
              Agent chủ
              <select aria-label="Agent chủ" value={leadProviderId} disabled={sending || !participants.length} onChange={(event) => setLeadProviderId(event.target.value)}>
                {participants.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
              </select>
            </label>
          )}
          <p className="gchat-empty-small">
            {chatMode === "free"
              ? "Mỗi tin nhắn được gửi đồng thời tới các AI đã bật."
              : "AI cộng tác sẽ review trước; agent chủ tổng hợp phản hồi."}
          </p>
        </div>

        <button className="gchat-workspace" onClick={selectWorkspace}>
          <FolderOpen size={15} />
          <span><small>THƯ MỤC CLI</small><strong title={state?.workspace}>{state?.workspace ?? "Chọn workspace"}</strong></span>
        </button>
      </aside>

      <div className="gchat-main">
        <header className="gchat-header">
          <div>
            <span className="gchat-kicker">PHÒNG LÀM VIỆC ĐA AI</span>
            <h3>{selectedRoom?.title ?? "Đang mở phòng chung…"}</h3>
          </div>
          <span className="gchat-participant-count">{participants.length} AI tham gia</span>
        </header>

        <div className="gchat-transcript" ref={transcript} aria-live="polite">
          {loading ? (
            <div className="gchat-welcome"><LoaderCircle size={22} className="gchat-spin" /><p>Đang mở lịch sử chat…</p></div>
          ) : selectedRoom?.messages.length ? selectedRoom.messages.map((item, index) => (
            <article className={`gchat-message ${item.role}`} key={`${selectedRoom.id}-${index}`}>
              <div className="gchat-message-avatar">{item.role === "user" ? "M" : item.role === "assistant" ? <Bot size={16} /> : "!"}</div>
              <div className="gchat-message-body">
                <div className="gchat-message-byline">
                  {item.role === "user" ? "Mày" : item.providerName ?? item.model ?? "AI"}
                  {item.role === "error" ? " · lỗi" : ""}
                  {item.role === "assistant" && item.model && item.providerName ? ` · ${item.model}` : ""}
                </div>
                <p>{item.content}</p>
              </div>
            </article>
          )) : (
            <div className="gchat-welcome">
              <div className="gchat-welcome-mark"><MessageSquare size={24} /></div>
              <h2>Một phòng chung, nhiều AI</h2>
              <p>Bật một hay nhiều kết nối bên trái. Chat tự do cho tất cả cùng trả lời; Giao việc chọn agent chủ và các AI cộng tác.</p>
              <div className="gchat-safety-note"><Check size={14} /> CLI chỉ đọc/review. Chưa có duyệt và áp dụng patch trong G Chat.</div>
            </div>
          )}
          {sending && (
            participants.map((item) => (
              <article className="gchat-message assistant pending" key={`pending-${item.id}`}>
                <div className="gchat-message-avatar">
                  {agentProgress[item.id]?.status === "done" ? <Check size={16} /> : agentProgress[item.id]?.status === "error" ? "!" : <LoaderCircle size={16} className="gchat-spin" />}
                </div>
                <div className="gchat-message-body">
                  <div className="gchat-message-byline">
                    {item.label}{agentProgress[item.id]?.status === "waiting" ? " · chờ lượt" : agentProgress[item.id]?.status === "done" ? " · đã trả lời" : agentProgress[item.id]?.status === "error" ? " · lỗi" : " · đang xử lý"}
                  </div>
                  <p>{agentProgress[item.id]?.content ?? agentProgress[item.id]?.error ?? "Đang trả lời…"}</p>
                </div>
              </article>
            ))
          )}
        </div>

        {error && <p className="gchat-error" role="alert">{error}</p>}
        {notice && <p className="gchat-notice" role="status">{notice}</p>}
        <form className="gchat-composer" onSubmit={sendMessage}>
          <textarea
            aria-label="Tin nhắn"
            placeholder={selectedRoom ? "Nhắn cả phòng… (Enter để gửi, Shift+Enter xuống dòng)" : "Đang mở phòng chung…"}
            value={draft}
            maxLength={20000}
            disabled={!selectedRoom || !participants.length || sending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          {sending ? (
            <button type="button" className="gchat-cancel" onClick={() => void cancelMessage()}>Hủy</button>
          ) : (
            <button className="gchat-send" aria-label="Gửi tin nhắn" disabled={!draft.trim() || !selectedRoom || !participants.length}>
              <Send size={17} />
            </button>
          )}
        </form>
        <p className="gchat-footnote">
          Một lượt gọi tới từng AI được bật; quota/chi phí áp dụng riêng theo nhà cung cấp. Số quota còn lại thường không được CLI/API công khai.
        </p>
      </div>

      {settingsOpen && (
        <div className="gchat-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSettingsOpen(false);
        }}>
          <section className="gchat-modal" role="dialog" aria-modal="true" aria-label="Cấu hình kết nối AI">
            <header><div><span className="gchat-kicker">CẤU HÌNH RIÊNG TRÊN MÁY</span><h2>{editingProviderId ? "Sửa kết nối" : "Thêm kết nối AI"}</h2></div>
              <button className="gchat-icon-button" aria-label="Đóng cấu hình" onClick={() => setSettingsOpen(false)}><X size={18} /></button>
            </header>
            <div className="gchat-kind-tabs">
              <button className={providerKind === "api" ? "active" : ""} onClick={() => resetProviderForm("api")}>API</button>
              <button className={providerKind === "cli" ? "active" : ""} onClick={() => resetProviderForm("cli")}>CLI cục bộ</button>
            </div>
            <form onSubmit={saveProvider}>
              {providerKind === "api" ? (
                <>
                  <label>Loại API
                    <select value={apiPreset} onChange={(event) => {
                      const next = event.target.value as keyof typeof apiPresets;
                      setApiPreset(next);
                      setBaseURL(apiPresets[next].baseURL);
                      if (!providerLabel || Object.values(apiPresets).some((preset) => preset.label === providerLabel))
                        setProviderLabel(apiPresets[next].label);
                    }}>
                      {Object.entries(apiPresets).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>Tên kết nối
                    <input value={providerLabel} onChange={(event) => setProviderLabel(event.target.value)} placeholder="Ví dụ: Gemini công việc" maxLength={60} required />
                  </label>
                  <label>API base URL
                    <input value={baseURL} onChange={(event) => setBaseURL(event.target.value)} placeholder="https://api.example.com/v1" type="url" required />
                  </label>
                  <label>API key
                    <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" autoComplete="new-password" placeholder={editingProviderId ? "Để trống để giữ key đã lưu" : "Dán API key"} autoCapitalize="off" />
                  </label>
                  <div className="gchat-model-row">
                    <label>Model
                      <input value={model} onChange={(event) => setModel(event.target.value)} list="gchat-models" placeholder="Chọn model sau khi dò" required />
                      <datalist id="gchat-models">{modelOptions.map((item) => <option key={item} value={item} />)}</datalist>
                    </label>
                    <button type="button" className="gchat-secondary-button" onClick={() => void discoverModels()} disabled={busyAction === "models" || !baseURL}>
                      {busyAction === "models" ? <LoaderCircle size={14} className="gchat-spin" /> : "Dò model"}
                    </button>
                  </div>
                  <p className="gchat-modal-hint">Dùng API tương thích OpenAI. Gemini API key dùng endpoint OpenAI-compatible. Key được mã hóa bằng Electron safeStorage, không chuyển xuống giao diện lưu trữ.</p>
                </>
              ) : (
                <>
                  <label>CLI
                    <select value={cli} onChange={(event) => {
                      const next = event.target.value as CliKind;
                      setCli(next);
                      if (!editingProviderId) setProviderLabel(cliLabels[next]);
                    }}>
                      {Object.entries(cliLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                  <label>Tên kết nối
                    <input value={providerLabel} onChange={(event) => setProviderLabel(event.target.value)} maxLength={60} required />
                  </label>
                  {cli !== "copilot" && (
                    <button type="button" className="gchat-secondary-button" onClick={() => void startCliLogin()} disabled={busyAction === "login"}>
                      {busyAction === "login" ? "Đang mở cửa sổ…" : `Đăng nhập ${cliLabels[cli]} qua terminal`}
                    </button>
                  )}
                  <p className="gchat-modal-hint">
                    {cli === "gemini"
                      ? "Google có thể từ chối Gemini Code Assist cho cá nhân trên Gemini CLI; đăng nhập lại hoặc cài lại CLI không sửa được lỗi này. Hãy dùng Gemini API bằng API key hoặc chuyển sang Antigravity. Nếu gặp cảnh báo workspace chưa tin cậy, hãy xác nhận thư mục trong Gemini CLI trước khi thử lại."
                      : cli === "copilot"
                        ? "Cài GitHub Copilot CLI theo hướng dẫn https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli, rồi đóng hẳn và mở lại AI Manor Studio để cập nhật PATH."
                        : "Nút đăng nhập mở terminal riêng: Codex dùng lệnh login. Cần cài CLI trước; G Chat chỉ dùng phiên đăng nhập do CLI lưu."}
                    {" "}Codex chạy sandbox read-only; Gemini chạy sandbox/plan; Copilot chỉ cho phép công cụ đọc. AI không được quyền ghi file qua G Chat.
                  </p>
                </>
              )}
              {error && <p className="gchat-error" role="alert">{error}</p>}
              <footer>
                {editingProviderId && <button type="button" className="gchat-remove-button" disabled={busyAction === "remove"} onClick={() => void removeProvider(editingProviderId)}>Xóa kết nối</button>}
                <button type="button" className="gchat-secondary-button" onClick={() => setSettingsOpen(false)}>Đóng</button>
                <button className="gchat-save-button" disabled={busyAction === "save"}>
                  {busyAction === "save" ? "Đang lưu…" : "Lưu kết nối"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
