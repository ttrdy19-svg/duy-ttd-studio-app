import LibraryStudio from './production/LibraryStudio';
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Cloud,
  Clapperboard,
  Download,
  FileMusic,
  Flower2,
  Headphones,
  LayoutGrid,
  Leaf,
  Map,
  Mountain,
  Music2,
  ScrollText,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import ManorScene from "./ManorScene";
import CompanionPortrait from "./CompanionPortrait";
import VideoStudio from "./video/LoopStudio";
import type { CreationDraft } from './creation/types';
import type { VideoResult } from "./video/timeline";
import {
  companionDescription,
  formatDuration,
  initialTasks,
  isMusicFile,
  places,
  statuses,
} from "./model";
import type { Place, Status } from "./model";

type View = "manor" | "tasks" | "library" | "video";
interface Track {
  name: string;
  url: string;
  duration: number | null;
  size: number;
}
const statusIcons = { waiting: Clock3, working: AudioLines, done: Check };

export default function App({
  externalView,
  creationDraft,
  onViewChange,
  onBackToManor,
  onConsultTuAm,
  onAudioForCreation,
  onOpenCreation,
  initialImage,
}: {
  onAudioForCreation?:(file:File,meta?:{title?:string;lyrics?:string;genre?:string;singer?:string})=>void;
  onOpenCreation?:()=>void;
  initialImage?:{url:string;name:string};
  externalView?: View;
  creationDraft?: CreationDraft;
  onViewChange?: (view: View) => void;
  onBackToManor?: () => void;
  onConsultTuAm?: (info: { title?: string; lyrics?: string; genre?: string; singer?: string }) => void;
} = {}) {
  const [view, setView] = useState<View>(externalView ?? "manor");
  useEffect(() => { if (externalView) setView(externalView); }, [externalView]);
  const [selected, setSelected] = useState<Place>("study");
  const [characterSelected, setCharacterSelected] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [activeDraft, setActiveDraft] = useState<CreationDraft | undefined>(creationDraft);
  function showDraft(draft: CreationDraft) {
    setTrack({ name: draft.audio.name, url: draft.audio.url, duration: draft.audio.duration, size: draft.audio.size });
    setActiveDraft(draft);
    setView('video');
  }
  useEffect(() => { if (creationDraft) showDraft(creationDraft); }, [creationDraft]);

  function handleAudioFromLibrary(
    file: File,
    meta?: { title?: string; lyrics?: string; genre?: string; singer?: string }
  ) {
    if(onAudioForCreation){onAudioForCreation(file,meta);return;}
    setError('Nhạc từ Tàng Âm Các cần được đưa vào Họa thất để tạo ảnh và SRT trước.');
  }

  const [filter, setFilter] = useState<Status | "all">("all");
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState(false);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const helpCloseRef = useRef<HTMLButtonElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const objectUrl = track?.url;
  const videoUrl = videoResult?.url;
  useEffect(
    () => () => {
      if (videoUrl?.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );
  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );
  useEffect(() => {
    if (!help) return;
    helpCloseRef.current?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        helpTriggerRef.current?.focus();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        helpCloseRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [help]);

  function importMusic(file?: File) {
    if (!file) return;
    if (exporting) {
      setError("Hãy đợi hoặc hủy xuất video trước khi thay nhạc.");
      return;
    }
    if (!isMusicFile(file)) {
      setError("Vui lòng chọn file nhạc có đuôi .mp3 hoặc .wav.");
      return;
    }
    if (file.size === 0) {
      setError("File nhạc trống. Vui lòng chọn một file khác.");
      return;
    }
    setError("");
    setAudioError(false);
    setTrack({
      name: file.name,
      url: URL.createObjectURL(file),
      duration: null,
      size: file.size,
    });
    setSelected("study");
    setCharacterSelected(false);
    if (view !== "video") setView("manor");
    setTasks((current) =>
      current.map((task) =>
        task.id === "music"
          ? {
              ...task,
              title: "Xem nhạc phổ đã nhập",
              detail: file.name,
              status: "waiting",
            }
          : task,
      ),
    );
    setNotice(
      `Đã đặt nhạc phổ “${file.name}” trong thư phòng. Chưa xử lý bằng AI.`,
    );
  }
  function selectPlace(place: Place) {
    setSelected(place);
    setCharacterSelected(false);
  }
  function navigate(next: View) {
    setView(next);
    setFilter("all");
  }
  const done = tasks.filter((t) => t.status === "done").length;
  const visibleTasks = tasks.filter(
    (t) => filter === "all" || t.status === filter,
  );
  const title =
    view === "video"
      ? "Lưu Ảnh Thất"
      : view === "tasks"
        ? "Bảng nhiệm vụ"
        : view === "library"
          ? "Tàng Âm Các của bạn"
          : "Trở về miền sáng tạo.";
  const placeIcons = {
    hall: Mountain,
    courtyard: Flower2,
    study: BookOpen,
    workshop: Sparkles,
    library: ScrollText,
  };
  const PlaceIcon = placeIcons[selected];

  return (
    <div className={`app-shell${view === 'library' && window.manorDesktop?.library ? ' native-library' : view === 'video' ? ' cinema-workspace' : ''}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("manor");
          }}
          aria-label="AI Manor Studio - Trang viên"
        >
          <span className="brand-mark">
            <Mountain size={27} />
          </span>
          <span>
            AI MANOR<span className="brand-sub">S T U D I O</span>
          </span>
        </a>
        <div className="workspace-label">CÕI SÁNG TẠO</div>
        <nav aria-label="Điều hướng chính">
          <button
            className={view === "manor" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("manor")}
          >
            <Map size={18} />
            Trang viên
            <ChevronRight className="nav-arrow" size={14} />
          </button>
          <button
            className={view === "tasks" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("tasks")}
          >
            <LayoutGrid size={18} />
            Nhiệm vụ<span className="nav-count">{tasks.length}</span>
          </button>
          <button
            className={view === "video" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("video")}
          >
            <Clapperboard size={18} />
            Dựng video{exporting && <span className="nav-count">…</span>}
          </button>
          <button
            className={view === "library" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("library")}
          >
            <BookOpen size={18} />
            Tàng Âm Các
            <span className="nav-count">
              {(track ? 1 : 0) + (videoResult ? 1 : 0)}
            </span>
          </button>
        </nav>
        <div className="sidebar-note">
          <div className="tiny-mountain">
            <Mountain size={53} strokeWidth={0.8} />
            <Cloud size={26} strokeWidth={1} />
          </div>
          <p>
            Ý tưởng gieo xuống.
            <br />
            Thanh âm nở thành hình.
          </p>
          <span>Chậm một nhịp, sáng tạo xa hơn.</span>
        </div>
        <div className="sidebar-bottom">
          <button
            ref={helpTriggerRef}
            className="help-button"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={17} />
            Hướng dẫn sử dụng
          </button>
          <div className="version">
            <span className="green-dot" />
            Xưởng cục bộ<span>v0.2</span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Sơn cư của bạn <ChevronRight size={13} />
            <span>
              {view === "manor"
                ? "Trang viên"
                : view === "tasks"
                  ? "Nhiệm vụ"
                  : view === "video"
                    ? "Dựng video"
                    : "Tàng Âm Các"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="demo-label">
              <span className="green-dot" />
              AI chưa kết nối
            </span>
            <span className="profile" aria-label="Chủ trang viên">
              M
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                MỘC NGƯ TRANG
              </div>
              <h1>{title}</h1>
              <p>
                {view === "manor"
                  ? "Giữa mây ngàn, để một giai điệu dẫn lối câu chuyện."
                  : view === "tasks"
                    ? "Sắp xếp từng bước, nuôi dưỡng từng ý tưởng."
                    : view === "video"
                      ? "Từ bản nhạc đến thước phim đầu tiên."
                      : "Những thanh âm bạn mang đến trang viên."}
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => inputRef.current?.click()}
              disabled={exporting}
            >
              <Upload size={16} />
              Nhập bản nhạc
            </button>
          </div>
          <input
            ref={inputRef}
            disabled={exporting}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
            aria-label="Chọn file nhạc MP3 hoặc WAV"
            className="sr-only"
            onChange={(e) => {
              importMusic(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {error && (
            <div className="error-message" role="alert">
              {error}
              <button aria-label="Đóng lỗi" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          <div className="sr-only" role="status">
            {notice}
          </div>

          {view === "manor" && (
            <div className="manor-layout">
              <section className="map-card" aria-label="Trang viên Mộc Ngư">
                <div className="map-heading">
                  <div>
                    <span className="green-dot" />
                    <h2>Trang viên Mộc Ngư</h2>
                    <span className="map-tag">Sơn cư · Đèn đã lên</span>
                  </div>
                  <span className="weather">
                    <Cloud size={17} />
                    Mây ngàn
                  </span>
                </div>
                <div className="map-body">
                  <ManorScene
                    selected={selected}
                    onSelect={selectPlace}
                    hasMusic={!!track}
                    characterSelected={characterSelected}
                    onCharacter={() => {
                      setCharacterSelected(true);
                      setSelected("courtyard");
                    }}
                  />
                </div>
                <div className="map-footer">
                  <span>
                    <span className="green-dot" />5 chốn dừng chân <i />1 người
                    đồng hành
                  </span>
                  <span>
                    <Map size={14} />
                    Chọn một nơi để khám phá
                  </span>
                </div>
              </section>
              <aside className="detail-card" aria-label="Chi tiết không gian">
                <div className="detail-top">
                  <span className="eyebrow">
                    {characterSelected
                      ? "NGƯỜI ĐỒNG HÀNH"
                      : "KHÔNG GIAN ĐANG CHỌN"}
                  </span>
                  <span className="detail-number">
                    {characterSelected
                      ? "01"
                      : "0" + (Object.keys(places).indexOf(selected) + 1)}
                  </span>
                </div>
                <div className="companion-card">
                  <CompanionPortrait />
                  <div className="companion-caption">
                    <span className="eyebrow">NGƯỜI GIỮ Ý TƯỞNG</span>
                    <h2>Minh Nhi</h2>
                    <span>Trợ lý sáng tạo · Người đồng hành AI</span>
                  </div>
                </div>
                <p className="companion-description">{companionDescription}</p>
                {characterSelected ? (
                  <>
                    <div className="companion-quote">
                      “Chủ quán mang đến thanh âm, Minh Nhi sẽ cùng nuôi dưỡng
                      những ý tưởng.”
                    </div>
                    <div className="character-task-title">
                      Nhiệm vụ được giao <span>{tasks.length}</span>
                    </div>
                    <div className="character-task-list">
                      {tasks.map((t) => (
                        <div key={t.id}>
                          <span className={`task-dot ${t.status}`} />
                          <span>
                            {t.title}
                            <small>{statuses[t.status]}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mini-note">Minh Nhi chưa kết nối dịch vụ AI. Chưa có tác vụ tự động được tạo.</p>
                  </>
                ) : (
                  <>
                    <div className="selected-place-heading">
                      <PlaceIcon size={17} strokeWidth={1.3} />
                      <h2>{places[selected].name}</h2>
                    </div>
                    <div className="detail-subtitle">
                      {places[selected].subtitle}
                    </div>
                    <p className="detail-copy">
                      {places[selected].description}
                    </p>
                    {selected === "study" ? (
                      <div className="study-area">
                        {track ? (
                          <div className="scroll-card">
                            <div className="scroll-visual">
                              <Music2 size={24} />
                              <span>NHẠC PHỔ</span>
                            </div>
                            <strong title={track.name}>{track.name}</strong>
                            <span className="track-info">
                              {formatDuration(track.duration)} ·{" "}
                              {(track.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <span className="local-label">
                              <Check size={12} />
                              Đã nhập từ thiết bị
                            </span>
                          </div>
                        ) : (
                          <button
                            className="upload-zone"
                            onClick={() => inputRef.current?.click()}
                          >
                            <div>
                              <ArrowDownToLine size={23} />
                            </div>
                            <strong>Mang giai điệu đến đây</strong>
                            <span>Chọn bản nhạc đầu tiên của bạn</span>
                            <span className="file-types">MP3 / WAV</span>
                          </button>
                        )}
                        <button
                          className="outline-button"
                          onClick={() => inputRef.current?.click()}
                        >
                          <Upload size={14} />
                          {track ? "Thay bản nhạc" : "Chọn file nhạc"}
                        </button>
                        <p className="privacy-note">
                          Chỉ dùng trong phiên này. Không tải lên máy chủ.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="place-summary">
                          <span>
                            {selected === "library"
                              ? "Video đã xuất"
                              : "Nhiệm vụ tại đây"}
                            <strong>
                              {selected === "library"
                                ? videoResult
                                  ? 1
                                  : 0
                                : tasks.filter((t) => t.place === selected)
                                    .length}
                            </strong>
                          </span>
                          <Leaf size={27} strokeWidth={1} />
                        </div>
                        <button
                          className="outline-button"
                          onClick={() =>
                            selected === "library"
                              ? navigate("library")
                              : selected === "workshop"
                                ? navigate("video")
                                : navigate("tasks")
                          }
                        >
                          Xem{" "}
                          {selected === "library"
                            ? "tàng thư"
                            : selected === "workshop"
                              ? "xưởng dựng video"
                              : "bảng nhiệm vụ"}
                          <ArrowRight size={14} />
                        </button>
                      </>
                    )}
                  </>
                )}
                <div className="detail-bottom">
                  <Leaf size={13} />
                  <span>Mỗi tác phẩm bắt đầu từ một thanh âm.</span>
                </div>
              </aside>
            </div>
          )}

          {/* Keep the audio element mounted across views so local playback and metadata remain available. */}
          {track && (
            <section className="audio-bar" aria-label="Bản nhạc đã nhập">
              <span className="audio-icon">
                <Headphones size={21} />
              </span>
              <div className="audio-name">
                <span>ÂM THANH NGUỒN</span>
                <strong title={track.name}>{track.name}</strong>
              </div>
              <audio
                ref={audioRef}
                key={track.url}
                src={track.url}
                controls
                preload="metadata"
                aria-label={`Nghe ${track.name}`}
                onLoadedMetadata={(e) => {
                  const duration = e.currentTarget.duration;
                  setTrack((t) =>
                    t?.url === track.url
                      ? {
                          ...t,
                          duration: Number.isFinite(duration) ? duration : null,
                        }
                      : t,
                  );
                }}
                onError={() => {
                  setAudioError(true);
                  setNotice(
                    "Trình duyệt không đọc được bản nhạc. Bạn có thể chọn một file MP3 hoặc WAV khác.",
                  );
                }}
              />
              <button
                className="icon-button"
                disabled={exporting}
                aria-label="Gỡ bản nhạc"
                onClick={() => {
                  setTrack(null);
                  setNotice("Đã gỡ bản nhạc khỏi phiên làm việc.");
                  setTasks((t) =>
                    t.map((item) =>
                      item.id === "music" ? { ...initialTasks[2] } : item,
                    ),
                  );
                }}
              >
                <X size={17} />
              </button>
            </section>
          )}

          {track && audioError && (
            <p className="audio-error" role="alert">
              Trình duyệt không phát được file này. File có thể hỏng hoặc dùng
              codec không hỗ trợ; hãy chọn bản MP3/WAV khác.
            </p>
          )}

          <div hidden={view !== "video"}>
            <VideoStudio
              creationDraft={activeDraft}
              initialImage={initialImage}
              onOpenCreation={onOpenCreation}
              onPickDraft={showDraft}
              track={track}
              result={videoResult}
              onResult={setVideoResult}
              onImportMusic={() => inputRef.current?.click()}
              onBusyChange={setExporting}
              onPauseMusic={() => audioRef.current?.pause()}
            />
          </div>

          {view === "library" && window.manorDesktop?.library && (
            <LibraryStudio
              onAudio={handleAudioFromLibrary}
              onBackToManor={() => {
                if (onBackToManor) onBackToManor();
                else {
                  setView("manor");
                  onViewChange?.("manor");
                }
              }}
              onConsultTuAm={(info) => {
                onConsultTuAm?.(info);
              }}
            />
          )}
          {view === "library" && !window.manorDesktop?.library && (
            <section className="library-card">
              <div className="section-title">
                <h2>
                  <BookOpen size={19} />
                  Nhạc phổ của bạn
                </h2>
                <span className="muted">
                  {track ? 1 : 0} bản nhạc · trong phiên này
                </span>
              </div>
              {track ? (
                <div className="library-track">
                  <span className="place-icon">
                    <FileMusic size={31} />
                  </span>
                  <div>
                    <h3>{track.name}</h3>
                    <p>
                      {formatDuration(track.duration)} · Bản gốc trên thiết bị
                    </p>
                  </div>
                  <button
                    className="outline-button"
                    onClick={() => {
                      selectPlace("study");
                      navigate("manor");
                    }}
                  >
                    Đến thư phòng
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <Music2 size={42} strokeWidth={1} />
                  <h3>Tàng Âm Các đang đợi giai điệu đầu tiên</h3>
                  <p>Chọn file MP3 hoặc WAV để tạo một cuốn nhạc phổ.</p>
                  <button
                    className="primary-button"
                    onClick={() => inputRef.current?.click()}
                  >
                    Nhập bản nhạc
                    <Upload size={15} />
                  </button>
                </div>
              )}
              {videoResult && (
                <div className="library-video">
                  <h3>{videoResult.name}</h3>
                  <video
                    src={videoResult.url}
                    controls
                    preload="metadata"
                    aria-label="Video trong tàng thư"
                  />
                  <a
                    className="primary-button download-video"
                    href={videoResult.url}
                    download={videoResult.name}
                    onClick={async event => {
                      if (!videoResult.exportId || !window.manorDesktop) return;
                      event.preventDefault();
                      try { await window.manorDesktop.save(videoResult.exportId, videoResult.name); }
                      catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được bản sao.'); }
                    }}
                  >
                    <Download size={15} />
                    {window.manorDesktop ? 'Lưu bản sao…' : 'Tải video WebM'}
                  </a>
                </div>
              )}
              <button
                className="outline-button"
                onClick={() => navigate("video")}
              >
                <Clapperboard size={15} />
                Mở xưởng dựng video
              </button>
              <div className="library-disclaimer">
                <Sparkles size={16} />
                <span>
                  Xuất video ảnh + nhạc thật trong xưởng dựng. AI sinh ảnh/video
                  chưa được kết nối. Nhớ tải thành phẩm về máy trước khi đóng
                  trang.
                </span>
              </div>

              <div
                className="mnq-embed-section"
                style={{
                  marginTop: '28px',
                  borderTop: '1px solid rgba(191, 206, 207, 0.2)',
                  paddingTop: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: '#f0dfbd',
                        fontSize: '18px',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                      }}
                    >
                      Mộc Ngữ Quán S2 V73 · Tàng Thư &amp; Nhạc Phổ Cổ Phong
                    </h3>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: '#bfcecf',
                        fontSize: '13px',
                      }}
                    >
                      Bản trọn vẹn 31.000 dòng mã nguồn Mộc Ngữ Quán — Tàng Âm Các, Nhạc Phổ, Thi Ca &amp; Giám sát viên
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (onBackToManor) onBackToManor();
                        else {
                          setView("manor");
                          onViewChange?.("manor");
                        }
                      }}
                      className="outline-button"
                      style={{
                        fontSize: '13px',
                        padding: '6px 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, #c59b4a 0%, #9a732a 100%)',
                        color: '#131b17',
                        border: '1px solid #dfbe76',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🏯 Trở về Sơn Trang
                    </button>
                    <a
                      href="./mnq/index.html"
                      target="_blank"
                      rel="noreferrer"
                      className="outline-button"
                      style={{
                        fontSize: '13px',
                        padding: '6px 14px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      Mở tab riêng toàn màn hình ↗
                    </a>
                  </div>
                </div>
                <iframe
                  src="./mnq/index.html"
                  title="Mộc Ngữ Quán S2 V73 - Tàng Thư Các"
                  style={{
                    width: '100%',
                    height: '820px',
                    border: '1px solid rgba(191, 206, 207, 0.25)',
                    borderRadius: '10px',
                    background: '#0d171e',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
                  }}
                />
              </div>
            </section>
          )}

          {(view === "manor" || view === "tasks") && tasks.length > 0 && (
            <section className="task-section" aria-label="Quản lý nhiệm vụ">
              <div className="section-title">
                <h2>
                  <ScrollText size={19} />
                  Những ý tưởng đang ươm{" "}
                  <span className="counter">{tasks.length}</span>
                </h2>
                <div className="task-heading-actions">
                  <span className="muted">
                    {done}/{tasks.length} hoàn thành
                  </span>
                  {view === "manor" && (
                    <button
                      className="text-button"
                      onClick={() => navigate("tasks")}
                    >
                      Tất cả nhiệm vụ
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
              {view === "tasks" && (
                <div className="filter-row" aria-label="Lọc trạng thái">
                  {(["all", "waiting", "working", "done"] as const).map((s) => (
                    <button
                      key={s}
                      aria-pressed={filter === s}
                      className={filter === s ? "filter active" : "filter"}
                      onClick={() => setFilter(s)}
                    >
                      {s === "all" ? "Tất cả" : statuses[s]}
                      <span>
                        {s === "all"
                          ? tasks.length
                          : tasks.filter((t) => t.status === s).length}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="task-grid">
                {visibleTasks.map((task) => {
                  const Icon = statusIcons[task.status];
                  return (
                    <article className="task-card" key={task.id}>
                      <div className="task-card-top">
                        <span className="task-index">
                          {String(tasks.indexOf(task) + 1).padStart(2, "0")}
                          <span> / {places[task.place].name}</span>
                        </span>
                        <span className={`status-badge ${task.status}`}>
                          <Icon size={12} />
                          {statuses[task.status]}
                        </span>
                      </div>
                      <h3>{task.title}</h3>
                      <p title={task.detail}>{task.detail}</p>
                      <div className="task-card-bottom">
                        <button
                          className="assignee"
                          onClick={() => {
                            navigate("manor");
                            setCharacterSelected(true);
                            setSelected("courtyard");
                          }}
                          aria-label={`Xem Minh Nhi, phụ trách ${task.title}`}
                        >
                          <CompanionPortrait compact />
                          Minh Nhi
                        </button>
                        <label className="status-select-label">
                          <span className="sr-only">
                            Trạng thái: {task.title}
                          </span>
                          <select
                            aria-label={`Trạng thái: ${task.title}`}
                            value={task.status}
                            onChange={(e) => {
                              const status = e.target.value as Status;
                              setTasks((all) =>
                                all.map((t) =>
                                  t.id === task.id ? { ...t, status } : t,
                                ),
                              );
                              setNotice(
                                `Đã đổi trạng thái thủ công: ${task.title} — ${statuses[status]}.`,
                              );
                            }}
                          >
                            {Object.entries(statuses).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
              {visibleTasks.length === 0 && (
                <div className="empty-state">
                  <Check size={26} />
                  <p>Chưa có nhiệm vụ ở trạng thái này.</p>
                </div>
              )}
              <div className="simulation-note">
                <Sparkles size={13} />
                <span>
                  Dữ liệu nhiệm vụ mẫu. Thay đổi trạng thái là thao tác thủ
                  công, không tự gọi AI. Dựng video thật tại mục “Dựng video”.
                </span>
              </div>
            </section>
          )}
          {view === 'tasks' && tasks.length === 0 && <section className="empty-state">
            <ScrollText size={30} />
            <h3>Chưa có tác vụ</h3>
            <p>Các nhiệm vụ mẫu đã được gỡ. Tác vụ của workflow mới sẽ xuất hiện khi chạy công việc thật.</p>
          </section>}
          <footer className="page-footer">
            <span>
              <Mountain size={15} />
              AI Manor Studio
            </span>
            <span>
              Gieo thanh âm. Dệt câu chuyện.
              <span className="footer-dot">·</span>v0.2
            </span>
          </footer>
        </main>
      </div>
      {help && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setHelp(false);
            helpTriggerRef.current?.focus();
          }}
        >
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={helpCloseRef}
              className="icon-button modal-close"
              aria-label="Đóng hướng dẫn"
              onClick={() => {
                setHelp(false);
                helpTriggerRef.current?.focus();
              }}
            >
              <X size={20} />
            </button>
            <span className="place-icon">
              <BookOpen size={30} />
            </span>
            <h2 id="help-title">Chào mừng đến Mộc Ngư Trang</h2>
            <p>Phiên bản đầu tiên của không gian sáng tạo âm nhạc.</p>
            <ol>
              <li>
                Chọn một điểm sáng trên ảnh trang viên để khám phá không gian.
              </li>
              <li>
                Nhập file MP3 hoặc WAV. Nhạc phổ xuất hiện tại thư phòng; bạn có
                thể nghe lại bằng trình phát.
              </li>
              <li>Chọn nhân viên nữ Minh Nhi để xem nhiệm vụ mẫu.</li>
              <li>
                Chọn Dựng video, thêm ảnh, chỉnh thời lượng rồi xuất WebM. Tải
                video về máy trước khi đóng trang.
              </li>
              <li>Dùng bảng nhiệm vụ để tự thay đổi trạng thái công việc.</li>
            </ol>
            <div className="library-disclaimer">
              Chưa kết nối AI. Xưởng dựng có thể xuất video ảnh + nhạc thật,
              không tải dữ liệu lên máy chủ. Dữ liệu và trạng thái đặt lại khi
              tải lại trang; nhớ tải video về máy.
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
