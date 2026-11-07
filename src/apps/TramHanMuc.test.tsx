import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TramHanMuc from './TramHanMuc';
import type { AppsBridge, HanMuc } from './types';

const DATA: HanMuc = { luc: Date.now(), nguon: [
  { id: 'codex', ten: 'Codex CLI (ChatGPT)', do: 'do-duoc', trangThai: 'het', pct: 100, daDung: '98% cửa sổ 5 giờ', conLai: 'Ghế Business: chủ workspace hết tín dụng', hoiLai: Date.now() + 90 * 60000, capNhat: Date.now(), cach: 'Đọc ~/.codex/sessions', dong: [['Hôm nay', '1.000 token'], ['  phiên 1', '500 token']] },
  { id: 'gemini', ten: 'Gemini API (key free)', do: 'uoc-tinh', trangThai: 'gan-het', pct: 85, daDung: '17/20 key', conLai: '3 key', cach: 'Đếm key', dong: [] },
] };

describe('Trạm hạn mức', () => {
  afterEach(() => { delete window.manorApps; });
  it('hiện thẻ từng nguồn, màu theo tình trạng, tooltip cách đo, Làm mới gọi lại', async () => {
    const hanMuc = vi.fn().mockResolvedValue(DATA);
    window.manorApps = { hanMuc } as unknown as AppsBridge;
    render(<TramHanMuc />);
    const codex = await screen.findByRole('article', { name: 'Codex CLI (ChatGPT)' });
    expect(codex.className).toContain('het');
    expect(screen.getByRole('article', { name: 'Gemini API (key free)' }).className).toContain('gan-het');
    expect(screen.getByText(/1 nguồn hết/)).toBeTruthy();
    expect(screen.getByText(/còn 1 giờ 30 phút/)).toBeTruthy();
    expect(screen.getByText('Đo được').closest('[title]')?.getAttribute('title')).toBe('Đọc ~/.codex/sessions');
    fireEvent.click(screen.getByRole('button', { name: /Làm mới/ }));
    await waitFor(() => expect(hanMuc).toHaveBeenCalledTimes(2));
  });
  it('thẻ Antigravity hiện đủ ba nhóm, trạng thái hồi ước tính và số lần chạy hôm nay, không có phần trăm', async () => {
    const agy: HanMuc = { luc: Date.now(), nguon: [{
      id: 'agy', ten: 'Antigravity CLI', do: 'uoc-tinh', trangThai: 'on', pct: null,
      daDung: '2 lần chạy thành công hôm nay', conLai: '1/3 nhóm dùng được theo lần chạy gần nhất',
      cach: 'Log cục bộ; không có phần trăm.', dong: [], agyGroups: [
        { id: 'argon', ten: 'Argon', trangThai: 'het', ketQuaCuoi: 'het', hetLuc: Date.now() - 2 * 60 * 60_000, hoiLai: Date.now() + 5 * 24 * 60 * 60_000, luotHomNay: 0 },
        { id: 'gemini', ten: 'Gemini', trangThai: 'chua-ro', ketQuaCuoi: 'het', hetLuc: Date.now() - 6 * 60 * 60_000, hoiLai: Date.now() - 60 * 60_000, luotHomNay: 0 },
        { id: 'claude-gpt', ten: 'Claude & GPT', trangThai: 'on', ketQuaCuoi: 'thanh-cong', capNhat: Date.now() - 60_000, luotHomNay: 2 },
      ],
    }] };
    window.manorApps = { hanMuc: vi.fn().mockResolvedValue(agy) } as unknown as AppsBridge;
    render(<TramHanMuc />);
    const the = await screen.findByRole('article', { name: 'Antigravity CLI' });
    expect(the.querySelector('.hm-bar')).toBeNull();
    expect(the.textContent).toContain('Argon · Hết');
    expect(the.textContent).toMatch(/hết lúc .* · mốc hồi ước tính .* · hôm nay 0 lần chạy/);
    expect(the.textContent).toMatch(/Gemini · Chưa rõ, có thể đã hồi/);
    expect(the.textContent).toContain('Claude & GPT · Dùng được');
    expect(the.textContent).toContain('hôm nay 2 lần chạy');
  });
  it('cảnh báo, thẻ Codex hiện cả 3 tài khoản (gói + % cửa sổ 5 giờ/tuần + hết tín dụng), nguồn key: ô mật khẩu, sửa không hiện key cũ, Dò số dư', async () => {
    const data: HanMuc = { ...DATA, canhBao: ['Key beatapi: còn 2 ngày là hết hạn'],
      nguon: [{ ...DATA.nguon[0], workspace: [
        { ten: 'business', thuMuc: '~/.codex-business', goi: 'business', mail: 'tt…@…', dangDung: false, dangHet: true, pct5h: 25, pctTuan: 80, het: Date.now() - 60000, lyDo: 'out of credits' },
        { ten: 'plus-tai-khoan-d', thuMuc: '~/.codex-tai-khoan-d', goi: 'plus', mail: 'tt…@…', dangDung: true, dangHet: false, pct5h: 10, pctTuan: 40, het: null, lyDo: '' },
        { ten: 'plus-tai-khoan-a', thuMuc: '~/.codex', goi: 'plus', mail: 'tt…@…', dangDung: false, dangHet: false, pct5h: 5, pctTuan: 15, het: null, lyDo: '' }] }],
      cauHinh: { loi: '', nguon: [{ ten: 'beatapi', loai: 'openai', baseUrl: 'https://beat.example/v1', host: 'beat.example', coKey: true, model: 'm', rpm: 10, cachDo: 'new-api', hetHan: '2026-11-07', ghiChu: 'khuyến mãi', tat: false, file: 'json' }] } };
    const hanMuc = vi.fn().mockResolvedValue(data);
    const hanMucLuu = vi.fn().mockResolvedValue([]), hanMucDo = vi.fn().mockResolvedValue({});
    window.manorApps = { hanMuc, hanMucLuu, hanMucDo } as unknown as AppsBridge;
    render(<TramHanMuc />);
    expect(await screen.findByText(/còn 2 ngày là hết hạn/)).toBeTruthy();
    expect(screen.getByTitle('out of credits').textContent).toMatch(/hết tín dụng/);
    const codex = screen.getByRole('article', { name: 'Codex CLI (ChatGPT)' });
    expect(codex.textContent).toContain('business (~/.codex-business) · gói business');
    expect(codex.textContent).toContain('5 giờ: 25% · tuần: 80%');
    expect(codex.textContent).toContain('plus-tai-khoan-d (~/.codex-tai-khoan-d) · gói plus');
    expect(codex.textContent).toContain('5 giờ: 10% · tuần: 40% · đang ưu tiên');
    expect(codex.textContent).toContain('plus-tai-khoan-a (~/.codex) · gói plus');
    expect(codex.textContent).toContain('5 giờ: 5% · tuần: 15%');
    fireEvent.click(screen.getByRole('button', { name: /Dò số dư/ }));
    await waitFor(() => expect(hanMucDo).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Sửa beatapi' }));
    const key = screen.getByPlaceholderText(/Đã có key/) as HTMLInputElement;
    expect(key.type).toBe('password'); expect(key.value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(hanMucLuu).toHaveBeenCalledWith(expect.objectContaining({ tenCu: 'beatapi', ten: 'beatapi', key: '', cachDo: 'new-api', hetHan: '2026-11-07' })));
  });
  it('thẻ Claude không có %: không hiện thanh, không "Còn nhiều"; ô tự nhập lưu % tuần + reset, ≥ 90% tô đỏ', async () => {
    const claude = { id: 'claude-chinh', ten: 'Claude Code (gói Pro · tổng giám đốc)', do: 'do-duoc' as const, trangThai: 'chua-ro' as const, pct: null, daDung: '900 token trong khối 5 giờ', conLai: 'Hạn mức thật: chưa đọc được', cach: 'jsonl', dong: [], nhapDuoc: true, nhap: null };
    const sau = { luc: Date.now(), nguon: [{ ...claude, trangThai: 'gan-het' as const, pct: 98, canhBao: true, conLai: '2% tuần (chủ tịch nhập …)', nhap: { pct: 98, reset: Date.now() + 86400000, luc: Date.now() } }] };
    const hanMucNhap = vi.fn().mockResolvedValue(sau);
    window.manorApps = { hanMuc: vi.fn().mockResolvedValue({ luc: Date.now(), nguon: [claude] }), hanMucNhap } as unknown as AppsBridge;
    render(<TramHanMuc />);
    const the = await screen.findByRole('article', { name: /Claude Code/ });
    expect(the.querySelector('.hm-bar')).toBeNull();
    expect(the.textContent).not.toContain('Còn nhiều');
    expect(the.textContent).toContain('Hạn mức thật: chưa đọc được');
    fireEvent.change(screen.getByLabelText('Phần trăm tuần đã dùng'), { target: { value: '98' } });
    fireEvent.change(screen.getByLabelText('Ngày giờ reset'), { target: { value: '09/11 09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(hanMucNhap).toHaveBeenCalledWith('claude-chinh', { pct: 98, reset: '09/11 09:00' }));
    await waitFor(() => expect(screen.getByRole('article', { name: /Claude Code/ }).className).toContain('canh-bao'));
  });
  it('ngoài Electron thì báo không chạy được', () => {
    render(<TramHanMuc />);
    expect(screen.getByText(/chỉ chạy trong bản Windows/)).toBeTruthy();
  });
});
