import { Outlet } from 'react-router';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { useReminderSync } from '@/hooks/useReminders';
import { useUpdate } from '@/hooks/useUpdate';
import { BottomNav } from '@/ui/BottomNav';
import { NewEventSheet } from '@/ui/NewEventSheet';
import { QuickCapture } from '@/ui/QuickCapture';
import { ScheduleSheet } from '@/ui/ScheduleSheet';
import { Sidebar } from '@/ui/Sidebar';
import { UpdateBanner } from '@/ui/UpdateBanner';

export function Layout() {
  const { disponible, descartar } = useUpdate();
  useCalendarSync();
  useReminderSync();

  return (
    <div className="flex h-full min-h-dvh bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-4">
          {disponible ? (
            <UpdateBanner info={disponible} onDismiss={() => void descartar()} />
          ) : null}
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <QuickCapture />
      <ScheduleSheet />
      <NewEventSheet />
    </div>
  );
}
