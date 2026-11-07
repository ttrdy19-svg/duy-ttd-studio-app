import { finalizeWebm } from "./finalizeWebm";
import { drawFrame, timelineError } from "./timeline";
import type { Framing, Scene, Transition } from "./timeline";
import type {CaptionStyle,WaveSettings} from './visuals';

const codecs = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];
export function supportedVideoType(): string | null {
  if (window.manorDesktop) return 'video/mp4';
  if (
    typeof MediaRecorder === "undefined" ||
    typeof AudioContext === "undefined" ||
    typeof createImageBitmap !== "function" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  )
    return null;
  return codecs.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}
interface Options {
  audioUrl: string;
  scenes: Scene[];
  duration: number;
  transition: Transition;
  framing: Framing;
  portrait: boolean;
  resolution?: '720' | '1080' | '2160';
  originalAudio?: boolean;
  loopVideo?: File;
  cutFrames?: number | null;
  subtitleCues?: { start: number; end: number; text: string }[];
  subtitleStyle?:CaptionStyle;
  waveform?:WaveSettings;
  signal: AbortSignal;
  onProgress: (seconds: number) => void;
}

// Real-time local encoder: decoded audio is routed to the recording, not the speakers.
export async function renderVideo(
  options: Options,
): Promise<{ blob?: Blob; url?: string; size?: number; savedPath?: string; exportId?: string; duration: number; extension?: string; encoder?: string; renderSeconds?: number; cutFrames?: number }> {
  if (window.manorDesktop) {
    const desktop = window.manorDesktop;
    const id = crypto.randomUUID();
    const abort = () => { void desktop.cancel(id); };
    const unsubscribe = desktop.onProgress((progress) => {
      if (progress.id === id) options.onProgress(progress.seconds);
    });
    try {
      const audioResponse = await fetch(options.audioUrl, { signal: options.signal });
      if (!audioResponse.ok) throw new Error('Không đọc được nhạc.');
      const audio = new Uint8Array(await audioResponse.arrayBuffer());
      const scenes = await Promise.all(options.scenes.map(async scene => ({
        data: new Uint8Array(await scene.file.arrayBuffer()), seconds: scene.seconds,
      })));
      const loopVideo = options.loopVideo ? new Uint8Array(await options.loopVideo.arrayBuffer()) : undefined;
      if (options.signal.aborted) throw new DOMException('Đã hủy xuất.', 'AbortError');
      options.signal.addEventListener('abort', abort, { once: true });
      const output = await desktop.render({
        id, audio, scenes, duration: options.duration, transition: options.transition,
        framing: options.framing, portrait: options.portrait,
        resolution: options.resolution ?? '2160', originalAudio: options.originalAudio ?? false,
        loopVideo,
        cutFrames: options.cutFrames,
        subtitleCues: options.subtitleCues,
        subtitleStyle:options.subtitleStyle,waveform:options.waveform,
      });
      if (options.signal.aborted) throw new DOMException('Đã hủy xuất.', 'AbortError');
      return {
        url: output.url, size: output.size, savedPath: output.path, exportId: output.exportId,
        duration: output.duration, extension: output.extension,
        encoder: output.encoder, renderSeconds: output.renderSeconds,
        cutFrames: output.cutFrames,
      };
    } finally {
      options.signal.removeEventListener('abort', abort);
      unsubscribe();
    }
  }
  const mimeType = supportedVideoType();
  if (!mimeType)
    throw new Error(
      "Trình duyệt chưa hỗ trợ xuất WebM. Hãy dùng Chrome, Edge hoặc Cốc Cốc phiên bản mới.",
    );
  const invalid = timelineError(
    options.scenes.map((s) => s.seconds),
    options.duration,
  );
  if (invalid) throw new Error(invalid);
  const checkAbort = () => {
    if (options.signal.aborted)
      throw new DOMException("Đã hủy xuất video.", "AbortError");
  };
  checkAbort();
  const audioContext = new AudioContext();
  const images: ImageBitmap[] = [];
  let stream: MediaStream | undefined;
  let source: AudioBufferSourceNode | undefined;
  let animation = 0;
  let recorder: MediaRecorder | undefined;
  try {
    // Resume during the initiating user gesture, before asynchronous decoding.
    await audioContext.resume();
    const response = await fetch(options.audioUrl, { signal: options.signal });
    if (!response.ok)
      throw new Error("Không đọc được bản nhạc. Vui lòng nhập lại file.");
    const buffer = await audioContext.decodeAudioData(
      await response.arrayBuffer(),
    );
    checkAbort();
    const decodedError = timelineError([buffer.duration], buffer.duration);
    if (decodedError) throw new Error(decodedError);
    for (const scene of options.scenes) {
      checkAbort();
      try {
        images.push(await createImageBitmap(scene.file));
      } catch {
        throw new Error(
          `Không đọc được ảnh “${scene.name}”. Hãy thay bằng ảnh JPG, PNG hoặc WebP hợp lệ.`,
        );
      }
    }
    checkAbort();
    const canvas = document.createElement("canvas");
    canvas.width = options.portrait ? 720 : 1280;
    canvas.height = options.portrait ? 1280 : 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Không tạo được khung hình video.");
    // Decoder and media metadata may differ slightly; scale scene timing to actual audio.
    const total = options.scenes.reduce((sum, scene) => sum + scene.seconds, 0);
    const seconds = options.scenes.map(
      (scene) => (scene.seconds / total) * buffer.duration,
    );
    drawFrame(ctx, images, seconds, 0, options.transition, options.framing);
    stream = canvas.captureStream(24);
    const destination = audioContext.createMediaStreamDestination();
    destination.stream
      .getAudioTracks()
      .forEach((track) => stream!.addTrack(track));
    source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 3_000_000,
      audioBitsPerSecond: 128_000,
    });
    const chunks: Blob[] = [];
    const startAt = audioContext.currentTime + 0.1;
    const recordedAt = performance.now();
    const blob = await new Promise<Blob>((resolve, reject) => {
      const abort = () => {
        if (recorder?.state === "recording") recorder.stop();
        reject(new DOMException("Đã hủy xuất video.", "AbortError"));
      };
      options.signal.addEventListener("abort", abort, { once: true });
      recorder!.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder!.onerror = () =>
        reject(
          new Error(
            "Bộ mã hóa video gặp lỗi. Hãy thử ít ảnh hơn hoặc bản nhạc ngắn hơn.",
          ),
        );
      recorder!.onstop = () => {
        options.signal.removeEventListener("abort", abort);
        resolve(new Blob(chunks, { type: mimeType }));
      };
      source!.onended = () => {
        drawFrame(
          ctx,
          images,
          seconds,
          buffer.duration,
          options.transition,
          options.framing,
        );
        options.onProgress(buffer.duration);
        if (recorder?.state === "recording") recorder.stop();
      };
      const frame = () => {
        if (options.signal.aborted) return;
        const elapsed = Math.min(
          buffer.duration,
          Math.max(0, audioContext.currentTime - startAt),
        );
        drawFrame(
          ctx,
          images,
          seconds,
          elapsed,
          options.transition,
          options.framing,
        );
        options.onProgress(elapsed);
        animation = requestAnimationFrame(frame);
      };
      try {
        recorder!.start(1000);
        source!.start(startAt);
        animation = requestAnimationFrame(frame);
      } catch (error) {
        options.signal.removeEventListener("abort", abort);
        reject(error);
      }
    });
    checkAbort();
    if (!blob.size) throw new Error("Video xuất ra trống. Vui lòng thử lại.");
    const recordedDuration = performance.now() - recordedAt;
    const fixedBlob = await finalizeWebm(blob, recordedDuration);
    checkAbort();
    return { blob: fixedBlob, duration: recordedDuration / 1000 };
  } catch (error) {
    if (options.signal.aborted)
      throw new DOMException("Đã hủy xuất video.", "AbortError");
    if (error instanceof DOMException && error.name === "EncodingError")
      throw new Error("Không giải mã được nhạc. Hãy chọn file MP3/WAV khác.");
    throw error;
  } finally {
    cancelAnimationFrame(animation);
    if (recorder?.state === "recording") recorder.stop();
    if (source) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
      source.disconnect();
    }
    stream?.getTracks().forEach((track) => track.stop());
    images.forEach((image) => image.close());
    if (audioContext.state !== "closed") await audioContext.close();
  }
}
