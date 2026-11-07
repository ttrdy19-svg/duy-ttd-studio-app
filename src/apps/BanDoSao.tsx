import { useCallback, useEffect, useState } from 'react';
import { Network, RefreshCw } from 'lucide-react';
import type { BanDo } from './types';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const gio = (t?: number | null) => t ? new Date(t).toLocaleString('vi-VN') : '—';
const nut = { display: 'inline-flex', gap: 6, alignItems: 'center', border: 0, borderRadius: 6, padding: '7px 12px', background: '#8fb8ff', color: '#0b1830', fontWeight: 600, cursor: 'pointer' } as const;

// Bản đồ sao (cl-017): bản đồ liên kết toàn app (tools/ban-do/xem.html, sinh bởi `npm run ban-do`) mở ngay trong app.
// Mỗi file / kênh IPC / mini app là một ngôi sao, đường nối là require/import, gọi IPC, đọc ghi dữ liệu. "Quét lại" dựng lại bản đồ.
export default function BanDoSao() {
  const bridge = window.manorApps;
  const [data, setData] = useState<BanDo | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const chay = useCallback(async (quet: boolean) => {
    const fn = quet ? bridge?.banDoQuet : bridge?.banDo;
    if (!fn) return;
    setBusy(quet); setError('');
    try { setData(await fn()); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }, [bridge]);
  useEffect(() => { void chay(false); }, [chay]);

  if (!bridge?.banDo) return <section className="ban-do-sao" style={{ padding: 24, color: '#ffb4a8' }}>Bản đồ sao chỉ chạy trong bản Windows (Electron) của app.</section>;
  return <section className="ban-do-sao" aria-label="Bản đồ sao" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 520, background: '#05070d', color: '#dfe7ff' }}>
    <header style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #1c2440' }}>
      <h2 style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0, fontSize: 20, flex: 1 }}><Network size={20} /> Bản đồ sao
        <small style={{ fontSize: 12, fontWeight: 400, color: '#8e9bc4' }}>
          {data?.url ? `${data.nut ?? '?'} nút · ${data.canh ?? '?'} cạnh · quét lúc ${gio(data.capNhat)}${data.git ? ` · commit ${data.git}` : ''}` : data ? 'Chưa có bản đồ — bấm Quét lại' : 'Đang đọc…'}
        </small></h2>
      <button style={nut} onClick={() => void chay(true)} disabled={busy} title="Quét lại toàn bộ mã nguồn, dựng lại bản đồ (npm run ban-do)">
        <RefreshCw size={14} className={busy ? 'spin' : ''} /> {busy ? 'Đang quét…' : 'Quét lại'}</button>
    </header>
    {error && <p role="alert" style={{ margin: '8px 16px', color: '#ffb4a8', fontSize: 13 }}>{error}</p>}
    {data?.url ? <iframe key={data.url} title="Bản đồ liên kết" src={data.url} style={{ flex: 1, width: '100%', border: 0, background: '#05070d' }} />
      : data && <p style={{ margin: 16, color: '#8e9bc4', fontSize: 13 }}>Bản đồ chưa được dựng trên máy này. Bấm “Quét lại” (mất vài giây). Cần mạng lần đầu để nạp thư viện vẽ 3D.</p>}
  </section>;
}
