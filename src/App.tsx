import { Route, Routes } from 'react-router';
import { Layout } from '@/routes/Layout';
import { AboutView } from '@/routes/AboutView';
import { AgendaView } from '@/routes/AgendaView';
import { CanvasView } from '@/routes/CanvasView';
import { DayView } from '@/routes/DayView';
import { FocusMode } from '@/routes/FocusMode';
import { MonthView } from '@/routes/MonthView';
import { NodeDetail } from '@/routes/NodeDetail';
import { RewardsView } from '@/routes/RewardsView';
import { SearchView } from '@/routes/SearchView';
import { SettingsView } from '@/routes/SettingsView';

export function App() {
  return (
    <Routes>
      <Route path="/nodo/:id/foco" element={<FocusMode />} />
      <Route element={<Layout />}>
        <Route path="/" element={<DayView />} />
        <Route path="/mes" element={<MonthView />} />
        <Route path="/agenda" element={<AgendaView />} />
        <Route path="/canvas" element={<CanvasView />} />
        <Route path="/nodo/:id" element={<NodeDetail />} />
        <Route path="/logros" element={<RewardsView />} />
        <Route path="/buscar" element={<SearchView />} />
        <Route path="/ajustes" element={<SettingsView />} />
        <Route path="/acerca-de" element={<AboutView />} />
        <Route path="*" element={<DayView />} />
      </Route>
    </Routes>
  );
}
