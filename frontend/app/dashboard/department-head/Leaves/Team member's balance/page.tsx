'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamBalanceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/department-head/team-balances');
  }, [router]);

  return (
    <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh] bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to Team Balances...</p>
      </div>
    </div>
  );
}
