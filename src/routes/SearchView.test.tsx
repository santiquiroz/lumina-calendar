import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { nodesRepo } from '@/data/nodesRepo';
import { limpiarBase, renderConRuta } from '@/test/render';
import { SearchView } from './SearchView';

beforeEach(limpiarBase);

describe('SearchView', () => {
  it('invita a buscar antes de escribir', async () => {
    renderConRuta(<SearchView />);
    expect(await screen.findByText(/buscá lo que necesites/i)).toBeInTheDocument();
  });

  it('encuentra una subtarea anidada y muestra su ruta', async () => {
    const raiz = await nodesRepo.create({ text: 'Proyecto Alpha' });
    await nodesRepo.create({ text: 'Revisar métricas', parentId: raiz.id });

    const usuario = userEvent.setup();
    renderConRuta(<SearchView />);

    await usuario.type(screen.getByLabelText('Buscar en tus ideas y tareas'), 'metricas');

    expect(await screen.findByText('Revisar métricas')).toBeInTheDocument();
    expect(await screen.findByText('Proyecto Alpha')).toBeInTheDocument();
  });

  it('avisa cuando no hay coincidencias', async () => {
    await nodesRepo.create({ text: 'Cualquier cosa' });
    const usuario = userEvent.setup();
    renderConRuta(<SearchView />);

    await usuario.type(screen.getByLabelText('Buscar en tus ideas y tareas'), 'zzz');

    expect(await screen.findByText(/nada con esas palabras/i)).toBeInTheDocument();
  });
});
