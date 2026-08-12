import { expect, test } from '@playwright/test';

test.describe('accesibilidad', () => {
  test('se puede capturar una idea sin tocar el ratón', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.keyboard.press('c');
    const campo = page.getByLabel('¿Qué tenés en la cabeza?');
    await expect(campo).toBeVisible();
    await expect(campo).toBeFocused();

    await page.keyboard.type('Idea escrita con el teclado');
    await page.keyboard.press('Enter');

    // La hoja se cierra recién cuando la escritura en IndexedDB terminó.
    await expect(page.getByRole('dialog', { name: 'Capturar idea' })).toBeHidden();

    await page.goto('/canvas');
    await expect(page.getByText('Idea escrita con el teclado')).toBeVisible();
  });

  test('la navegación principal expone landmarks y encabezados', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('respeta la preferencia de movimiento reducido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const duraciones = await page.evaluate(() => {
      const elemento = document.querySelector('a, button');
      if (!elemento) return [] as string[];
      return getComputedStyle(elemento)
        .transitionDuration.split(',')
        .map((valor) => valor.trim());
    });

    expect(duraciones.length).toBeGreaterThan(0);
    for (const duracion of duraciones) {
      expect(Number.parseFloat(duracion)).toBeLessThan(0.001);
    }
  });

  test('el tema oscuro se aplica y persiste', async ({ page }) => {
    await page.goto('/ajustes');
    await page.getByRole('button', { name: 'Oscuro' }).click();

    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('todos los controles tienen nombre accesible', async ({ page }) => {
    await page.goto('/');

    for (const boton of await page.getByRole('button').all()) {
      const etiqueta = (await boton.getAttribute('aria-label')) ?? (await boton.innerText());
      expect(etiqueta.trim().length).toBeGreaterThan(0);
    }
  });
});
