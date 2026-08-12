import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/store/uiStore';
import { limpiarBase, renderConRuta } from '@/test/render';
import { BottomNav } from './BottomNav';
import { Chip } from './Chip';
import { Sidebar } from './Sidebar';

beforeEach(limpiarBase);

describe('BottomNav', () => {
  it('ofrece las rutas principales y la captura', async () => {
    renderConRuta(<BottomNav />);

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Día' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capturar idea' })).toBeInTheDocument();
  });

  it('abre la captura desde el botón central', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<BottomNav />);

    await usuario.click(screen.getByRole('button', { name: 'Capturar idea' }));
    expect(useUiStore.getState().capturaAbierta).toBe(true);
  });
});

describe('Sidebar', () => {
  it('lista las siete secciones de escritorio', async () => {
    renderConRuta(<Sidebar />);
    expect(await screen.findByRole('link', { name: 'Idea Canvas' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(7);
  });

  it('describe el estado tranquilo cuando no hay racha', async () => {
    renderConRuta(<Sidebar />);
    expect(await screen.findByText('Tu espacio tranquilo')).toBeInTheDocument();
  });
});

describe('Chip', () => {
  it('rinde el contenido con y sin color de categoría', () => {
    const { rerender } = renderConRuta(<Chip>Sin fecha</Chip>);
    expect(screen.getByText('Sin fecha')).toBeInTheDocument();

    rerender(<Chip colorKey="teal">Proyecto</Chip>);
    expect(screen.getByText('Proyecto')).toBeInTheDocument();
  });
});
