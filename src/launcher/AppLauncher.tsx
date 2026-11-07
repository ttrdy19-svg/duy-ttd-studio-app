import { useState } from 'react';
import { Home, X } from 'lucide-react';
import { MINI_APPS, NHOM_APP, type AppAction, type MiniApp } from './apps';
import { docCaiDatNen, luuCaiDatNen, type CaiDatNen } from '../world/NenAnh';
import './launcher.css';

const STATUS = { xanh: 'Chạy ổn · đã kiểm thật', vang: 'Chạy được · chưa kiểm', xam: 'Chưa chạy' } as const;

// Bảng mini app kiểu "phúc lợi" trong game: cột trái danh sách đánh số chia 5 nhóm (cl-021), bên phải giải thích ngắn,
// các bước dùng và nút bấm riêng của app đang chọn.
// nen/onNen: cài đặt nền đang dùng của màn hình chính; không truyền thì bảng tự đọc/ghi localStorage (đổi có hiệu lực khi mở lại app).
export default function AppLauncher({ onAction, onClose, error, initial, nen, onNen }: { onAction: (app: MiniApp, action: AppAction) => void; onClose: () => void; error?: string; initial?: string; nen?: CaiDatNen; onNen?: (v: CaiDatNen) => void }) {
  const [chosen, setChosen] = useState(initial || MINI_APPS[0].id);
  const [nenRieng, setNenRieng] = useState<CaiDatNen>(docCaiDatNen);
  const nenDung = nen ?? nenRieng;
  const doiNen = (v: CaiDatNen) => { if (onNen) onNen(v); else { luuCaiDatNen(v); setNenRieng(v); } };
  const app = MINI_APPS.find(a => a.id === chosen) || MINI_APPS[0];
  return <div className="launcher-backdrop" onClick={onClose}>
    <section className="launcher" role="dialog" aria-label="Mini app" onClick={e => e.stopPropagation()}>
      <button className="launcher-close" aria-label="Đóng" onClick={onClose}><X size={18} /></button>
      <header><small>MỘC NGƯ QUÁN</small><h2>Mini app</h2></header>
      <div className="launcher-body">
        <div className="launcher-list" aria-label="Danh sách mini app">
          {NHOM_APP.map(nhom => {
            const list = MINI_APPS.filter(a => a.nhom === nhom.id);
            if (!list.length) return null;
            return <section key={nhom.id} className={`launcher-nhom nhom-${nhom.id}`} aria-label={nhom.ten}>
              <h4 title={nhom.giai}>{nhom.ten}</h4>
              <ol>{list.map(a => <li key={a.id}>
                <button className={`launcher-row ${a.id === app.id ? 'on' : ''} ${a.status}`} data-app={a.id} aria-pressed={a.id === app.id} onClick={() => setChosen(a.id)}>
                  <span className="launcher-no">{String(a.no).padStart(2, '0')}</span>
                  <span className="launcher-icon" style={{ background: `linear-gradient(135deg, ${a.tint[0]}, ${a.tint[1]})` }}><a.icon size={18} strokeWidth={1.8} /></span>
                  <b>{a.name}</b>
                  <i className={`launcher-dot ${a.status}`} title={STATUS[a.status]} />
                </button>
              </li>)}</ol>
            </section>;
          })}
        </div>
        <article className="launcher-detail" aria-label={app.name}>
          <div className="launcher-head">
            <span className="launcher-icon big" style={{ background: `linear-gradient(135deg, ${app.tint[0]}, ${app.tint[1]})` }}><app.icon size={34} strokeWidth={1.6} /></span>
            <div><small>{String(app.no).padStart(2, '0')} · <Home size={11} /> {app.home} · {NHOM_APP.find(n => n.id === app.nhom)?.ten}</small><h3>{app.name}</h3><span className={`launcher-status ${app.status}`}>{STATUS[app.status]}</span></div>
          </div>
          <p className="launcher-short">{app.short}</p>
          <ol className="launcher-steps">{app.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {app.rieng === 'cai-dat-nen' ? <div className="launcher-nen" aria-label="Cài đặt nền">
            <label><input type="checkbox" checked={nenDung.hieuUng} disabled={nenDung.cu3d} onChange={e => doiNen({ ...nenDung, hieuUng: e.target.checked })} /> Hiệu ứng nền</label>
            <label><input type="checkbox" checked={nenDung.cu3d} onChange={e => doiNen({ ...nenDung, cu3d: e.target.checked })} /> Nền 3D cũ</label>
            {!onNen && <small>Đổi xong có hiệu lực khi mở lại app (hoặc dùng nút bánh răng góc dưới phải để đổi ngay).</small>}
          </div> : <div className="launcher-actions">
            {app.actions.map(action => <button key={action.label} className={action.primary ? 'primary' : ''} onClick={() => onAction(app, action)}>{action.label}</button>)}
            {!app.actions.length && <button disabled>Chưa bấm được</button>}
          </div>}
          {error && <p className="launcher-error" role="alert">{error}</p>}
        </article>
      </div>
    </section>
  </div>;
}
