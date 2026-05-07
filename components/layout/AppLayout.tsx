'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/types';

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  loa: 'LOA',
  agent: 'Agent',
};

const roleBadgeClass: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  loa: 'bg-blue-100 text-blue-700 border-blue-200',
  agent: 'bg-green-100 text-green-700 border-green-200',
};

interface AppLayoutProps {
  children: React.ReactNode;
  profile: Profile;
}

export default function AppLayout({ children, profile }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 shadow-sm">
        <Sidebar role={profile.role} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar role={profile.role} onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1" />

          <NotificationBell userId={profile.id} />

          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800 leading-none">{profile.full_name}</p>
              <span
                className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${roleBadgeClass[profile.role]}`}
              >
                {roleLabel[profile.role]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
