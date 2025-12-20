'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { DotPattern } from '@/app/components/dot-pattern';
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, error: authError, clearError, getDashboardRoute } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setIsRedirecting(true);
      const dashboardRoute = getDashboardRoute();
      // Add a small delay before redirecting to show loading state
      setTimeout(() => {
        router.push(dashboardRoute);
      }, 300);
    }
  }, [isAuthenticated, isLoading, router, getDashboardRoute]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  const displayError = localError || authError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }

    const success = await login(email, password);
    if (success) {
      setIsRedirecting(true);
      const dashboardRoute = getDashboardRoute();
      // Add a small delay before redirecting to show loading state
      setTimeout(() => {
        router.push(dashboardRoute);
      }, 300);
    }
  };

  // Show loading state while checking authentication or redirecting
  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              {isRedirecting ? 'Redirecting to dashboard...' : 'Loading...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isRedirecting ? 'Please wait' : 'Please wait while we verify your session'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-background overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] opacity-20"></div>
        <DotPattern className="opacity-[0.3]" size="md" fadeStyle="circle" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-primary to-blue-600 rounded-xl mb-4 shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-300">
            <span className="text-white font-bold text-xl">HR</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Enter your credentials to access your workspace
          </p>
        </div>

        <GlassCard className="p-8 shadow-xl border-t border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          {displayError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-10 bg-background/50 border-input group-hover:border-primary/50 transition-colors"
                  placeholder="name@company.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground ml-1">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-10 bg-background/50 border-input group-hover:border-primary/50 transition-colors"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-primary hover:text-primary/80 hover:underline transition-all">
                Register as candidate
              </Link>
            </p>
          </div>
        </GlassCard>

        {/* Test Credentials - Improved visual */}
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <GlassCard className="p-4 bg-muted/30 border-dashed border-muted-foreground/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Demo Credentials</p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between items-center p-2 rounded bg-background/40 hover:bg-background/80 transition-colors cursor-pointer group" onClick={() => { setEmail('hr.admin@company.hr-admin.com'); setPassword('RoleUser@1234'); }}>
                <span><span className="font-medium text-foreground">HR Admin:</span> hr.admin@company.hr-admin.com</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-background/40 hover:bg-background/80 transition-colors cursor-pointer group" onClick={() => { setEmail('system.admin@company.system-admin.com'); setPassword('RoleUser@1234'); }}>
                <span><span className="font-medium text-foreground">Sys Admin:</span> system.admin@company.system-admin.com</span>
              </div>
              <div className="px-2 pt-1 flex justify-between text-xs opacity-75">
                <span>Password for all:</span>
                <span className="font-mono bg-muted px-1 rounded">RoleUser@1234</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
