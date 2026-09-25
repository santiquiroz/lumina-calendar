import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function limpiarAlmacenamiento(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const peticion = indexedDB.deleteDatabase('lumina');
        peticion.onsuccess = () => resolve();
        peticion.onerror = () => resolve();
        peticion.onblocked = () => resolve();
      }),
  );
  await page.reload();
}

async function programarIdeaHoy(page: Page, texto: string): Promise<void> {
  await capturarIdea(page, texto);
  await page.goto('/canvas');
  await page.getByRole('button', { name: 'Programar' }).click();
  const hoja = page.getByRole('dialog', { name: 'Darle un lugar en el tiempo' });
  await hoja.getByLabel('Empieza').fill('09:00');
  await hoja.getByLabel('Termina').fill('10:30');
  await hoja.getByRole('button', { name: 'Programar' }).click();
  await expect(hoja).toBeHidden();
  await page.goto('/');
}

async function puntoDeAgarre(bloque: Locator): Promise<{ x: number; y: number }> {
  const caja = await bloque.boundingBox();
  if (!caja) throw new Error('El bloque no tiene caja visible');
  return { x: caja.x + caja.width / 2, y: caja.y + 12 };
}

async function capturarIdea(page: Page, texto: string): Promise<void> {
  // Sin esta espera el atajo se envía antes de que React monte el listener global.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('c');
  const campo = page.getByLabel('¿Qué tenés en la cabeza?');
  await campo.fill(texto);
  await campo.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Capturar idea' })).toBeHidden();
}

test.describe('flujo completo de Lumina', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarAlmacenamiento(page);
  });

  test('capturar, programar, anidar, completar, celebrar y respaldar', async ({ page }) => {
    await capturarIdea(page, 'Preparar la demo');

    await page.goto('/canvas');
    const canvas = page.getByRole('region', { name: 'Idea Canvas' });
    await expect(canvas.getByText('Preparar la demo')).toBeVisible();

    await canvas.getByRole('button', { name: 'Programar' }).click();
    const hoja = page.getByRole('dialog', { name: 'Darle un lugar en el tiempo' });
    await hoja.getByLabel('Empieza').fill('09:00');
    await hoja.getByLabel('Termina').fill('10:30');
    await hoja.getByRole('button', { name: 'Programar' }).click();
    await expect(hoja).toBeHidden();

    await page.goto('/');
    const bloque = page.getByRole('link', { name: /preparar la demo/i });
    await expect(bloque).toBeVisible();
    await bloque.click();

    await expect(page.getByRole('heading', { name: 'Preparar la demo' })).toBeVisible();

    await page.getByRole('button', { name: '+ Agregar subtarea' }).click();
    const primera = page.getByRole('textbox').first();
    await primera.fill('Escribir el guion');
    await primera.press('Enter');

    const segunda = page.getByRole('textbox').nth(1);
    await segunda.fill('Grabar la pantalla');
    await segunda.press('Tab');

    await expect(page.getByRole('treeitem')).toHaveCount(2);
    await expect(page.getByRole('treeitem').nth(1)).toHaveAttribute('aria-level', '2');

    // click y no check: la casilla es controlada por la consulta viva de Dexie,
    // así que el estado llega un instante después del clic.
    const primeraCasilla = page.getByLabel('Completar Escribir el guion');
    await primeraCasilla.click();
    await expect(primeraCasilla).toBeChecked();

    const segundaCasilla = page.getByLabel('Completar Grabar la pantalla');
    await segundaCasilla.click();
    await expect(segundaCasilla).toBeChecked();

    await expect(page.getByRole('dialog', { name: 'Carpeta completa' })).toBeVisible();
    await page.getByRole('button', { name: 'Listo' }).click();

    await page.goto('/ajustes');
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: /exportar respaldo/i }).click();
    const archivo = await descarga;
    const ruta = await archivo.path();
    const contenido = JSON.parse(await readFile(ruta, 'utf8')) as { nodes: unknown[] };
    expect(contenido.nodes.length).toBe(3);

    await limpiarAlmacenamiento(page);
    await page.goto('/ajustes');
    await page.getByLabel('Archivo de respaldo').setInputFiles(ruta);
    await expect(page.getByText('Se restauraron 3 elementos')).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('link', { name: /preparar la demo/i })).toBeVisible();
  });

  test('reprogramar es arrastrar el bloque en la vista Día, o usar las flechas', async ({
    page,
  }) => {
    await programarIdeaHoy(page, 'Leer el informe');
    const bloque = page.getByRole('link', { name: /leer el informe/i });
    await expect(bloque).toContainText('09:00 - 10:30');
    const { x, y } = await puntoDeAgarre(bloque);

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 32, { steps: 4 });
    await page.mouse.move(x, y + 64, { steps: 4 });
    await page.mouse.up();

    await expect(bloque).toContainText('10:00 - 11:30');
    await expect(page).not.toHaveURL(/\/nodo\//);

    await bloque.focus();
    await page.keyboard.press('ArrowUp');
    await expect(bloque).toContainText('09:45 - 11:15');
    await expect(page.getByRole('status').filter({ hasText: 'ahora va de' })).toHaveText(
      '«Leer el informe» ahora va de 09:45 a 11:15.',
    );
  });

  test('con el dedo, deslizar desplaza y mantener presionado reprograma', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'El gesto táctil solo aplica al proyecto móvil');
    await programarIdeaHoy(page, 'Llamar a Diego');
    const bloque = page.getByRole('link', { name: /llamar a diego/i });
    await expect(bloque).toContainText('09:00 - 10:30');
    const { x, y } = await puntoDeAgarre(bloque);
    const cdp = await page.context().newCDPSession(page);
    const tocar = (type: string, dy: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y: y + dy }],
      });

    await tocar('touchStart', 0);
    for (const dy of [16, 32, 48, 64]) await tocar('touchMove', dy);
    await tocar('touchEnd', 64);
    await expect(bloque).toContainText('09:00 - 10:30');

    await tocar('touchStart', 0);
    await page.waitForTimeout(500);
    for (const dy of [16, 32, 48, 64]) await tocar('touchMove', dy);
    await tocar('touchEnd', 64);

    await expect(bloque).toContainText('10:00 - 11:30');
    await expect(page).not.toHaveURL(/\/nodo\//);
  });

  test('la racha aparece tras la primera captura y nunca muestra un cero', async ({ page }) => {
    await page.goto('/logros');
    const logros = page.getByRole('region', { name: 'Días de Claridad' });
    await expect(logros.getByText(/tu próxima racha empieza cuando quieras/i)).toBeVisible();
    await expect(page.getByText(/\b0 días\b/i)).toHaveCount(0);

    await capturarIdea(page, 'Cualquier cosa');
    await page.goto('/logros');
    await expect(logros.getByText('1 día claro')).toBeVisible();
  });

  test('no aparece vocabulario de culpa en ninguna vista principal', async ({ page }) => {
    const prohibido = /fallaste|vencid|atrasad|perdiste|urgente/i;

    for (const ruta of ['/', '/mes', '/agenda', '/canvas', '/logros', '/buscar', '/ajustes']) {
      await page.goto(ruta);
      const texto = await page.locator('body').innerText();
      expect(texto, `vocabulario prohibido en ${ruta}`).not.toMatch(prohibido);
    }
  });
});
