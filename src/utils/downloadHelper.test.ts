import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerFileDownload } from './downloadHelper';

describe('triggerFileDownload utility (Chromium DOM attachment compliance)', () => {
  let originalWindow: typeof globalThis.window;
  let originalDocument: typeof globalThis.document;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });

  it('safely exits if window or document is undefined (SSR / Node environment)', async () => {
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { document?: unknown }).document;

    const blob = new Blob(['test']);
    await expect(triggerFileDownload(blob, 'test.zip')).resolves.not.toThrow();
  });

  it('uses showSaveFilePicker when available in modern Chromium/Edge', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    const closeMock = vi.fn().mockResolvedValue(undefined);
    const showSaveFilePickerMock = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: writeMock,
        close: closeMock,
      }),
    });

    Object.defineProperty(globalThis, 'window', {
      value: {
        showSaveFilePicker: showSaveFilePickerMock,
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', { value: {}, writable: true, configurable: true });

    const blob = new Blob(['test content'], { type: 'application/zip' });
    await triggerFileDownload(blob, 'OSForge-Studio-Windows-Portable.zip');

    expect(showSaveFilePickerMock).toHaveBeenCalledWith(expect.objectContaining({
      suggestedName: 'OSForge-Studio-Windows-Portable.zip',
    }));
    expect(writeMock).toHaveBeenCalledWith(blob);
    expect(closeMock).toHaveBeenCalled();
  });

  it('falls back to DOM anchor click when showSaveFilePicker is absent', async () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost:5173/mock-uuid');
    const revokeObjectURLMock = vi.fn();

    let appendedElement: unknown = null;
    const bodyMock = {
      appendChild: vi.fn().mockImplementation((node) => {
        appendedElement = node;
        return node;
      }),
      removeChild: vi.fn(),
    };

    const mockAnchor = {
      style: {},
      href: '',
      download: '',
      setAttribute: vi.fn().mockImplementation(function(this: { download: string }, name: string, val: string) {
        if (name === 'download') this.download = val;
      }),
      click: vi.fn(),
      parentNode: bodyMock,
      rel: '',
    };

    const documentMock = {
      body: bodyMock,
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'a') return mockAnchor;
        return {};
      }),
    };

    const windowMock = {
      URL: {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      },
    };

    Object.defineProperty(globalThis, 'window', { value: windowMock, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: documentMock, writable: true, configurable: true });

    const blob = new Blob(['test content'], { type: 'application/zip' });
    await triggerFileDownload(blob, 'test-package.zip');

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(documentMock.createElement).toHaveBeenCalledWith('a');
    expect(bodyMock.appendChild).toHaveBeenCalled();
    expect(appendedElement).toBe(mockAnchor);
    expect(mockAnchor.download).toBe('test-package.zip');
    expect(mockAnchor.setAttribute).toHaveBeenCalledWith('download', 'test-package.zip');
    expect(mockAnchor.click).toHaveBeenCalled();
  });
});
