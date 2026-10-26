import { cp, mkdir, readdir, readFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
for (const name of await readdir('dist')) {
  const content = await readFile(`dist/${name}`);
  if (!content.length) throw new Error(`Empty asset: ${name}`);
}
console.log('Built static site → dist/');
