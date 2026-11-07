import { useState } from "react";
import { minhNhiPortrait } from "./assets";

export default function CompanionPortrait({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`companion-photo ${compact ? "compact" : ""}`}>
      {minhNhiPortrait && !failed ? (
        <img
          src={minhNhiPortrait}
          alt={compact ? "" : "Minh Nhi — người đồng hành sáng tạo"}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="portrait-unavailable">
          {compact ? "MN" : "Chưa có ảnh Minh Nhi"}
        </span>
      )}
    </span>
  );
}
