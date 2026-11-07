import { useEffect, useState } from 'react';
import { Check, Download, FolderOpen, ImagePlus, KeyRound, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import type { ImageState, Preset, Project, Provider, Ratio } from './types';
import { displayTitle, message } from './format';

const RATIOS: Ratio[] = ['16:9', '9:16', '1:1', '2:3', '4:3'];

// Mini app Họa ảnh: 5 ảnh theo chủ đề + lời → chốt 1 → luồng riêng làm đủ 5 khung thumbnail có tên bài.
export default function ImageApp({ project }: { project: Project }) {
  const bridge = window.manorApps!;
  const [state, setState] = useState<ImageState | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [fonts, setFonts] = useState<string[]>(['Arial']);
  const [adapterId, setAdapterId] = useState('flow');
  const [thumbAdapter, setThumbAdapter] = useState('flow');
  const [presetId, setPresetId] = useState('');
  const [theme, setTheme] = useState(project.theme || '');
  const [title, setTitle] = useState(displayTitle(project.title, project.genre));
  const [font, setFont] = useState('Arial');
  const [thumbMode, setThumbMode] = useState<'ai' | 'font'>('ai');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const refreshProviders = () => bridge.imageProviders().then(setProviders, () => {});
  useEffect(() => { refreshProviders(); bridge.imagePresets().then(setPresets, () => {}); bridge.imageFonts().then(setFonts, () => {}); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bridge]);
  useEffect(() => {
    setState(null); setError(''); setTheme(project.theme || ''); setTitle(displayTitle(project.title, project.genre));
    bridge.images(project.id).then(next => { setState(next); if (next.thumbs) { setTitle(next.thumbs.title); setFont(next.thumbs.font); setThumbMode(next.thumbs.mode || 'font'); } }, e => setError(message(e)));
    return bridge.onImages(change => { if (change.id === project.id) setState(change); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  async function act(work: () => Promise<ImageState | void>) {
    setError('');
    try { const next = await work(); if (next) setState(next); } catch (e) { setError(message(e)); }
  }
  // Chỉ việc đang chạy mới có "stage"; kết quả đã xong mang done/errors hoặc error.
  const running = state?.run?.stage ? state.run : null;
  const chosen = state?.candidates.find(c => c.id === state.chosen);
  const provider = providers.find(p => p.id === adapterId);
  const rounds = [...new Set(state?.candidates.map(c => c.round))];

  return <section className="mini-app image-app" aria-label="Họa ảnh">
    <div className="image-brief">
      <label>Chủ đề / yêu cầu thêm<textarea value={theme} onChange={e => setTheme(e.target.value)} rows={3} placeholder="Ví dụ: hoàng hôn trên bến đò, tông đỏ son, không khí hoài niệm…" /></label>
      <div className="image-options">
        <label>Nguồn tạo ảnh<select value={adapterId} onChange={e => setAdapterId(e.target.value)}>{providers.map(p => <option key={p.id} value={p.id}>{p.name}{p.ok ? '' : ' · chưa sẵn sàng'}</option>)}</select></label>
        <label>Nhân vật tham chiếu<select value={presetId} onChange={e => setPresetId(e.target.value)}><option value="">Không dùng · AI tự chọn theo bài</option>{presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>
      {provider && !provider.ok && <p className="apps-note warn">{provider.detail}</p>}
      <div className="mini-toolbar">
        <button className="primary" disabled={Boolean(running)} onClick={() => act(() => bridge.generateImages(project.id, { adapterId, theme, presetId: presetId || null }))}><Sparkles size={14} /> Tạo 5 ảnh</button>
        <button onClick={() => act(() => bridge.importImages(project.id))} disabled={Boolean(running)}><ImagePlus size={14} /> Nhập ảnh tay</button>
        <button onClick={() => setShowKey(v => !v)} aria-expanded={showKey}><KeyRound size={14} /> Key Gemini trả phí</button>
        <span className="grow" />
        <button onClick={() => act(() => bridge.openFolder(project.id))}><FolderOpen size={14} /> Thư mục bài</button>
      </div>
      {showKey && <div className="image-key">
        <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Key của project Google đã bật thanh toán" aria-label="Key Gemini trả phí" />
        <button onClick={() => act(async () => { await bridge.saveImageKey(key); setKey(''); await refreshProviders(); })} disabled={!key.trim()}>Lưu key</button>
        <button onClick={() => act(async () => { await bridge.removeImageKey(); await refreshProviders(); })}>Xóa key</button>
        <small>Key miễn phí không tạo được ảnh qua API. Khoảng $0,067 mỗi ảnh 1K (Nano Banana 2); mỗi bài 5 ảnh + 5 khung thumbnail (chưa kể lần làm lại) chừng $0,70. Flow với tài khoản Pro thì tạo ảnh không tốn credit.</small>
      </div>}
    </div>

    {running && <div className="image-run" role="status"><span className="spinner" />{running.stage}<button onClick={() => bridge.cancelImages(project.id)}><X size={13} /> Hủy</button></div>}
    {state?.run?.error && <p className="apps-error" role="alert">{state.run.error}</p>}
    {state?.run?.errors && state.run.errors.length > 0 && <p className="apps-note warn">{state.run.errors.join(' · ')}</p>}
    {error && <p className="apps-error" role="alert">{error}</p>}

    {rounds.map(round => <div key={round} className="candidate-round">
      <h4>Lượt {new Date(round).toLocaleString('vi-VN')}</h4>
      <div className="candidate-grid">
        {state!.candidates.filter(c => c.round === round).map(candidate => <figure key={candidate.id} className={candidate.id === state!.chosen ? 'chosen' : ''}>
          <img src={candidate.url} alt="Ảnh ứng viên" loading="lazy" />
          <figcaption>
            <small>{candidate.model}{candidate.account ? ` · ${candidate.account}` : ''}</small>
            <button onClick={() => act(() => bridge.chooseImage(project.id, candidate.id))} disabled={candidate.id === state!.chosen}><Check size={13} /> {candidate.id === state!.chosen ? 'Đã chốt' : 'Chốt ảnh này'}</button>
            <button className="icon" aria-label="Xóa ảnh" onClick={() => act(() => bridge.removeImage(project.id, candidate.id))} disabled={candidate.id === state!.chosen}><Trash2 size={13} /></button>
          </figcaption>
        </figure>)}
      </div>
    </div>)}
    {state && !state.candidates.length && !running && <p className="apps-note">Chưa có ảnh. Bấm “Tạo 5 ảnh”, hoặc nhập ảnh đã có.</p>}

    {chosen && <div className="thumb-panel">
      <h3>Thumbnail từ ảnh đã chốt</h3>
      <p className="apps-note">{thumbMode === 'ai'
        ? 'AI làm khung 16:9 có tên bài → Gemini dò chính tả, sai thì làm lại (tối đa 3 lần) → bản đúng làm gốc cho 9:16 · 1:1 · 2:3 · 4:3 → dò lại cả 5 lần cuối.'
        : 'AI chỉ dựng bố cục (hoặc cắt từ ảnh gốc), tên bài do app in bằng font nên luôn đúng dấu. Dùng khi AI vẽ chữ mãi không đúng.'}</p>
      <div className="image-options">
        <label>Tên in trên ảnh<input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => setTitle(displayTitle(title))} /></label>
        <label>Kiểu chữ<select value={thumbMode} onChange={e => { const mode = e.target.value as 'ai' | 'font'; setThumbMode(mode); if (mode === 'ai' && thumbAdapter === 'crop') setThumbAdapter(adapterId); }} aria-label="Kiểu chữ thumbnail">
          <option value="ai">AI vẽ chữ + dò chính tả (sáng tạo)</option><option value="font">In chữ bằng font (chắc chắn đúng dấu)</option></select></label>
        <label>Nguồn AI<select value={thumbAdapter} onChange={e => setThumbAdapter(e.target.value)}>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}{thumbMode === 'font' && <option value="crop">Chỉ cắt từ ảnh gốc (không tốn lượt AI)</option>}</select></label>
        {thumbMode === 'font' && <label>Font<select value={font} onChange={e => setFont(e.target.value)}>{fonts.map(f => <option key={f}>{f}</option>)}</select></label>}
      </div>
      <div className="mini-toolbar">
        <button className="primary" disabled={Boolean(running) || !title.trim()} onClick={() => act(() => bridge.makeThumbnails(project.id, { adapterId: thumbAdapter, title, font, mode: thumbMode }))}><Sparkles size={14} /> Tạo 5 thumbnail</button>
        {state?.thumbs?.mode === 'font' && <button disabled={Boolean(running)} onClick={() => act(() => bridge.retitleThumbnails(project.id, { title, font }))}>In lại chữ (không gọi AI)</button>}
        {state?.thumbs && <button onClick={() => act(async () => { await bridge.exportThumbnails(project.id); })}><Download size={14} /> Lưu 5 file…</button>}
      </div>
      {state?.thumbs && <div className="thumb-grid">
        {RATIOS.map(ratio => {
          const url = state.thumbs!.urls[ratio], check = state.thumbs!.checks?.[ratio];
          return <figure key={ratio} style={{ aspectRatio: ratio.replace(':', '/') }} className={state.thumbs!.mode === 'ai' && check && !check.ok ? 'misspelled' : ''}>
            {url ? <img src={url} alt={`Thumbnail ${ratio}`} /> : <div className="thumb-missing">Chưa có</div>}
            <figcaption>{ratio}{state.thumbs!.mode === 'ai' && check && <b className={check.ok ? 'ok' : 'bad'}>{check.ok ? ' ✓ đúng chính tả' : ' ✗ sai'}</b>}</figcaption>
            {state.thumbs!.mode === 'ai' && check && !check.ok && <div className="thumb-problem">
              <small>{check.problems.join(' · ')}</small>
              <button disabled={Boolean(running)} onClick={() => act(() => bridge.retryThumbnail(project.id, ratio))}><RotateCcw size={12} /> Tạo lại</button>
            </div>}
          </figure>;
        })}
      </div>}
    </div>}
  </section>;
}
