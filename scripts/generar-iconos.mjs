import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, 'public/icons');

const SALIDAS = [
  { origen: 'public/icono.svg', archivo: 'icon-192.png', tamano: 192 },
  { origen: 'public/icono.svg', archivo: 'icon-512.png', tamano: 512 },
  { origen: 'public/icono.svg', archivo: 'apple-touch-icon.png', tamano: 180 },
  { origen: 'public/icono-maskable.svg', archivo: 'maskable-512.png', tamano: 512 },
];

await mkdir(destino, { recursive: true });

for (const { origen, archivo, tamano } of SALIDAS) {
  const svg = await readFile(resolve(raiz, origen));
  const png = await sharp(svg, { density: 512 }).resize(tamano, tamano).png().toBuffer();
  await writeFile(resolve(destino, archivo), png);
  console.log(`${archivo} (${tamano}x${tamano}) generado`);
}
