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

  it('safely exits if window or document is undefined (SSR / Node environment)', () => {
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { document?: unknown }).document;

    const blob = new Blob(['test']);
    expect(() => triggerFileDownload(blob, 'test.zip')).not.toThrow();
  });

  it('creates an anchor, attaches it to document.body, sets download attribute and triggers click in DOM environment', () => {
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
    triggerFileDownload(blob, 'test-package.zip');

    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
    expect(documentMock.createElement).toHaveBeenCalledWith('a');
    expect(bodyMock.appendChild).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('test-package.zip');
    expect(mockAnchor.setAttribute).toHaveBeenCalledWith('download', 'test-package.zip');
    expect(mockAnchor.click).toHaveBeenCalled();
  });
});
