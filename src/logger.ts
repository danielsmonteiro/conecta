import fs from 'node:fs';
import { PATHS } from './config.js';

type Level = 'INFO' | 'WARN' | 'ERROR' | 'SKIP';

let stream: fs.WriteStream | null = null;

export function initLogger(): void {
  fs.mkdirSync(PATHS.logs, { recursive: true });
  stream = fs.createWriteStream(PATHS.log, { flags: 'a' });
  const now = new Date().toISOString();
  write('INFO', `=== Nova sessao de recuperacao iniciada em ${now} ===`);
}

function write(level: Level, msg: string): void {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  stream?.write(line + '\n');
  const c =
    level === 'ERROR' ? '\x1b[31m' : level === 'WARN' || level === 'SKIP' ? '\x1b[33m' : '\x1b[36m';
  // eslint-disable-next-line no-console
  console.log(`${c}${line}\x1b[0m`);
}

export const log = {
  info: (m: string) => write('INFO', m),
  warn: (m: string) => write('WARN', m),
  error: (m: string) => write('ERROR', m),
  skip: (m: string) => write('SKIP', m),
};

export function closeLogger(): void {
  stream?.end();
  stream = null;
}
