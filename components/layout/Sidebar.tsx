'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GitBranch, Users, CheckSquare, UserCircle, PlusCircle, Bell } from 'lucide-react';
import type { Role } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin', 'loa', 'agent'] },
  { label: 'Pipeline', href: '/pipeline', icon: <GitBranch className="w-5 h-5" />, roles: ['admin', 'loa'] },
  { label: 'My Clients', href: '/my-clients', icon: <UserCircle className="w-5 h-5" />, roles: ['agent'] },
  { label: 'Users', href: '/users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Tasks', href: '/tasks', icon: <CheckSquare className="w-5 h-5" />, roles: ['admin', 'loa', 'agent'] },
  { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" />, roles: ['admin', 'loa', 'agent'] },
];

interface SidebarProps {
  role: Role;
  onClose?: () => void;
}

export default function Sidebar({ role, onClose }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <div className="flex flex-col h-full bg-[#1E3A5F] text-white">
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="font-bold text-lg leading-tight">CRM</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {role === 'agent' && (
        <div className="px-3 pb-4">
          <Link
            href="/my-clients/submit"
            onClick={onClose}
            className="flex items-center gap-2 w-full px-3 py-2.5 bg-[#C9A84C] hover:bg-[#b8953f] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Submit New Client
          </Link>
        </div>
      )}
    </div>
  );
}
