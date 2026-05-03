export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (message: string | unknown, meta?: any) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' ? meta : { data: meta });
    console.info(JSON.stringify({ level: 'info', message: msg, timestamp: new Date().toISOString(), ...m }));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (message: string | unknown, meta?: any) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' ? meta : { data: meta });
    console.warn(JSON.stringify({ level: 'warn', message: msg, timestamp: new Date().toISOString(), ...m }));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (message: string | unknown, meta?: any) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message, stack: meta.stack } : (typeof meta === 'object' ? meta : { data: meta });
    console.error(JSON.stringify({ level: 'error', message: msg, timestamp: new Date().toISOString(), ...m }));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (message: string | unknown, meta?: any) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' ? meta : { data: meta });
    console.debug(JSON.stringify({ level: 'debug', message: msg, timestamp: new Date().toISOString(), ...m }));
  }
};
