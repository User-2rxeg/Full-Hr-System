'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { DotPattern } from '@/app/components/dot-pattern';
import { User, Mail, Lock, Phone, CreditCard, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

// Password strength indicator component
function PasswordStrength({ password }: { password: string }) {
  const calculateStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 4);
  };

  const strength = calculateStrength(password);

  const strengthColors = [
    'bg-destructive/50',   // 0: Weak
    'bg-destructive',      // 1: Weak
    'bg-amber-500',        // 2: Fair
    'bg-blue-500',         // 3: Good
    'bg-green-500',        // 4: Strong
  ];

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`flex-1 rounded-full transition-all duration-300 ${level <= strength ? strengthColors[strength] : 'bg-muted/50'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium text-right ${strength <= 1 ? 'text-destructive' : strength === 2 ? 'text-amber-500' : strength === 3 ? 'text-blue-500' : 'text-green-500'}`}>
        {strengthLabels[strength]}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error: authError, clearError, login } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    email: '',
    mobilePhone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Clear errors when component mounts or unmounts
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);


  const displayError = localError || authError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (localError) setLocalError('');
    if (authError) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.nationalId || !formData.mobilePhone) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }

    if (!formData.agreeToTerms) {
      setLocalError('You must agree to the terms and conditions');
      return;
    }

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      nationalId: formData.nationalId,
      email: formData.email,
      password: formData.password,
      mobilePhone: formData.mobilePhone,
    });

    if (result) {
      setSuccess(true);
      setIsLoggingIn(true);
      
      // After successful registration, auto-login the candidate
      try {
        // Use the login function from AuthContext to set user state
        const loginSuccess = await login(formData.email, formData.password);
        if (loginSuccess) {
          // Redirect to candidate dashboard
          setTimeout(() => {
            router.push('/dashboard/job-candidate');
          }, 1000);
        } else {
          // If login fails, redirect to login page
          setTimeout(() => {
            router.push('/login?registered=true');
          }, 2000);
        }
      } catch (loginErr) {
        // If auto-login fails, redirect to login page
        console.error('Auto-login after registration failed:', loginErr);
        setTimeout(() => {
          router.push('/login?registered=true');
        }, 2000);
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <DotPattern className="opacity-[0.3]" size="md" fadeStyle="circle" />
        </div>

        <GlassCard className="w-full max-w-md text-center p-8 relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-500/5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Registration Successful!</h2>
          <p className="text-muted-foreground mb-6">
            {isLoggingIn ? 'Logging you in and redirecting to your dashboard...' : 'Your account has been created. Logging you in...'}
          </p>
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-background overflow-hidden py-10">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] opacity-20"></div>
        <DotPattern className="opacity-[0.3]" size="md" fadeStyle="circle" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create an account</h1>
          <p className="text-muted-foreground mt-2">
            Join our platform as a candidate and start your journey
          </p>
        </div>

        <GlassCard className="p-8 shadow-xl border-t border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          {displayError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <span className="text-sm text-destructive font-medium">{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-foreground ml-1">First Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="pl-10 bg-background/50"
                    placeholder="John"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-foreground ml-1">Last Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="pl-10 bg-background/50"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="nationalId" className="text-sm font-medium text-foreground ml-1">National ID</label>
                <div className="relative group">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="nationalId"
                    name="nationalId"
                    type="text"
                    value={formData.nationalId}
                    onChange={handleChange}
                    className="pl-10 bg-background/50"
                    placeholder="ID Number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="mobilePhone" className="text-sm font-medium text-foreground ml-1">Mobile Phone</label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="mobilePhone"
                    name="mobilePhone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.mobilePhone}
                    onChange={handleChange}
                    className="pl-10 bg-background/50"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-background/50"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 bg-background/50"
                    placeholder="••••••••"
                  />
                </div>
                <PasswordStrength password={formData.password} />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 bg-background/50"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start bg-muted/30 p-3 rounded-lg border border-border/50">
              <input
                type="checkbox"
                id="agreeToTerms"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-primary border-input rounded focus:ring-ring bg-background cursor-pointer"
              />
              <label htmlFor="agreeToTerms" className="ml-3 text-sm text-muted-foreground cursor-pointer select-none">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80 hover:underline transition-all">
                Sign in
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
