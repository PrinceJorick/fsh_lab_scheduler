import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('app', 'dist', { recursive: true });
await cp('public', 'dist/public', { recursive: true });
