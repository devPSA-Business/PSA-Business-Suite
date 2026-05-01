import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { vi } from 'vitest';

// Force global indexedDB for Dexie
global.indexedDB = new IDBFactory();
global.IDBKeyRange = IDBKeyRange;

// Mock matchMedia
Object.defineProperty(global, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), 
    removeListener: vi.fn(), 
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Set environment variables for tests
process.env.VITE_CRYPTO_PEPPER = 'test-pepper';

// Mock localStorage/sessionStorage if needed (node env)
const storageMock = () => {
    let storage: Record<string, string> = {};
    return {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => storage[key] = value,
      removeItem: (key: string) => delete storage[key],
      clear: () => storage = {},
    };
};
global.localStorage = storageMock() as any;
global.sessionStorage = storageMock() as any;

const fakeCryptoSubtle = {
  generateKey: async () => ({ type: 'secret', extractable: true, algorithm: { name: 'AES-GCM' }, usages: ['encrypt', 'decrypt'] } as unknown as CryptoKey),
  encrypt: async () => new Uint8Array([1, 2, 3]).buffer,
  decrypt: async () => new TextEncoder().encode(JSON.stringify({ items: [] })).buffer,
  digest: async () => new Uint8Array([1, 2, 3]).buffer,
  wrapKey: async () => new Uint8Array([1, 2, 3]).buffer,
  unwrapKey: async () => ({ type: 'secret', extractable: true, algorithm: { name: 'AES-GCM' }, usages: ['encrypt', 'decrypt'] } as unknown as CryptoKey),
  importKey: async () => ({ type: 'secret', extractable: true, algorithm: { name: 'AES-GCM' }, usages: ['encrypt', 'decrypt'] } as unknown as CryptoKey),
  deriveKey: async () => ({ type: 'secret', extractable: true, algorithm: { name: 'AES-GCM' }, usages: ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'] } as unknown as CryptoKey),
  deriveBits: async (algo: any, baseKey: CryptoKey, length: number) => {
    const saltStr = new TextDecoder().decode((algo as any).salt);
    const arr = new Uint8Array(length / 8); // e.g. 256 bits = 32 bytes
    for (let i = 0; i < arr.length; i++) {
        arr[i] = saltStr.charCodeAt(i % saltStr.length) || i;
    }
    return arr.buffer;
  },
};

if (typeof window === 'undefined') {
  (global as any).window = {
    crypto: { subtle: fakeCryptoSubtle, getRandomValues: (arr: any) => arr },
    btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
    atob: (b64: string) => Buffer.from(b64, 'base64').toString('binary'),
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: global.localStorage,
    sessionStorage: global.sessionStorage
  };
  (global as any).document = {
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  Object.defineProperty(global, 'crypto', {
    value: { subtle: fakeCryptoSubtle, getRandomValues: (arr: any) => arr, randomUUID: () => 'fake-uuid-' + Math.random() },
    writable: true
  });
} else {
  if (!window.crypto) (window as any).crypto = { subtle: fakeCryptoSubtle, getRandomValues: (arr: any) => arr };
  else if (!window.crypto.subtle) (window as any).crypto.subtle = fakeCryptoSubtle;
  if (!window.btoa) (window as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
  if (!window.atob) (window as any).atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
  if (!window.addEventListener) (window as any).addEventListener = () => {};
  if (!window.removeEventListener) (window as any).removeEventListener = () => {};
  if (typeof document !== 'undefined') {
    if (!document.addEventListener) (document as any).addEventListener = () => {};
    if (!document.removeEventListener) (document as any).removeEventListener = () => {};
  }
  if (!window.localStorage) (window as any).localStorage = global.localStorage;
  if (!window.sessionStorage) (window as any).sessionStorage = global.sessionStorage;
}
