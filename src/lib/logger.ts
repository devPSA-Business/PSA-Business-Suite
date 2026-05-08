const SANITIZE_KEYS = [
  'email', 'phone', 'address', 'customerName', 'nik', 'pin', 'password',
  'recipient', 'message', 'note', 'details', 'phone_number', 'email_address'
];

function sanitize(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item));
  }

  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SANITIZE_KEYS.includes(key)) {
      newObj[key] = '<<PII_REMOVED>>';
    } else {
      newObj[key] = sanitize(value);
    }
  }
  return newObj;
}

export const logger = {
  info: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });
    console.info(JSON.stringify({ level: 'info', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));
  },
  warn: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });
    console.warn(JSON.stringify({ level: 'warn', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));
  },
  error: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message, stack: meta.stack } : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });
    console.error(JSON.stringify({ level: 'error', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));
  },
  debug: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });
    console.debug(JSON.stringify({ level: 'debug', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));
  }
};

