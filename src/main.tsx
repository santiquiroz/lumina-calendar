import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { applyTheme, CLAVE_TEMA, settingsRepo, type ThemePreference } from '@/data/settingsRepo';
import { App } from './App';
import './index.css';

async function iniciarTema(): Promise<void> {
  const preferencia = await settingsRepo.get<ThemePreference>(CLAVE_TEMA, 'system');
  applyTheme(preferencia);
}

void iniciarTema();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
