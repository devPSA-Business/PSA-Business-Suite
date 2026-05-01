export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (message: string, meta?: Record<string, any>) => {
    console.info(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta }));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (message: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'error', message, timestamp: new Date().toISOString(), ...meta }));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (message: string, meta?: Record<string, any>) => {
    console.debug(JSON.stringify({ level: 'debug', message, timestamp: new Date().toISOString(), ...meta }));
  }
};
