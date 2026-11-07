import type { AppsBridge, Project } from '../apps/types';
import { songName } from '../apps/format';
import type { CreationDraft } from '../creation/types';

// Gói trọn một bài để đưa sang Lưu Ảnh Thất: ảnh đã chọn, bản nhạc của bài và phụ đề đã lưu (không bắt chọn lại nhạc).
export async function buildDraft(bridge: AppsBridge, project: Project, imageId: string): Promise<CreationDraft> {
  const [image, audio, subtitles] = await Promise.all([bridge.imageBytes(project.id, imageId), bridge.audioBytes(project.id), bridge.subtitles(project.id).catch(() => null)]);
  const extension = /\.mp3$/i.test(project.audio.path) ? 'mp3' : 'wav';
  return {
    id: project.id,
    image: { url: URL.createObjectURL(new Blob([image as BlobPart], { type: 'image/png' })), name: `${songName(project.title, project.genre) || project.title}.png` },
    audio: { name: project.audio.name, size: project.audio.size, duration: project.audio.duration, extension, url: URL.createObjectURL(new Blob([audio as BlobPart], { type: extension === 'mp3' ? 'audio/mpeg' : 'audio/wav' })) },
    cues: (subtitles?.cues || []).map(({ start, end, text }) => ({ start, end, text })),
  };
}
