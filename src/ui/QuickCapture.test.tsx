import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { limpiarBase, renderConRuta } from '@/test/render';
import { esCampoDeTexto, QuickCapture } from './QuickCapture';

beforeEach(limpiarBase);

describe('esCampoDeTexto', () => {
  it('reconoce inputs y áreas de texto', () => {
    expect(esCampoDeTexto(document.createElement('input'))).toBe(true);
    expect(esCampoDeTexto(document.createElement('textarea'))).toBe(true);
    expect(esCampoDeTexto(document.createElement('div'))).toBe(false);
    expect(esCampoDeTexto(null)).toBe(false);
  });
});

describe('QuickCapture', () => {
  it('se abre con la tecla c y guarda la idea con Enter', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<QuickCapture />);

    await usuario.keyboard('c');
    const campo = await screen.findByLabelText('¿Qué tenés en la cabeza?');
    await usuario.type(campo, 'Llamar al banco{Enter}');

    await waitFor(async () => expect(await db.nodes.count()).toBe(1));
    const guardado = (await db.nodes.toArray())[0];
    expect(guardado.text).toBe('Llamar al banco');
    expect(guardado.schedule).toBeNull();
  });

  it('cierra sin guardar al presionar Escape', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<QuickCapture />);

    await usuario.keyboard('c');
    await screen.findByLabelText('¿Qué tenés en la cabeza?');
    await usuario.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByLabelText('¿Qué tenés en la cabeza?')).not.toBeInTheDocument(),
    );
    expect(await db.nodes.count()).toBe(0);
  });

  it('no guarda texto en blanco', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<QuickCapture />);

    await usuario.keyboard('c');
    const campo = await screen.findByLabelText('¿Qué tenés en la cabeza?');
    await usuario.type(campo, '   {Enter}');

    expect(await db.nodes.count()).toBe(0);
  });

  it('no se abre si la tecla c se escribe dentro de otro campo', async () => {
    const usuario = userEvent.setup();
    renderConRuta(
      <>
        <input aria-label="otro campo" />
        <QuickCapture />
      </>,
    );

    await usuario.click(screen.getByLabelText('otro campo'));
    await usuario.keyboard('c');

    expect(screen.queryByLabelText('¿Qué tenés en la cabeza?')).not.toBeInTheDocument();
  });
});
