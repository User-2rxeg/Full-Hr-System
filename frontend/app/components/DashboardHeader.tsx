// filepath: d:\WebstormProjects\HR System\Main\frontend\app\components\DashboardHeader.tsx
'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import UserMenu from './UserMenu';
import { Button } from '@/app/components/ui/button';

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export default function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground">
              {getGreeting()}, {user?.firstName || 'User'}
            </h1>
            <p className="text-sm text-muted-foreground">Welcome back to your dashboard</p>
          </div>
          <Button variant="ghost" size="icon" asChild className="hidden md:flex">
            <Link href="/" title="Go to Home">
              <Home className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>
          </div>

          <div className="h-6 w-px bg-border hidden lg:block" />

          {/* Notifications */}
          <NotificationDropdown />

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

