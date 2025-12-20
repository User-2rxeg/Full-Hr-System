'use client'

import { LandingNavbar } from '@/app/components/landing/navbar'
import { HeroSection } from '@/app/components/landing/hero-section'
import { StatsSection } from '@/app/components/landing/stats-section'
import { FeaturesSection } from '@/app/components/landing/features-section'
import { JobsSection } from '@/app/components/landing/jobs-section'
import { CTASection } from '@/app/components/landing/cta-section'
import { LandingFooter } from '@/app/components/landing/footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <JobsSection />
        <CTASection />
      </main>

      <LandingFooter />
    </div>
  )
}
