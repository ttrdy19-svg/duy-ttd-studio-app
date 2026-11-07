export type KhoLoai = 'map' | 'nhan-vat' | 'thu' | 'chuyen-dong' | 'kien-truc' | 'thien-nhien' | 'do-vat';

export interface KhoItem {
  id: string; ten: string; loai: KhoLoai; nguon: string; ban_quyen: string; dinh_dang: string;
  file: string; glb?: string; thumb?: string; dung_luong: number; can_chuyen?: boolean; loi?: string;
  mat?: number; xuong?: number; so_luoi?: number; dong_tac?: { ten: string; giay: number }[];
  vrm?: { ten?: string; tac_gia?: string; giay_phep?: string } | null;
}
export interface KhoIndex { items: KhoItem[]; dem: Record<string, number>; quet_luc?: string; chua_quet?: boolean }

declare global {
  interface Window {
    manorKho?: { index(): Promise<KhoIndex>; saveThumb(id: string, dataUrl: string): Promise<string>; show(file: string): Promise<void> };
  }
}
