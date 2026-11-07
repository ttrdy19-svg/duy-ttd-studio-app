import { useState } from "react";
import { BookOpen, ChevronRight, Compass, Music2 } from "lucide-react";
import { manorBackground } from "./assets";
import CompanionPortrait from "./CompanionPortrait";
import { places } from "./model";
import type { Place } from "./model";

// Coordinates refer to the supplied 2048 × 1009 artwork, independent of viewport size.
const hotspots: { id: Place; x: number; y: number; number: string }[] = [
  { id: "hall", x: 46, y: 40, number: "01" },
  { id: "courtyard", x: 43, y: 70, number: "02" },
  { id: "study", x: 25, y: 54, number: "03" },
  { id: "workshop", x: 61, y: 51, number: "04" },
  { id: "library", x: 75, y: 64, number: "05" },
];

interface Props {
  selected: Place;
  onSelect: (place: Place) => void;
  hasMusic: boolean;
  onCharacter: () => void;
  characterSelected: boolean;
}

export default function ManorScene({
  selected,
  onSelect,
  hasMusic,
  onCharacter,
  characterSelected,
}: Props) {
  const [failed, setFailed] = useState(false);
  const hasBackground = !!manorBackground && !failed;
  return (
    <div
      className={`manor-stage ${hasBackground ? "has-artwork" : "awaiting-artwork"}`}
      role="group"
      aria-label="Khung cảnh tương tác trang viên Mộc Ngư"
    >
      <div className="scene-plane">
        {hasBackground && (
          <img
            className="scene-image"
            src={manorBackground}
            alt="Trang viên cổ phong giữa núi xanh, thác nước và những mái ngói sáng đèn"
            onError={() => setFailed(true)}
          />
        )}
        <div className="scene-shade" />
        {hotspots.map(({ id, x, y, number }) => (
          <button
            key={id}
            className={`hotspot ${selected === id ? "selected" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`Mở ${places[id].name}`}
            aria-pressed={selected === id}
            onClick={() => onSelect(id)}
          >
            <span className="hotspot-anchor" />
            <span className="hotspot-label">
              <span className="hotspot-number">{number}</span>
              {places[id].name}
              {id === "study" && hasMusic && (
                <Music2 size={12} aria-label="Có nhạc phổ" />
              )}
            </span>
          </button>
        ))}
      </div>
      <div className="scene-intro">
        <span className="eyebrow">SƠN CƯ · MỘC NGƯ</span>
        <h2>
          Mây ngàn.
          <br />
          Một khúc thanh âm.
        </h2>
        <p>Mở một cánh cửa, khơi một ý tưởng.</p>
      </div>
      {!hasBackground && (
        <div className="scene-asset-notice" role="status">
          <BookOpen size={16} />
          <span>
            Chưa có ảnh trang viên.
            <small>
              Khung cảnh sẽ hiện khi bạn thêm ảnh reference vào dự án.
            </small>
          </span>
        </div>
      )}
      <button
        className={`scene-companion ${characterSelected ? "selected" : ""}`}
        aria-label="Xem nhiệm vụ của Minh Nhi"
        aria-pressed={characterSelected}
        onClick={onCharacter}
      >
        <CompanionPortrait compact />
        <span>
          <small>NGƯỜI ĐỒNG HÀNH</small>
          <strong>Minh Nhi</strong>
        </span>
        <ChevronRight size={16} />
      </button>
      <span className="scene-compass" aria-hidden="true">
        <Compass size={25} strokeWidth={1} />
        <small>MỘC NGƯ TRANG</small>
      </span>
    </div>
  );
}
