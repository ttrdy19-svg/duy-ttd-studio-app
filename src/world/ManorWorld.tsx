import { useCallback, useEffect, useRef, useState } from 'react';
import { Home, X } from 'lucide-react';
import App from '../App';
import HoaThat from '../hoathat/HoaThat';
import Gallery from '../gallery/Gallery';
import MvStudio from '../mv/MvStudio';
import MiniApps from '../apps/MiniApps';
import LyricsAlbums from '../apps/LyricsAlbums';
import SoiKenh from '../apps/SoiKenh';
import SoViec from '../apps/SoViec';
import TaoHinh from '../apps/TaoHinh';
import ThungDo from '../apps/ThungDo';
import MasterNhac from '../apps/MasterNhac';
import PhatHanh from '../apps/PhatHanh';
import SucMay from '../apps/SucMay';
import { TaiKhoanHanMuc } from '../apps/TongDai';
import { PhongHopHome } from '../apps/PhongHop';
import KhoMedia from '../apps/KhoMedia';
import KhoClip from '../apps/KhoClip';
import BanDoSao from '../apps/BanDoSao';
import KhoNhac from '../apps/KhoNhac';
import Kho3D from '../kho3d/Kho3D';
import AppLauncher from '../launcher/AppLauncher';
import { MINI_APPS, type AppAction, type MiniApp, type ToolView } from '../launcher/apps';
import Assistant from '../assistant/Assistant';
import Fairy from '../assistant/Fairy';
import type { AudioDelivery,CreationDraft } from '../creation/types';
import { minhNhiPortrait } from '../assets';
import { buildings, staff } from './navigation';
import { createManor } from './scene';
import { createIsland } from './island';
import WorldClock from './WorldClock';
import ViecNgay from './ViecNgay';
import MoWeb from './MoWeb';
import NenAnh, { docCaiDatNen, luuCaiDatNen, type CaiDatNen } from './NenAnh';
import CaiDatNenNut from './CaiDatNen';
import type { ClockWorld, LiveWeather } from './WorldClock';
import type { WorldRole } from '../apps/types';
import './world.css';

