import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Subtle illustration */}
      <div className="mb-8 text-muted-foreground/20">
        <svg
          className="w-32 h-32"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={0.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
          />
        </svg>
      </div>

      {/* Content - Minimalist design, no card */}
      <div className="text-center max-w-md">
        <p className="text-6xl font-light text-muted-foreground mb-4">404</p>
        <h1 className="text-xl font-medium text-foreground mb-2">
          Page not found
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Navigation suggestions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 
              bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 
              transition-colors font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 
              bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 
              transition-colors font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Go Home
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Popular sections
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: 'Employees', href: '/dashboard/hr-admin/employee-management' },
              { label: 'Organization', href: '/dashboard/system-admin/organization-structure' },
              { label: 'Performance', href: '/dashboard/hr-manager/performance-dashboard' },
              { label: 'Onboarding', href: '/dashboard/hr-manager/onboarding' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground 
                  hover:bg-accent rounded-md transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
