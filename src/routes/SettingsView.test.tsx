import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/data/db';
import { nodesRepo } from '@/data/nodesRepo';
import { CLAVE_TEMA, settingsRepo } from '@/data/settingsRepo';
import { limpiarBase, renderConRuta } from '@/test/render';
import { SettingsView } from './SettingsView';

beforeEach(async () => {
  await limpiarBase();
  URL.createObjectURL = vi.fn(() => 'blob:falso');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SettingsView', () => {
  it('guarda la preferencia de tema', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<SettingsView />);

    await usuario.click(await screen.findByRole('button', { name: 'Oscuro' }));

    await waitFor(async () =>
      expect(await settingsRepo.get(CLAVE_TEMA, 'system')).toBe('dark'),
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('exporta un respaldo y lo confirma', async () => {
    const usuario = userEvent.setup();
    await nodesRepo.create({ text: 'Idea para respaldar' });
    renderConRuta(<SettingsView />);

    await usuario.click(await screen.findByRole('button', { name: /exportar respaldo/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/1 elementos descargado/i);
  });

  it('rechaza un archivo que no es un respaldo de Lumina', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<SettingsView />);

    const archivo = new File(['{"cualquier":"cosa"}'], 'malo.json', { type: 'application/json' });
    await usuario.upload(screen.getByLabelText('Archivo de respaldo'), archivo);

    expect(await screen.findByRole('alert')).toHaveTextContent(/formato de respaldo de lumina/i);
  });

  it('restaura un respaldo válido', async () => {
    const usuario = userEvent.setup();
    const respaldo = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'restaurado',
          parentId: null,
          text: 'Nodo restaurado',
          done: false,
          order: 'U',
          collapsed: false,
          schedule: null,
          tags: [],
          colorKey: null,
          recurrence: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          deletedAt: null,
        },
      ],
      activities: [],
    };

    renderConRuta(<SettingsView />);

    const archivo = new File([JSON.stringify(respaldo)], 'respaldo.json', {
      type: 'application/json',
    });
    await usuario.upload(screen.getByLabelText('Archivo de respaldo'), archivo);

    await waitFor(async () => expect(await db.nodes.get('restaurado')).toBeDefined());
    expect(await screen.findByRole('status')).toHaveTextContent(/se restauraron 1 elementos/i);
  });

  it('muestra el aviso de atribución exigido por la licencia', async () => {
    renderConRuta(<SettingsView />);
    expect(await screen.findByText(/diego luis álvarez garcía/i)).toBeInTheDocument();
  });
});