export default function ManorWorld() {
  const host = useRef<HTMLDivElement>(null), labels = useRef<HTMLDivElement>(null);
  const world = useRef<(ReturnType<typeof createManor> & Partial<ClockWorld>) | null>(null);
  const clockWorld = useCallback(() => (world.current?.clock ? world.current as ClockWorld : null), []);
  const enterRoom=useRef<(id:string)=>void>(()=>{});
  const [selected, setSelected] = useState('');
  const [room, setRoom] = useState('');
  const [tools, setTools] = useState(false);
  const [view, setView] = useState<ToolView>('creation');
  const [launcher, setLauncher] = useState(false), [launcherError, setLauncherError] = useState(''), [chat, setChat] = useState(false);
  const [meetingRequest, setMeetingRequest] = useState(0);
  const loadFairy = useCallback(() => window.manorAssistant!.fairy('tien'), []);
  const [live, setLive] = useState<LiveWeather | null>(null);
  const [creationDraft, setCreationDraft] = useState<CreationDraft>();
  const [incomingAudio,setIncomingAudio]=useState<AudioDelivery>();
  const [manualImage,setManualImage]=useState<{url:string;name:string}>();
  const [taskMessage,setTaskMessage]=useState('');
  const musicInput=useRef<HTMLInputElement>(null),singleImageInput=useRef<HTMLInputElement>(null);
  const [failure, setFailure] = useState('');
  // Nền màn hình chính: mặc định ảnh cây tinh tú; "Nền 3D cũ" trong Cài đặt nền thì dựng lại đảo/trang viên như trước.
  const [nen, setNenState] = useState<CaiDatNen>(docCaiDatNen);
  const setNen = (v: CaiDatNen) => { luuCaiDatNen(v); setNenState(v); };
  const person = staff.find(item => item.id === selected);
  const building = buildings.find(item => item.id === room);
  useEffect(() => {
    if (!nen.cu3d) return;
    setFailure('');
    const select = (id: string) => { if(buildings.some(b=>b.id===id))enterRoom.current(id);else{setSelected(id);setRoom('');} };
    let gone = false;
    const build = (make: () => ReturnType<typeof createManor>) => { try { world.current = make(); world.current.setSelected(''); } catch (error) { setFailure(error instanceof Error ? error.message : String(error)); } };
    const bridge = window.manorApps;
    // Có mô hình 3D trong thư mục "file mẫu" thì dựng đảo bay; chưa có thì giữ trang viên cũ.
    if (!bridge?.worldModels) build(() => createManor(host.current!, labels.current!, select));
    else void bridge.worldModels().then(found => {
      if (gone) return;
      const any = Object.values(found.roles).some(list => list.length);
      const load = async (role: WorldRole) => Promise.all((found.roles[role] || []).map(async name => { const bytes = await bridge.worldModel(role, name); return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer; }));
      const nhi = window.manorAssistant ? () => window.manorAssistant!.fairy('nhi').then(b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer) : undefined;
      build(() => any ? createIsland(host.current!, labels.current!, select, load, nhi) : createManor(host.current!, labels.current!, select));
    }, () => { if (!gone) build(() => createManor(host.current!, labels.current!, select)); });
    return () => { gone = true; world.current?.dispose(); world.current = null; };
  }, [nen.cu3d]);
  useEffect(() => { world.current?.setSelected(selected); }, [selected]);
  // Thời tiết thật ngoài trời: hỏi 15 phút một lần, đảo đổi nắng/mây/mưa theo.
  useEffect(() => {
    const ask = () => window.manorAssistant?.weather().then(w => { setLive(w); (world.current as Partial<ClockWorld> | null)?.setLiveWeather?.(w.kind); }, () => {});
    void ask(); const timer = setInterval(ask, 15 * 60000); return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (live) (world.current as Partial<ClockWorld> | null)?.setLiveWeather?.(live.kind); });
  useEffect(() => { world.current?.setPaused(tools); }, [tools]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelected(''); setRoom(''); setTools(false); setLauncher(false); }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  useEffect(()=>()=>{if(manualImage)URL.revokeObjectURL(manualImage.url)},[manualImage]);
  function openTools(next: ToolView) { setView(next); setTools(true); setRoom(''); setSelected(''); }
  // App mở từ bảng Mini app: tắt app thì quay về bảng (đúng app vừa mở), không rơi ra trang viên.
  const [backToLauncher, setBackToLauncher] = useState(''), [launcherPick, setLauncherPick] = useState('');
  function closeTools() { setTools(false); if (backToLauncher) { setLauncherPick(backToLauncher); setBackToLauncher(''); setLauncher(true); } }
  // Nút của mini app: mở khung trong quán, mở app riêng cạnh dự án, hoặc mở khung chat Tiên Nhỏ.
  function runAction(action: AppAction | undefined, app?: MiniApp) {
    if (!action) return;
    setLauncherError('');
    if ('open' in action) { openTools(action.open); if (app) setBackToLauncher(app.id); setLauncher(false); }
    else if ('assistant' in action) { setChat(true); setLauncher(false); }
    else window.manorAssistant?.openExternal(action.external).then(() => setLauncher(false), e => setLauncherError(e instanceof Error ? e.message : String(e)));
  }
  const openApp = (app: MiniApp | undefined) => runAction(app?.actions.find(a => a.primary));
  function enterBuilding(id:string){if(id==='hall')openTools('hall');else if(id==='study')openTools('gallery');else if(id==='art')openTools('creation');else if(id==='library')openTools('library');else if(id==='workshop')openTools('video');else{setRoom(id);setSelected('');}}
  enterRoom.current=enterBuilding;
  function deliverMusic(file:File,meta?:AudioDelivery['meta']){setCreationDraft(undefined);setManualImage(undefined);setIncomingAudio({id:crypto.randomUUID(),file,meta});openTools('creation');}
  return <main className={`manor-world ${nen.cu3d ? 'che-do-3d' : 'che-do-anh'}`}>
    {nen.cu3d ? <div className="world-canvas" ref={host} /> : <NenAnh hieuUng={nen.hieuUng} tamDung={tools} />}
    <div className="world-labels" ref={labels} aria-label="Nhân viên và địa điểm">
      {staff.map(item => <button key={item.id} data-anchor={item.id} className={`person-label ${item.id === 'minh-nhi' ? 'nhi-label' : ''} ${selected === item.id ? 'chosen' : ''}`} onClick={() => { setSelected(item.id); setRoom(''); }}><i style={{ background: item.color }} />{item.name}<small>{item.role}</small></button>)}
    </div>
    <header className="world-header"><WorldClock world={clockWorld} live={live} /></header>
    <ViecNgay onSoViec={() => openTools('so-viec')} />
    <MoWeb />
    <button className="launcher-orb" data-open-launcher aria-label="Mini app" onClick={() => { setLauncherError(''); setLauncher(true); }}><span className="orb"><Home size={28} strokeWidth={2.2} /></span><b>Mini app</b></button>
    {nen.cu3d && <div className="world-hint">Kéo để xoay · Alt + lăn chuột để phóng to / thu nhỏ · Bấm Minh Nhi để giao việc</div>}
    {!tools && <CaiDatNenNut value={nen} onChange={setNen} />}
    {person && <section className="world-dialogue" role="dialog" aria-label={`Trò chuyện với ${person.name}`}>
      <button className="world-close" aria-label="Tạm biệt" onClick={() => setSelected('')}><X size={19} /></button>
      <div className="dialogue-avatar" style={{ backgroundColor: person.color }}>{person.id === 'minh-nhi' ? <img src={minhNhiPortrait} alt="Minh Nhi" /> : <span>{person.name.split(' ').map(word => word[0]).join('')}</span>}</div>
      <div className="dialogue-content"><small>{person.role} · Mộc Ngư Trang</small><h2>{person.name}</h2><p>{person.greeting}</p>
        {person.id==='minh-nhi'&&<label className="nhi-task">Giao việc cho Minh Nhi<textarea value={taskMessage} onChange={e=>setTaskMessage(e.target.value)} placeholder="Chủ đề hoặc yêu cầu cho bản nhạc…"/></label>}
        <div className="dialogue-actions"><button onClick={()=>musicInput.current?.click()}>Giao bản nhạc WAV</button><button onClick={() => openTools('library')}>Chọn từ Tàng Âm Các</button><button onClick={() => openTools('creation')}>Vào Họa thất</button></div>
      </div>
    </section>}
    {building && <section className="room-card" role="dialog" aria-label={building.name}><button className="world-close" aria-label="Đóng địa điểm" onClick={() => setRoom('')}><X size={18} /></button><small>TRONG TRANG VIÊN</small><h2>{building.name}</h2><p>{building.subtitle}</p>
      {building.id==='workshop'?<><p>Cần ít nhất một ảnh để mở Lưu Ảnh Thất.</p><button onClick={()=>singleImageInput.current?.click()}>Nhập duy nhất một ảnh</button><button onClick={()=>openTools('creation')}>Chọn ảnh trong Họa thất</button></>:<button onClick={()=>openTools(building.id==='library'?'library':'creation')}>{building.id==='library'?'Mở Tàng Âm Các':'Vào Họa thất'}</button>}
    </section>}
    {failure && <div className="world-failure" role="alert"><h2>Chưa dựng được trang viên</h2><p>{failure}</p><button onClick={() => window.location.reload()}>Thử mở lại</button></div>}
    <section className="world-tools" hidden={!tools} aria-label="Bàn làm việc">
      <button className="world-tools-close" aria-label="Trở về trang viên" onClick={closeTools}><X size={18} /></button>
      <div className="world-tool-body">
        <div hidden={view !== 'creation'} className="world-hoathat"><HoaThat active={tools && view === 'creation'} incomingAudio={incomingAudio} onToWorkshop={draft => { setManualImage(undefined); setCreationDraft(draft); setView('video'); setTools(true); }} /></div>
        {view === 'hall' && <div className="world-hoathat"><TaiKhoanHanMuc initialTab="so" /></div>}
        {view === 'gallery' && <div className="world-hoathat"><Gallery /></div>}
        {view === 'mv' && <div className="world-hoathat"><MvStudio onBack={closeTools} /></div>}
        {(view === 'phude' || view === 'thumb') && <div className="world-hoathat"><MiniApps key={view} initialTab={view === 'thumb' ? 'images' : 'subtitles'} /></div>}
        {view === 'loi-album' && <div className="world-hoathat"><LyricsAlbums /></div>}
        {view === 'soi-kenh' && <div className="world-hoathat"><SoiKenh /></div>}
        {view === 'kho-nhac' && <div className="world-hoathat"><KhoNhac onOld={() => openTools('library')} /></div>}
        {view === 'kho3d' && <div className="world-hoathat"><Kho3D /></div>}
        {view === 'kho-media' && <div className="world-hoathat"><KhoMedia /></div>}
        {view === 'kho-clip' && <div className="world-hoathat"><KhoClip /></div>}
        {view === 'han-muc' && <div className="world-hoathat"><TaiKhoanHanMuc initialTab="han-muc" /></div>}
        {view === 'tao-hinh' && <div className="world-hoathat"><TaoHinh /></div>}
        {view === 'master-nhac' && <div className="world-hoathat"><MasterNhac /></div>}
        {view === 'suc-may' && <div className="world-hoathat"><SucMay /></div>}
        {view === 'tong-dai' && <div className="world-hoathat"><TaiKhoanHanMuc initialTab="tong-dai" /></div>}
        {view === 'phat-hanh' && <div className="world-hoathat"><PhatHanh /></div>}
        {view === 'thung-do' && <div className="world-hoathat"><ThungDo /></div>}
        {view === 'so-viec' && <div className="world-hoathat"><SoViec /></div>}
        {view === 'ban-do' && <div className="world-hoathat"><BanDoSao /></div>}
          <div hidden={view === 'creation' || view === 'hall' || view === 'gallery' || view === 'mv' || view === 'phude' || view === 'thumb' || view === 'loi-album' || view === 'kho3d' || view === 'soi-kenh' || view === 'kho-nhac' || view === 'kho-media' || view === 'so-viec' || view === 'han-muc' || view === 'ban-do' || view === 'kho-clip' || view === 'tao-hinh' || view === 'thung-do' || view === 'master-nhac' || view === 'phat-hanh' || view === 'suc-may' || view === 'tong-dai'}>
          <App
            externalView={view === 'library' ? 'library' : 'video'}
            creationDraft={creationDraft}
              initialImage={manualImage}
              onAudioForCreation={deliverMusic}
              onOpenCreation={()=>openTools('creation')}
            onViewChange={next => { if(next === 'video') setView('video'); }}
            onBackToManor={closeTools}
          />
        </div>
      </div>
    </section>
    {launcher && <AppLauncher initial={launcherPick || undefined} onAction={(picked, action) => { setLauncherPick(picked.id); runAction(action, picked); }} onClose={() => setLauncher(false)} error={launcherError} />}
    {chat && <Assistant onClose={() => setChat(false)} onOpenApp={id => { if (id === 'phong-hop') { setMeetingRequest(n => n + 1); setChat(false); } else openApp(MINI_APPS.find(app => app.id === id)); }} />}
    <PhongHopHome openRequest={meetingRequest} />
    {window.manorAssistant && !tools && <Fairy onClick={() => setChat(open => !open)} perch={chat} loadModel={loadFairy} />}
    <input ref={musicInput} type="file" accept=".wav,audio/wav" hidden aria-label="Giao nhạc cho Minh Nhi" onChange={e=>{const file=e.target.files?.[0];if(file)deliverMusic(file,{theme:taskMessage});e.target.value='';}}/>
    <input ref={singleImageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Ảnh mở Lưu Ảnh Thất" onChange={e=>{const file=e.target.files?.[0];if(file&&file.size<=20*1024*1024){setManualImage({url:URL.createObjectURL(file),name:file.name});setView('video');setTools(true);setRoom('');}e.target.value='';}}/>
  </main>;
}
