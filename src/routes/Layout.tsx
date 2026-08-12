import { Outlet } from 'react-router';
import { BottomNav } from '@/ui/BottomNav';
import { QuickCapture } from '@/ui/QuickCapture';
import { ScheduleSheet } from '@/ui/ScheduleSheet';
import { Sidebar } from '@/ui/Sidebar';

export function Layout() {
  return (
    <div className="flex h-full min-h-dvh bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-4">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <QuickCapture />
      <ScheduleSheet />
    </div>
  );
}
