import { useState } from 'react';
import { Settings } from 'lucide-react';
import type { CaiDatNen } from './NenAnh';

// Nút bánh răng góc dưới phải: bật/tắt hiệu ứng nền (nhẹ máy) và bật lại nền 3D cũ (đảo/trang viên) nếu cần.
export default function CaiDatNenNut({ value, onChange }: { value: CaiDatNen; onChange: (v: CaiDatNen) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="nen-caidat">
    {open && <section className="nen-caidat-bang" aria-label="Cài đặt nền">
      <h3>Cài đặt nền</h3>
      <label><input type="checkbox" checked={value.hieuUng} disabled={value.cu3d} onChange={e => onChange({ ...value, hieuUng: e.target.checked })} />
        <span>Hiệu ứng nền<small>Rê chuột có chiều sâu, quả cầu thở sáng, đom đóm bay. Tắt cho nhẹ máy.</small></span></label>
      <label><input type="checkbox" checked={value.cu3d} onChange={e => onChange({ ...value, cu3d: e.target.checked })} />
        <span>Nền 3D cũ<small>Bật lại đảo bay / trang viên 3D thay cho ảnh cây tinh tú.</small></span></label>
    </section>}
    <button aria-label="Cài đặt nền" aria-expanded={open} title="Cài đặt nền" onClick={() => setOpen(o => !o)}><Settings size={18} /></button>
  </div>;
}
