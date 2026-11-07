import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Download,
  ImagePlus,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { manorBackground, minhNhiPortrait } from "../assets";
import { formatDuration } from "../model";
import {
  drawFrame,
  distributeTime,
  MAX_IMAGE_SIZE,
  MAX_SCENES,
  timelineError,
} from "./timeline";
import type { Framing, Scene, Transition, VideoResult } from "./timeline";
import { renderVideo, supportedVideoType } from "./renderVideo";
import { parseSrt, toSrt, validateSubtitleCues } from "./subtitles";
import type { SubtitleCue } from "./subtitles";
import type { CreationDraft } from '../creation/types';
import "./video.css";

interface Props {
  creationDraft?: CreationDraft;
  track: {
    name: string;
    url: string;
    duration: number | null;
    size: number;
  } | null;
  result: VideoResult | null;
  onResult: (result: VideoResult) => void;
  onImportMusic: () => void;
  onBusyChange: (busy: boolean) => void;
  onPauseMusic: () => void;
}

export default function VideoStudio({
  creationDraft,
  track,
  result,
  onResult,
  onImportMusic,
  onBusyChange,
  onPauseMusic,
}: Props) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [transition, setTransition] = useState<Transition>("fade");
  const [framing, setFraming] = useState<Framing>("cover");
  const [portrait, setPortrait] = useState(false);
  const desktop = !!window.manorDesktop;
  const [resolution, setResolution] = useState<'720' | '1080' | '2160'>('2160');
  const [originalAudio, setOriginalAudio] = useState(false);
  const [loopClip, setLoopClip] = useState<{file: File; url: string} | null>(null);
  const [cutTimecode, setCutTimecode] = useState('');
  const clipInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [addingImages, setAddingImages] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [subtitleBusy, setSubtitleBusy] = useState(false);
  const [subtitleError, setSubtitleError] = useState("");
  const [subtitleMessage, setSubtitleMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewAudio = useRef<HTMLAudioElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const subtitleRequestId = useRef<string | null>(null);
  const subtitleCancelled = useRef(false);
  const ownedUrls = useRef(new Set<string>());
  const alive = useRef(true);
  const trackUrl = track?.url;
  const duration = track?.duration ?? null;
  const sceneKey = scenes.map((s) => s.id).join("|");
  const timecode = /^(\d{2}):([0-5]\d):([0-5]\d):([0-2]\d)$/.exec(cutTimecode);
  const cutFrames = timecode ? ((Number(timecode[1]) * 60 + Number(timecode[2])) * 60 + Number(timecode[3])) * 30 + Number(timecode[4]) : null;
  const invalid = loopClip && cutTimecode && (!timecode || !cutFrames)
    ? 'Mốc cắt dùng dạng HH:MM:SS:FF ở 30 fps; để trống để tự dò điểm nối.' : timelineError(
    loopClip ? duration ? [duration] : [] : scenes.map((s) => s.seconds),
    duration,
  );
  const supported = supportedVideoType();
  const total = scenes.reduce((sum, s) => sum + s.seconds, 0);
  const sortedSubtitleCues = [...subtitleCues].sort((a, b) => a.start - b.start);
  const subtitleValidation = validateSubtitleCues(sortedSubtitleCues, duration);
  const activeSubtitle = sortedSubtitleCues.find(
    (cue) => previewTime >= cue.start && previewTime < cue.end,
  );

  useEffect(() => {
    alive.current = true;
    const urls = ownedUrls.current;
    return () => {
      alive.current = false;
      controller.current?.abort();
      if (subtitleRequestId.current) void window.manorDesktop?.cancelTranscription(subtitleRequestId.current);
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (!window.manorDesktop) return;
    window.manorDesktop.getSubtitleStatus()
      .then((status) => {
        if (alive.current) setGeminiConfigured(status.configured);
      })
      .catch((reason) => {
        if (alive.current) setSubtitleError(reason instanceof Error ? reason.message : "Không đọc được cấu hình Gemini.");
      });
  }, []);

  useEffect(() => {
    if (subtitleRequestId.current) {
      subtitleCancelled.current = true;
      void window.manorDesktop?.cancelTranscription(subtitleRequestId.current);
      subtitleRequestId.current = null;
      setSubtitleBusy(false);
    }
    controller.current?.abort();
    setPreviewTime(0);
    setPreviewPlaying(false);
    setError("");
    setMessage("");
    setSubtitleCues([]);
    setSubtitleError("");
    setSubtitleMessage("");
    setScenes((current) => {
      const times = distributeTime(current.length, duration ?? 0);
      return current.map((scene, index) => ({
        ...scene,
        seconds: times[index] ?? scene.seconds,
      }));
    });
  }, [trackUrl, duration]);

  useEffect(() => {
    if (!creationDraft || trackUrl !== creationDraft.audio.url) return;
    let cancelled = false;
    void fetch(creationDraft.image.url).then(response => {
      if (!response.ok) throw new Error('Không mở được ảnh đã chọn.'); return response.blob();
    }).then(blob => {
      if (cancelled) return;
      const file = new File([blob], creationDraft.image.name, { type: blob.type || 'image/png' });
      const url = URL.createObjectURL(file); ownedUrls.current.add(url);
      setScenes(current => {
        current.forEach(scene => { URL.revokeObjectURL(scene.url); ownedUrls.current.delete(scene.url); });
        return [{ id: crypto.randomUUID(), file, name: file.name, url, seconds: duration ?? creationDraft.audio.duration }];
      });
      setLoopClip(null); setTransition('cut');
      const limit = duration ?? creationDraft.audio.duration;
      setSubtitleCues(creationDraft.cues.filter(cue => cue.start < limit).map(cue => ({ ...cue, end: Math.min(cue.end, limit), id: crypto.randomUUID() })));
      setBurnSubtitles(creationDraft.cues.length > 0);
      setMessage('Đã nhận ảnh, nhạc và phụ đề từ Họa thất. Có thể xuất ngay hoặc nhập clip Flow để làm nền loop.');
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không nhận được tác phẩm.'); });
    return () => { cancelled = true; };
  }, [creationDraft, trackUrl, duration]);

  async function saveGeminiKey() {
    if (!window.manorDesktop) return;
    setSubtitleError("");
    setSubtitleMessage("");
    try {
      const status = await window.manorDesktop.saveGeminiApiKey(geminiKey);
      setGeminiConfigured(status.configured);
      setGeminiKey("");
      setSubtitleMessage("Gemini API key đã được lưu mã hóa trên thiết bị.");
    } catch (reason) {
      setSubtitleError(reason instanceof Error ? reason.message : "Không lưu được Gemini API key.");
    }
  }

  async function removeGeminiKey() {
    if (!window.manorDesktop) return;
    setSubtitleError("");
    try {
      await window.manorDesktop.removeGeminiApiKey();
      setGeminiConfigured(false);
      setSubtitleMessage("Đã xóa Gemini API key khỏi thiết bị.");
    } catch (reason) {
      setSubtitleError(reason instanceof Error ? reason.message : "Không xóa được Gemini API key.");
    }
  }

  async function transcribeSubtitles() {
    const desktopApi = window.manorDesktop;
    if (!desktopApi || !track || !duration || subtitleBusy || !geminiConfigured) return;
    const accepted = window.confirm(
      "File nhạc sẽ được tải lên Google Gemini API để nhận diện lời. Google xử lý file theo chính sách tài khoản/API của mày. Tiếp tục?",
    );
    if (!accepted) return;
    const id = crypto.randomUUID();
    subtitleRequestId.current = id;
    subtitleCancelled.current = false;
    setSubtitleBusy(true);
    setSubtitleError("");
    setSubtitleMessage("");
    try {
      const response = await fetch(track.url);
      if (!response.ok) throw new Error("Không đọc được file nhạc để gửi nhận diện.");
      const audio = new Uint8Array(await response.arrayBuffer());
      const output = await desktopApi.transcribeSubtitles({
        id,
        audio,
        mimeType: /\.mp3$/i.test(track.name) ? "audio/mpeg" : "audio/wav",
        duration,
      });
      if (!alive.current || subtitleRequestId.current !== id) return;
      setSubtitleCues(output.cues.map((cue) => ({ ...cue, id: crypto.randomUUID() })));
      setSubtitleMessage(
        `Gemini đã nhận diện ${output.cues.length} câu bằng ${output.model}. Hãy nghe soát lời và mốc thời gian; độ chính xác 90% không được đảm bảo.${output.cleanupWarning ? ` ${output.cleanupWarning}` : ""}`,
      );
    } catch (reason) {
      if (alive.current) {
        if (subtitleCancelled.current) setSubtitleMessage("Đã hủy nhận diện phụ đề.");
        else setSubtitleError(
          reason instanceof Error ? reason.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "") : "Nhận diện phụ đề thất bại.",
        );
      }
    } finally {
      if (subtitleRequestId.current === id) subtitleRequestId.current = null;
      if (alive.current) setSubtitleBusy(false);
    }
  }

  function addSubtitleCue() {
    if (!duration) return;
    const start = Math.min(previewTime, Math.max(0, duration - 0.1));
    setSubtitleCues((current) => [
      ...current,
      { id: crypto.randomUUID(), start, end: Math.min(duration, start + 2), text: "" },
    ]);
  }

  async function importSrt(file: File) {
    setSubtitleError("");
    setSubtitleMessage("");
    if (!/\.srt$/i.test(file.name)) {
      setSubtitleError("Hãy chọn file có đuôi .srt.");
      return;
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      setSubtitleError("File SRT cần khác rỗng và tối đa 5 MB.");
      return;
    }

    try {
      const source = typeof file.text === 'function' ? await file.text() : await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Không đọc được nội dung file SRT."));
        };
        reader.onerror = () =>
          reject(reader.error ?? new Error("Không đọc được file SRT."));
        reader.readAsText(file);
      });
      const cues = parseSrt(source);
      setSubtitleCues(
        cues.map((cue) => ({ ...cue, id: crypto.randomUUID() })),
      );
      setSubtitleMessage(`Đã nhập ${cues.length} câu từ ${file.name}.`);
    } catch (reason) {
      setSubtitleError(
        reason instanceof Error ? reason.message : "Không đọc được file SRT.",
      );
    }
  }

  function downloadSrt() {
    if (subtitleValidation) return;
    const blob = new Blob([toSrt(sortedSubtitleCues, duration)], {
      type: "application/x-subrip;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const baseName = (track?.name ?? "subtitles")
      .replace(/\.[^.]+$/, "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
    anchor.href = url;
    anchor.download = `${baseName || "subtitles"}.srt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    let cancelled = false;
    setImages([]);
    Promise.all(
      scenes.map(
        (scene) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () =>
              reject(
                new Error(
                  `Không đọc được ảnh “${scene.name}”. Hãy gỡ ảnh này và chọn file khác.`,
                ),
              );
            image.src = scene.url;
          }),
      ),
    )
      .then((loaded) => {
        if (!cancelled) setImages(loaded);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
    // Duration edits do not require decoding the same local images again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey]);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context)
      drawFrame(
        context,
        images,
        scenes.map((s) => s.seconds),
        previewTime,
        transition,
        framing,
      );
  }, [images, scenes, previewTime, transition, framing, portrait]);

  useEffect(() => {
    if (!previewPlaying) return;
    let frame = 0;
    const tick = () => {
      setPreviewTime(previewAudio.current?.currentTime ?? 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [previewPlaying]);

  useEffect(() => {
    if (!busy || desktop) return;
    const visibility = () => {
      if (document.hidden) {
        controller.current?.abort();
        setError(
          "Đã dừng xuất vì bạn chuyển sang tab khác. Giữ tab này ở phía trước khi xuất để tránh video bị đứng hình.",
        );
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [busy, desktop]);

  function updateScenes(next: Scene[]) {
    const times = distributeTime(next.length, duration ?? next.length * 5);
    setScenes(next.map((scene, i) => ({ ...scene, seconds: times[i] ?? 5 })));
    setPreviewTime(0);
    if (previewAudio.current) {
      previewAudio.current.pause();
      previewAudio.current.currentTime = 0;
    }
    setError("");
    setMessage("");
  }

  function addFiles(files: File[]) {
    if (busy) return;
    if (scenes.length + files.length > MAX_SCENES) {
      setError(`Tối đa ${MAX_SCENES} ảnh cho một bản video.`);
      return;
    }
    const bad = files.find(
      (file) =>
        !/\.(jpe?g|png|webp)$/i.test(file.name) ||
        !file.size ||
        file.size > MAX_IMAGE_SIZE,
    );
    if (bad) {
      setError(
        `Ảnh “${bad.name}” không hợp lệ. Dùng JPG, PNG hoặc WebP, khác rỗng và tối đa 20 MB/ảnh.`,
      );
      return;
    }
    const additions = files.map((file) => {
      const url = URL.createObjectURL(file);
      ownedUrls.current.add(url);
      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        url,
        seconds: 5,
      };
    });
    updateScenes([...scenes, ...additions]);
  }

  async function useManorImages() {
    if (!manorBackground || !minhNhiPortrait) {
      setError(
        "Chưa có đủ hai ảnh trang viên trong repository. Bạn có thể chọn ảnh từ máy.",
      );
      return;
    }
    setAddingImages(true);
    setError("");
    try {
      const files = await Promise.all(
        [
          [manorBackground, "Mộc Ngư Trang.jpg"],
          [minhNhiPortrait, "Minh Nhi.jpg"],
        ].map(async ([url, name]) => {
          const response = await fetch(url);
          if (!response.ok)
            throw new Error("Không tải được ảnh có sẵn. Hãy chọn ảnh từ máy.");
          return new File([await response.blob()], name, {
            type: "image/jpeg",
          });
        }),
      );
      if (alive.current) addFiles(files);
    } catch (reason) {
      if (alive.current)
        setError(
          reason instanceof Error ? reason.message : "Không đọc được ảnh.",
        );
    } finally {
      if (alive.current) setAddingImages(false);
    }
  }

  function removeScene(id: string) {
    const target = scenes.find((scene) => scene.id === id);
    if (target) {
      URL.revokeObjectURL(target.url);
      ownedUrls.current.delete(target.url);
    }
    updateScenes(scenes.filter((scene) => scene.id !== id));
  }

  async function exportVideo() {
    if (!track || busy || invalid) return;
    if (desktop && burnSubtitles && subtitleCues.length && subtitleValidation) { setError(subtitleValidation); return; }
    if (track.size > 100 * 1024 * 1024) {
      setError(
        "Bản nhạc quá lớn để xuất trong trình duyệt. Chọn file tối đa 100 MB.",
      );
      return;
    }
    previewAudio.current?.pause();
    onPauseMusic();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setMessage("");
    setElapsed(0);
    try {
      const output = await renderVideo({
        audioUrl: track.url,
        scenes,
        duration: duration!,
        transition,
        framing,
        portrait,
        resolution,
        originalAudio,
        loopVideo: loopClip?.file,
        cutFrames,
        subtitleCues: burnSubtitles && !subtitleValidation ? sortedSubtitleCues.map(({ start, end, text }) => ({ start, end, text })) : undefined,
        signal: abort.signal,
        onProgress: (time) => {
          if (alive.current) setElapsed(time);
        },
      });
      if (!alive.current || abort.signal.aborted) return;
      const url = output.url ?? URL.createObjectURL(output.blob!);
      const base = track.name
        .replace(/\.[^.]+$/, "")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
      onResult({
        url,
        name: `${base || "ai-manor"}-${portrait ? "9x16" : "16x9"}.${output.extension ?? 'webm'}`,
        size: output.size ?? output.blob!.size,
        duration: output.duration,
        sourceName: track.name,
        exportId: output.exportId,
        savedPath: output.savedPath,
      });
      setMessage(desktop
        ? `Đã xuất video bằng ${output.encoder}. Thời gian xử lý: ${output.renderSeconds?.toFixed(1)} giây.${output.cutFrames ? ` Loop ${output.cutFrames} frame ở 30 fps (${(output.cutFrames / 30).toFixed(6)} giây).` : ''} Đã lưu: ${output.savedPath}`
        : "Đã xuất video thật có hình ảnh và âm thanh. Bạn có thể xem và tải file WebM bên dưới.");
    } catch (reason) {
      if (alive.current) {
        if (abort.signal.aborted)
          setMessage("Đã hủy xuất. Bản xuất dở không được lưu.");
        else
          setError(
            reason instanceof Error
              ? reason.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
              : "Xuất video thất bại. Vui lòng thử lại.",
          );
      }
    } finally {
      if (controller.current === abort) controller.current = null;
      if (alive.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }

  return (
    <section className="video-studio" aria-label="Xưởng dựng video">
      <div className="studio-intro">
        <span className="eyebrow">XƯỞNG SẢN XUẤT · CÔNG CỤ THẬT</span>
        <h2>Dệt hình cùng thanh âm</h2>
        <p>
          Ghép ảnh và nhạc thành video {desktop ? 'bằng FFmpeg ngay trên máy' : 'WebM ngay trên máy'}. Gemini chỉ hỗ trợ nhận diện phụ đề, chưa sinh ảnh/video.
        </p>
      </div>
      <div className="studio-steps">
        <span className={track ? "ready" : ""}>01 · Bản nhạc</span>
        <span className={scenes.length || loopClip ? "ready" : ""}>02 · Bối cảnh</span>
        <span className={result ? "ready" : ""}>03 · Xuất video</span>
      </div>
      <div className="studio-grid">
        <div className="studio-workbench">
          <div className="studio-music">
            <div>
              <strong>{track?.name ?? "Chưa có bản nhạc"}</strong>
              <span>
                {track
                  ? formatDuration(duration)
                  : "Chọn MP3 hoặc WAV để bắt đầu"}
              </span>
            </div>
            <button
              className="outline-button"
              onClick={onImportMusic}
              disabled={busy || addingImages}
            >
              {track ? "Thay nhạc" : "Chọn nhạc"}
            </button>
          </div>
          <section className="subtitle-panel" aria-label="Phụ đề SRT">
            <div className="studio-toolbar">
              <h3>Phụ đề SRT <span>{subtitleCues.length} câu</span></h3>
              <div className="subtitle-toolbar-actions">
                <input
                  ref={subtitleInput}
                  type="file"
                  accept=".srt,application/x-subrip,text/plain"
                  aria-label="Chọn file SRT"
                  hidden
                  disabled={subtitleBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void importSrt(file);
                  }}
                />
                <button
                  className="text-button"
                  onClick={() => subtitleInput.current?.click()}
                  disabled={subtitleBusy}
                >
                  Nhập SRT
                </button>
                <button className="text-button" onClick={addSubtitleCue} disabled={!duration || subtitleBusy}>
                  <Plus size={14} /> Thêm câu
                </button>
              </div>
            </div>
            <p className="studio-hint">
              Dùng Gemini 3.5 Transcribe để nhận diện lời và timestamp từng từ. Không thể đảm bảo chính xác 90% với mọi bài hát; hãy nghe soát và chỉnh trước khi tải SRT.
            </p>
            {desktop ? (
              <>
                <p className="studio-hint">
                  {geminiConfigured
                    ? "API key đã lưu mã hóa trên máy. Quota/chi phí Gemini tính riêng."
                    : "Tạo Gemini API key tại aistudio.google.com/apikey rồi nhập bên dưới. Key được lưu mã hóa trên máy."}
                </p>
                <div className="gemini-key-row">
                  <label>
                    Gemini API key
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={geminiKey}
                      onChange={(event) => setGeminiKey(event.target.value)}
                      placeholder={geminiConfigured ? "Đã lưu mã hóa · nhập key mới để thay" : "Nhập key từ Google AI Studio"}
                      aria-label="Gemini API key"
                      disabled={subtitleBusy}
                    />
                  </label>
                  <button className="outline-button" onClick={saveGeminiKey} disabled={subtitleBusy || geminiKey.trim().length < 10}>
                    Lưu key
                  </button>
                  {geminiConfigured && (
                    <button className="text-button" onClick={removeGeminiKey} disabled={subtitleBusy}>
                      Xóa key
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="studio-hint">Nhận diện Gemini cần bản Windows; trên web vẫn có thể tự nhập cue và tải SRT.</p>
            )}
            {desktop && (
              <div className="subtitle-actions">
                <button className="outline-button" onClick={transcribeSubtitles} disabled={!track || !duration || duration > 600 || track.size > 100 * 1024 * 1024 || !geminiConfigured || subtitleBusy}>
                  {subtitleBusy ? "Đang nhận diện…" : "Nhận diện lời bằng Gemini"}
                </button>
                {subtitleBusy && (
                  <button className="text-button" onClick={() => {
                    subtitleCancelled.current = true;
                    if (subtitleRequestId.current) void window.manorDesktop?.cancelTranscription(subtitleRequestId.current);
                  }}>
                    <X size={14} /> Hủy
                  </button>
                )}
              </div>
            )}
            {subtitleMessage && <p className="studio-message" role="status">{subtitleMessage}</p>}
            {subtitleError && <p className="studio-error" role="alert">{subtitleError}</p>}
            {sortedSubtitleCues.length > 0 && (
              <>
                <div className="subtitle-cue-list">
                  {sortedSubtitleCues.map((cue, index) => (
                    <article className="subtitle-cue" key={cue.id}>
                      <span className="subtitle-cue-index">{String(index + 1).padStart(2, "0")}</span>
                      <label>
                        Bắt đầu (giây)
                        <input type="number" min="0" step="0.01" value={Number.isFinite(cue.start) ? cue.start : ""} disabled={subtitleBusy}
                          onChange={(event) => setSubtitleCues((current) => current.map((item) => item.id === cue.id ? { ...item, start: event.target.valueAsNumber } : item))} />
                      </label>
                      <label>
                        Kết thúc (giây)
                        <input type="number" min="0" step="0.01" value={Number.isFinite(cue.end) ? cue.end : ""} disabled={subtitleBusy}
                          onChange={(event) => setSubtitleCues((current) => current.map((item) => item.id === cue.id ? { ...item, end: event.target.valueAsNumber } : item))} />
                      </label>
                      <label className="subtitle-cue-text">
                        Nội dung
                        <textarea maxLength={200} rows={2} value={cue.text} disabled={subtitleBusy}
                          onChange={(event) => setSubtitleCues((current) => current.map((item) => item.id === cue.id ? { ...item, text: event.target.value } : item))} />
                      </label>
                      <button className="icon-button" aria-label={`Xóa phụ đề ${index + 1}`} disabled={subtitleBusy}
                        onClick={() => setSubtitleCues((current) => current.filter((item) => item.id !== cue.id))}>
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))}
                </div>
                {subtitleValidation ? (
                  <p className="studio-warning" role="status">{subtitleValidation}</p>
                ) : (
                  <button className="outline-button" onClick={downloadSrt} disabled={subtitleBusy}>
                    <Download size={14} /> Tải file SRT
                  </button>
                )}
              </>
            )}
          </section>
          {desktop && <div className="studio-options">
            <button className="outline-button" disabled={busy} onClick={() => clipInput.current?.click()}>
              {loopClip ? 'Thay clip loop' : 'Nhập clip Flow để lặp theo nhạc'}
            </button>
            <input ref={clipInput} type="file" className="sr-only" accept=".mp4,.webm,.mov,.mkv" aria-label="Chọn clip loop"
              disabled={busy} onChange={event => {
                const file = event.target.files?.[0]; event.target.value = '';
                if (!file) return;
                if (!file.size || file.size > 200 * 1024 * 1024) { setError('Clip cần khác rỗng và tối đa 200 MB.'); return; }
                if (loopClip) { URL.revokeObjectURL(loopClip.url); ownedUrls.current.delete(loopClip.url); }
                const url = URL.createObjectURL(file); ownedUrls.current.add(url);
                setLoopClip({file, url}); setError(''); setMessage('');
              }} />
            {loopClip && <>
              <strong>{loopClip.file.name}</strong>
              <label>Mốc kết thúc loop · HH:MM:SS:FF · 30 fps
                <input value={cutTimecode} disabled={busy} placeholder="Tự dò khi để trống" onChange={event => setCutTimecode(event.target.value)} />
              </label>
              <p className="studio-hint">Tự dò tìm khung gần giống khung đầu trong 1,5 giây cuối clip. Kiểm tra điểm nối của thành phẩm; có thể nhập mốc chính xác để chỉnh lại. Clip tối đa 60 giây. Ví dụ 00:00:07:19 là 229 frame.</p>
              <button className="text-button" disabled={busy} onClick={() => {
                URL.revokeObjectURL(loopClip.url); ownedUrls.current.delete(loopClip.url); setLoopClip(null);
              }}>Dùng ảnh thay cho clip loop</button>
            </>}
          </div>}
          <div hidden={!!loopClip}>
          <div className="studio-toolbar">
            <h3>
              Bối cảnh{" "}
              <span>
                {scenes.length}/{MAX_SCENES}
              </span>
            </h3>
            <button
              className="text-button"
              onClick={() => imageInput.current?.click()}
              disabled={busy || addingImages}
            >
              <ImagePlus size={15} />
              Thêm ảnh
            </button>
          </div>
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            ref={imageInput}
            aria-label="Chọn ảnh bối cảnh"
            disabled={busy || addingImages}
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          {!scenes.length && (
            <div className="scene-empty">
              <ImagePlus size={32} strokeWidth={1} />
              <p>Chọn những khung hình cho bản nhạc.</p>
              <button
                className="outline-button"
                onClick={() => imageInput.current?.click()}
                disabled={busy || addingImages}
              >
                <Plus size={14} />
                Chọn ảnh từ máy
              </button>
            </div>
          )}
          <button
            className="text-button sample-images-button"
            onClick={useManorImages}
            disabled={busy || addingImages}
          >
            {addingImages ? "Đang đọc ảnh…" : "Dùng 2 ảnh trang viên có sẵn"}
          </button>
          <div className="scene-list">
            {scenes.map((scene, index) => (
              <article className="scene-row" key={scene.id}>
                <img src={scene.url} alt={`Bối cảnh ${index + 1}`} />
                <div className="scene-row-name">
                  <strong>
                    {String(index + 1).padStart(2, "0")} · {scene.name}
                  </strong>
                  <label>
                    Thời lượng (giây)
                    <input
                      aria-label={`Thời lượng cảnh ${index + 1}`}
                      type="number"
                      min="0.1"
                      max="600"
                      step="0.1"
                      value={
                        Number.isFinite(scene.seconds)
                          ? Number(scene.seconds.toFixed(2))
                          : ""
                      }
                      disabled={busy || addingImages}
                      onChange={(event) => {
                        const value = event.target.valueAsNumber;
                        setScenes((current) =>
                          current.map((s) =>
                            s.id === scene.id ? { ...s, seconds: value } : s,
                          ),
                        );
                      }}
                    />
                  </label>
                </div>
                <div className="scene-actions">
                  <button
                    className="icon-button"
                    disabled={busy || addingImages || index === 0}
                    aria-label={`Đưa cảnh ${index + 1} lên`}
                    onClick={() => {
                      const next = [...scenes];
                      [next[index - 1], next[index]] = [
                        next[index],
                        next[index - 1],
                      ];
                      setScenes(next);
                    }}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={
                      busy || addingImages || index === scenes.length - 1
                    }
                    aria-label={`Đưa cảnh ${index + 1} xuống`}
                    onClick={() => {
                      const next = [...scenes];
                      [next[index], next[index + 1]] = [
                        next[index + 1],
                        next[index],
                      ];
                      setScenes(next);
                    }}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy || addingImages}
                    aria-label={`Gỡ cảnh ${index + 1}`}
                    onClick={() => removeScene(scene.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!!scenes.length && (
            <div className="timeline-summary">
              <span>
                Tổng cảnh:{" "}
                {formatDuration(Number.isFinite(total) ? total : null)} / nhạc:{" "}
                {formatDuration(duration)}
              </span>
              <button
                className="text-button"
                disabled={busy || !duration}
                onClick={() => updateScenes(scenes)}
              >
                Chia đều theo nhạc
              </button>
            </div>
          )}
          </div>
          <div className="studio-options">
            <label>
              Khung hình
              <select
                value={portrait ? "portrait" : "landscape"}
                disabled={busy || addingImages}
                onChange={(event) =>
                  setPortrait(event.target.value === "portrait")
                }
              >
                <option value="landscape">Ngang 16:9{!desktop && ' · 1280 × 720'}</option>
                <option value="portrait">Dọc 9:16{!desktop && ' · 720 × 1280'}</option>
              </select>
            </label>
            {desktop && <>
              <label>Độ phân giải
                <select value={resolution} disabled={busy || addingImages} onChange={e => setResolution(e.target.value as typeof resolution)}>
                  <option value="2160">4K · 3840 × 2160 (ngang)</option>
                  <option value="1080">Full HD · 1920 × 1080 (ngang)</option>
                  <option value="720">HD · 1280 × 720 (ngang)</option>
                </select>
              </label>
              <label>Âm thanh và định dạng
                <select value={originalAudio ? 'original' : 'aac'} disabled={busy || addingImages} onChange={e => setOriginalAudio(e.target.value === 'original')}>
                  <option value="aac">MP4 · AAC 320 kbps · giữ âm lượng nguồn</option>
                  <option value="original">MKV · sao chép âm thanh gốc, không mã hóa lại</option>
                </select>
              </label>
            </>}
            <label hidden={!!loopClip}>
              Chuyển cảnh
              <select
                value={transition}
                disabled={busy || addingImages}
                onChange={(event) =>
                  setTransition(event.target.value as Transition)
                }
              >
                <option value="fade">Hòa tan nhẹ</option>
                <option value="cut">Cắt trực tiếp</option>
              </select>
            </label>
            <label>
              Cách đặt ảnh
              <select
                value={framing}
                disabled={busy || addingImages}
                onChange={(event) => setFraming(event.target.value as Framing)}
              >
                <option value="cover">Lấp đầy · có crop</option>
                <option value="contain">Giữ toàn bộ ảnh · có viền</option>
              </select>
            </label>
          </div>
        </div>
        <div className="studio-preview">
          <div className="studio-toolbar">
            <h3>
              <Play size={15} />
              Xem trước bố cục
            </h3>
            <span className="muted">{portrait ? "9:16" : "16:9"}</span>
          </div>
          {desktop && subtitleCues.length > 0 && <label className="creation-checkbox"><input type="checkbox" checked={burnSubtitles} onChange={event => setBurnSubtitles(event.target.checked)} disabled={busy} />Ghép phụ đề vào video xuất</label>}
          <div className="subtitle-preview-frame">
            <canvas
              hidden={!!loopClip}
              ref={canvasRef}
              width={portrait ? 720 : 1280}
              height={portrait ? 1280 : 720}
              aria-label="Khung hình xem trước video"
            />
            {loopClip && <video src={loopClip.url} controls loop muted style={{width:'100%', maxHeight:420}} aria-label="Xem clip loop gốc" />}
            {activeSubtitle && <div className="subtitle-preview-caption">{activeSubtitle.text}</div>}
          </div>
          {track && (
            <audio
              ref={previewAudio}
              key={track.url}
              src={track.url}
              controls
              preload="metadata"
              aria-label="Nhạc xem trước video"
              onPlay={() => {
                onPauseMusic();
                setPreviewPlaying(true);
              }}
              onPause={() => setPreviewPlaying(false)}
              onEnded={() => setPreviewPlaying(false)}
              onTimeUpdate={(event) =>
                setPreviewTime(event.currentTarget.currentTime)
              }
              onSeeked={(event) =>
                setPreviewTime(event.currentTarget.currentTime)
              }
            />
          )}
          <p className="studio-hint">
            Dùng trình phát để nghe nhạc và xem ảnh tương ứng theo thời gian.
            Bản xuất có đủ âm thanh.
          </p>
          {!supported && (
            <p className="studio-warning" role="status">
              Trình duyệt này chưa hỗ trợ xuất WebM. Dùng Chrome, Edge hoặc Cốc
              Cốc phiên bản mới.
            </p>
          )}
          {invalid && <p className="studio-warning">{invalid}</p>}
          {error && (
            <p className="studio-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="studio-message" role="status">
              {message}
            </p>
          )}
          {busy ? (
            <div className="render-progress">
              <div>
                <span>Đang mã hóa video thật…</span>
                <strong>
                  {Math.min(100, Math.floor((elapsed / (duration || 1)) * 100))}
                  %
                </strong>
              </div>
              <progress
                aria-label="Tiến độ xuất video"
                max={duration || 1}
                value={elapsed}
              />
              <span>
                {formatDuration(elapsed)} / {formatDuration(duration)}
              </span>
              <button
                className="outline-button"
                onClick={() => controller.current?.abort()}
              >
                <X size={14} />
                Hủy xuất
              </button>
            </div>
          ) : (
            <button
              className="primary-button export-button"
              disabled={
                !!invalid ||
                !supported ||
                addingImages ||
                (!loopClip && images.length !== scenes.length)
              }
              onClick={exportVideo}
            >
              <Clapperboard size={16} />
              {desktop ? `Xuất ${originalAudio ? 'MKV' : 'MP4'} · ${resolution === '2160' ? '4K' : resolution + 'p'}` : 'Xuất video WebM'}
            </button>
          )}
          <p className="studio-hint">
            {desktop
              ? 'Xuất 30 fps bằng FFmpeg, tự chọn bộ mã hóa GPU nếu dùng được và dùng CPU khi cần. Có thể thu nhỏ cửa sổ trong khi xuất. Tốc độ tùy máy, độ phân giải và hiệu ứng. Nguồn ảnh nhỏ sẽ được phóng lên 4K. MKV giữ âm thanh gốc có thể không xem trước được trong app.'
              : 'Xuất theo thời gian thực: nhạc 3 phút cần khoảng 3 phút. Giữ tab này ở phía trước; chuyển tab sẽ hủy bản xuất dở. Giới hạn 10 phút, 20 ảnh; chưa xuất MP4.'}
          </p>
        </div>
      </div>
      {result && (
        <section className="video-result" aria-label="Video đã xuất">
          <div className="section-title">
            <h3>Bản xuất gần nhất</h3>
            <a
              className="primary-button download-video"
              href={result.url}
              download={result.name}
              onClick={async event => {
                if (!result.exportId || !window.manorDesktop) return;
                event.preventDefault();
                try { await window.manorDesktop.save(result.exportId, result.name); }
                catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được bản sao.'); }
              }}
            >
              <Download size={15} />
              {desktop ? 'Lưu bản sao…' : 'Tải video WebM'}
            </a>
          </div>
          <video
            src={result.url}
            controls
            preload="metadata"
            aria-label="Xem video đã xuất"
          />
          <div>
            <strong>{result.name}</strong>
            <span>
              {formatDuration(result.duration)} ·{" "}
              {(result.size / 1024 / 1024).toFixed(2)} MB · Nhạc:{" "}
              {result.sourceName}
            </span>
          </div>
          <p className="studio-hint">
            Video thật được giữ trong phiên này. Hãy tải về máy trước khi đóng
            hoặc tải lại trang.
          </p>
        </section>
      )}
    </section>
  );
}
