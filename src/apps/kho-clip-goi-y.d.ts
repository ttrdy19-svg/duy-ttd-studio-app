export interface PlanClip { bai: string; caSi?: string; nhanVat?: string; phongCach?: string; tieng?: string; canh: CanhClip[]; doan?: { ten: string; tu: number; den: number }[] }
export interface CanhClip { id: string; doan?: string; nv?: boolean; ta?: string; veoTa?: string; nhep?: boolean; dungLai?: { clip: string; lyDo: string } }
export interface GoiYClip { clip: string; id?: string; diem: number | null; lyDo: string; canhBao: string; hanhDong?: string }
export interface KetQuaGoiY { canh: { index: number; canh: string; thoiLuong: number; goiY: GoiYClip | null; ungVien: GoiYClip[] }[]; canhBao: string[] }
export function goiY(plan: PlanClip, items: unknown[]): KetQuaGoiY;
export function suyNhan(plan?: object, canh?: object, file?: string): Record<string, string>;
