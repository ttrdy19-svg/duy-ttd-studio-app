import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LibraryStudio from './LibraryStudio';

describe('LibraryStudio - Mộc Ngữ Quán S2 V73 Tàng Thư', () => {
  it('renders top bar with Trở về Sơn Trang button and zoom guide', async () => {
    const onAudio = vi.fn();
    const onBackToManor = vi.fn();
    const onConsultTuAm = vi.fn();

    window.manorDesktop = {
      ...window.manorDesktop,
      library: {
        document: vi.fn().mockResolvedValue('<html><body><div id="mnq-test">Mock MNQ</div></body></html>'),
        request: vi.fn().mockResolvedValue(true),
      },
    } as any;

    render(
      <LibraryStudio
        onAudio={onAudio}
        onBackToManor={onBackToManor}
        onConsultTuAm={onConsultTuAm}
      />
    );

    const backBtn = screen.getByRole('button', { name: /Trở về Sơn Trang/i });
    expect(backBtn).toBeTruthy();
    expect(screen.getByText(/Ctrl \+ lăn chuột/i)).toBeTruthy();

    fireEvent.click(backBtn);
    expect(onBackToManor).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTitle('Mộc Ngữ Quán S2 V73')).toBeTruthy();
    });
  });

  it('receives audio-handoff message with lyrics and title and proxies to onAudio', async () => {
    const onAudio = vi.fn();
    const onBackToManor = vi.fn();
    const onConsultTuAm = vi.fn();

    window.manorDesktop = {
      ...window.manorDesktop,
      library: {
        document: vi.fn().mockResolvedValue('<html><body></body></html>'),
        request: vi.fn().mockResolvedValue(true),
      },
    } as any;

    const { container } = render(
      <LibraryStudio
        onAudio={onAudio}
        onBackToManor={onBackToManor}
        onConsultTuAm={onConsultTuAm}
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle('Mộc Ngữ Quán S2 V73')).toBeTruthy();
    });

    const iframe = container.querySelector('iframe');
    const contentWindow = iframe?.contentWindow;

    const fakeBase64Audio = btoa('RIFF....WAVEfmt ');
    window.dispatchEvent(
      new MessageEvent('message', {
        source: contentWindow,
        data: {
          type: 'manor-library-request',
          id: 'test-1',
          operation: 'audio-handoff',
          args: {
            data: fakeBase64Audio,
            name: 'ThienHaHuuTinhNhan.mp3',
            mime: 'audio/mpeg',
            title: 'Thiên Hạ Hữu Tình Nhân',
            lyrics: 'Trời đất bao la\nMối tình thiên thu',
            genre: 'Cổ phong',
            singer: 'Chú Lạ ft Minh Nhi',
          },
        },
      })
    );

    expect(onAudio).toHaveBeenCalledTimes(1);
    const [file, meta] = onAudio.mock.calls[0];
    expect(file.name).toBe('ThienHaHuuTinhNhan.mp3');
    expect(meta.title).toBe('Thiên Hạ Hữu Tình Nhân');
    expect(meta.lyrics).toContain('Trời đất bao la');
    expect(meta.genre).toBe('Cổ phong');
  });

  it('receives tu-am-consult and back-to-manor messages and triggers callbacks', async () => {
    const onAudio = vi.fn();
    const onBackToManor = vi.fn();
    const onConsultTuAm = vi.fn();

    window.manorDesktop = {
      ...window.manorDesktop,
      library: {
        document: vi.fn().mockResolvedValue('<html><body></body></html>'),
        request: vi.fn().mockResolvedValue(true),
      },
    } as any;

    const { container } = render(
      <LibraryStudio
        onAudio={onAudio}
        onBackToManor={onBackToManor}
        onConsultTuAm={onConsultTuAm}
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle('Mộc Ngữ Quán S2 V73')).toBeTruthy();
    });

    const iframe = container.querySelector('iframe');
    const contentWindow = iframe?.contentWindow;

    window.dispatchEvent(
      new MessageEvent('message', {
        source: contentWindow,
        data: {
          type: 'manor-library-request',
          id: 'test-2',
          operation: 'tu-am-consult',
          args: {
            title: 'Hồng Nhan Lạc',
            lyrics: 'Gió cuốn hoa rơi',
            genre: 'Cổ phong bi kịch',
            singer: 'Minh Nhi',
          },
        },
      })
    );

    expect(onConsultTuAm).toHaveBeenCalledTimes(1);
    expect(onConsultTuAm).toHaveBeenCalledWith({
      title: 'Hồng Nhan Lạc',
      lyrics: 'Gió cuốn hoa rơi',
      genre: 'Cổ phong bi kịch',
      singer: 'Minh Nhi',
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        source: contentWindow,
        data: {
          type: 'manor-library-request',
          id: 'test-3',
          operation: 'back-to-manor',
          args: {},
        },
      })
    );

    expect(onBackToManor).toHaveBeenCalledTimes(1);
  });
});

