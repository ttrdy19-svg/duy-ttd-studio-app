import { useEffect, useState } from 'react';
import { Cloud, CloudRain, FastForward, MapPin, Moon, Sun, Thermometer } from 'lucide-react';

export type Weather = 'nang' | 'may' | 'mua';
export type WeatherChoice = Weather | 'tu-dong' | 'that';
export type LiveWeather = { kind: Weather; label: string; temp: number; city: string };
export interface ClockWorld {
  clock(): { hours: number; weather: Weather; choice: WeatherChoice; mode: 'that' | 'nhanh' };
  setWeather(kind: WeatherChoice): void;
  setLiveWeather(kind: Weather): void;
  setTimeMode(mode: 'that' | 'nhanh'): void;
}
const WEATHER: { id: WeatherChoice; label: string; Icon: typeof Sun }[] = [
  { id: 'that', label: 'Theo trời thật', Icon: MapPin }, { id: 'nang', label: 'Nắng', Icon: Sun }, { id: 'may', label: 'Nhiều mây', Icon: Cloud }, { id: 'mua', label: 'Mưa', Icon: CloudRain },
];
const ICON: Record<Weather, typeof Sun> = { nang: Sun, may: Cloud, mua: CloudRain };
const period = (h: number) => h < 5 ? 'Đêm' : h < 7 ? 'Bình minh' : h < 11 ? 'Sáng' : h < 14 ? 'Trưa' : h < 17.5 ? 'Chiều' : h < 19 ? 'Hoàng hôn' : 'Đêm';

// Bảng tên quán góc trái: "Mộc Ngư Quán", dưới là giờ và thời tiết thật ngoài trời (cập nhật 15 phút một lần).
// Bấm vào để ép thời tiết trên đảo hoặc tua nhanh ngày đêm.
export default function WorldClock({ world, live }: { world: () => ClockWorld | null; live?: LiveWeather | null }) {
  const [state, setState] = useState<ReturnType<ClockWorld['clock']> | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { const timer = setInterval(() => setState(world()?.clock() ?? null), 500); return () => clearInterval(timer); }, [world]);
  const hours = state?.hours ?? new Date().getHours() + new Date().getMinutes() / 60;
  const h = Math.floor(hours), m = Math.floor((hours - h) * 60), night = hours < 5.8 || hours > 18.6;
  const forced = state && state.choice !== 'that' ? WEATHER.find(w => w.id === state.choice) : null;
  const Now = forced ? forced.Icon : live && !(live.kind === 'nang' && night) ? ICON[live.kind] : night ? Moon : Sun;
  return <div className="world-brand">
    <h1>Mộc Ngư Quán</h1>
    <button className="world-clock-face" aria-label="Giờ và thời tiết" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      {night ? <Moon size={15} /> : <Sun size={15} />}
      <b>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</b>
      <span>{state?.mode === 'nhanh' ? 'Tua nhanh' : period(hours)}</span>
      <span className="world-weather"><Now size={14} /> {forced ? `${forced.label} (giữ)` : live ? live.label : 'Đang xem trời…'}</span>
      {live && !forced && <span><Thermometer size={13} />{live.temp}°C{live.city ? ` · ${live.city}` : ''}</span>}
    </button>
    {open && state && <div className="world-clock-menu" role="menu" aria-label="Chọn thời tiết trên đảo">
      {WEATHER.map(w => <button key={w.id} role="menuitemradio" aria-checked={state.choice === w.id} onClick={() => world()?.setWeather(w.id)}><w.Icon size={14} /> {w.label}</button>)}
      <button role="menuitemcheckbox" aria-checked={state.mode === 'nhanh'} onClick={() => world()?.setTimeMode(state.mode === 'nhanh' ? 'that' : 'nhanh')}><FastForward size={14} /> {state.mode === 'nhanh' ? 'Về giờ thật' : 'Tua nhanh ngày đêm'}</button>
    </div>}
  </div>;
}
