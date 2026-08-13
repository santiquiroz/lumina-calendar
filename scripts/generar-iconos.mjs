import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconos = resolve(raiz, 'public/icons');
const assets = resolve(raiz, 'assets');

const SUPERFICIE_CLARA = '#f8f9ff';
const SUPERFICIE_OSCURA = '#101a2b';

const PWA = [
  { origen: 'public/icono.svg', archivo: 'icon-192.png', tamano: 192 },
  { origen: 'public/icono.svg', archivo: 'icon-512.png', tamano: 512 },
  { origen: 'public/icono.svg', archivo: 'apple-touch-icon.png', tamano: 180 },
  { origen: 'public/icono-maskable.svg', archivo: 'maskable-512.png', tamano: 512 },
];

async function rasterizar(origen, tamano) {
  const svg = await readFile(resolve(raiz, origen));
  return sharp(svg, { density: 512 }).resize(tamano, tamano).png().toBuffer();
}

async function generarIconosPwa() {
  await mkdir(iconos, { recursive: true });
  for (const { origen, archivo, tamano } of PWA) {
    await writeFile(resolve(iconos, archivo), await rasterizar(origen, tamano));
    console.log(`public/icons/${archivo} (${tamano}x${tamano})`);
  }
}

// @capacitor/assets espera un icono de 1024 y pantallas de arranque de 2732.
async function generarFuentesNativas() {
  await mkdir(assets, { recursive: true });

  await writeFile(resolve(assets, 'icon.png'), await rasterizar('public/icono.svg', 1024));
  await writeFile(
    resolve(assets, 'icon-foreground.png'),
    await rasterizar('public/icono-maskable.svg', 1024),
  );
  console.log('assets/icon.png y assets/icon-foreground.png (1024x1024)');

  for (const [nombre, fondo] of [
    ['icon-background.png', SUPERFICIE_CLARA],
    ['splash.png', SUPERFICIE_CLARA],
    ['splash-dark.png', SUPERFICIE_OSCURA],
  ]) {
    const esFondoPlano = nombre === 'icon-background.png';
    const lado = esFondoPlano ? 1024 : 2732;
    const lienzo = sharp({
      create: {
        width: lado,
        height: lado,
        channels: 4,
        background: fondo,
      },
    });

    const png = esFondoPlano
      ? await lienzo.png().toBuffer()
      : await lienzo
          .composite([{ input: await rasterizar('public/icono.svg', 640), gravity: 'centre' }])
          .png()
          .toBuffer();

    await writeFile(resolve(assets, nombre), png);
    console.log(`assets/${nombre} (${lado}x${lado})`);
  }
}

await generarIconosPwa();
await generarFuentesNativas();
