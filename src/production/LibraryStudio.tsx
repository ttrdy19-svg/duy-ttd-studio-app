import { useEffect, useRef, useState } from 'react';

export interface LibraryStudioProps {
  onAudio: (
    file: File,
    meta?: { title?: string; lyrics?: string; genre?: string; singer?: string }
  ) => void;
  onBackToManor?: () => void;
  onConsultTuAm?: (info: {
    title?: string;
    lyrics?: string;
    genre?: string;
    singer?: string;
  }) => void;
}

export default function LibraryStudio({
  onAudio,
  onBackToManor,
  onConsultTuAm,
}: LibraryStudioProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');

  const audioCallback = useRef(onAudio);
  audioCallback.current = onAudio;
  const backToManorCallback = useRef(onBackToManor);
  backToManorCallback.current = onBackToManor;
  const consultTuAmCallback = useRef(onConsultTuAm);
  consultTuAmCallback.current = onConsultTuAm;

  useEffect(() => {
    let alive = true;
    void window.manorDesktop?.library
      .document()
      .then((value) => {
        if (alive) setDocument(value);
      })
      .catch((reason) => {
        if (alive) setError(String(reason.message));
      });

    const listener = async (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== 'manor-library-request'
      )
        return;
      const { id, operation, args } = event.data;
      try {
        let result;
        if (operation === 'audio-handoff') {
          if (typeof args?.data !== 'string' || args.data.length > 140 * 1024 * 1024)
            throw new Error('Bản nhạc quá lớn.');
          const bytes = Uint8Array.from(atob(args.data), (c) => c.charCodeAt(0));
          const extension = /wav/i.test(args.mime || '') ? '.wav' : '.mp3';
          const file = new File(
            [bytes],
            /\.(mp3|wav)$/i.test(args.name || '')
              ? args.name
              : `Nhạc từ Tàng thư${extension}`,
            { type: args.mime || 'audio/mpeg' }
          );
          audioCallback.current(file, {
            title: args.title,
            lyrics: args.lyrics,
            genre: args.genre,
            singer: args.singer,
          });
          result = true;
        } else if (operation === 'tu-am-consult') {
          consultTuAmCallback.current?.({
            title: args?.title,
            lyrics: args?.lyrics,
            genre: args?.genre,
            singer: args?.singer,
          });
          result = true;
        } else if (operation === 'back-to-manor') {
          backToManorCallback.current?.();
          result = true;
        } else {
          result = await window.manorDesktop?.library.request(operation, args);
        }
        frame.current?.contentWindow?.postMessage(
          { type: 'manor-library-response', id, result },
          '*'
        );
      } catch (reason) {
        frame.current?.contentWindow?.postMessage(
          {
            type: 'manor-library-response',
            id,
            error: reason instanceof Error ? reason.message : String(reason),
          },
          '*'
        );
      }
    };

    window.addEventListener('message', listener);
    return () => {
      alive = false;
      window.removeEventListener('message', listener);
    };
  }, []);

  return (
    <section
      aria-label="Mộc Ngữ Quán · Tàng Âm Các"
      style={{
        height: 'calc(100vh - 110px)',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(197, 155, 74, 0.25)',
        background: '#0d171e',
      }}
    >
      <div
        className="library-top-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background:
            'linear-gradient(135deg, rgba(20, 25, 22, 0.96) 0%, rgba(13, 23, 30, 0.96) 100%)',
          borderBottom: '1px solid rgba(197, 155, 74, 0.35)',
          gap: '12px',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => backToManorCallback.current?.()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #c59b4a 0%, #9a732a 100%)',
              color: '#131b17',
              border: '1px solid #dfbe76',
              borderRadius: '7px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
            title="Quay lại không gian 3D Sơn Trang"
          >
            🏯 Trở về Sơn Trang
          </button>
          <div>
            <h3
              style={{
                margin: 0,
                color: '#f0dfbd',
                fontSize: '15px',
                fontWeight: 700,
              }}
            >
              Mộc Ngữ Quán S2 V73 · Tàng Âm Các &amp; Nhạc Phổ Cổ Phong
            </h3>
            <span style={{ fontSize: '11px', color: '#bfcecf', opacity: 0.85 }}>
              Kho nhạc, thi ca &amp; nhạc phổ
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11.5px',
              color: '#e6c65f',
              background: 'rgba(197, 155, 74, 0.12)',
              border: '1px solid rgba(197, 155, 74, 0.25)',
              padding: '4px 10px',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            💡 Giữ <b>Ctrl + lăn chuột</b> để thu phóng ô bài hát (Ctrl+0 về 100%)
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {error && <p role="alert" style={{ color: '#ff9a9e', padding: '16px' }}>{error}</p>}
        {!document && !error && (
          <p style={{ color: '#bfcecf', padding: '16px' }}>Đang mở Mộc Ngữ Quán…</p>
        )}
        {document && (
          <iframe
            ref={frame}
            title="Mộc Ngữ Quán S2 V73"
            sandbox="allow-scripts allow-forms allow-downloads allow-modals allow-same-origin"
            srcDoc={document}
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        )}
      </div>
    </section>
  );
}
