"use client"

import {
  BarChart3,
  Zap,
  Users,
  ArrowRight,
  Database,
  Package,
  Crown,
  Layout,
  Palette,
  TrendingUp,
  Briefcase,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'

const mainFeatures = [
  {
    icon: TrendingUp,
    title: 'Employee Development',
    description: 'Track growth trajectories and create personalized career paths for your talent.'
  },
  {
    icon: BarChart3,
    title: 'Performance Management',
    description: 'Structured appraisals and real-time performance tracking for continuous improvement.'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Foster teamwork with integrated communication and project management tools.'
  },
  {
    icon: Briefcase,
    title: 'Career Planning',
    description: 'Help employees visualize their 5-year career roadmap with guidance and milestones.'
  }
]

const secondaryFeatures = [
  {
    icon: Zap,
    title: 'Skill Development',
    description: 'Identify skill gaps and recommend training programs for growth.'
  },
  {
    icon: CheckCircle,
    title: 'Success Tracking',
    description: 'Monitor achievements and celebrate employee milestones.'
  },
  {
    icon: Database,
    title: 'Centralized Data',
    description: 'Secure repository for all employee-related information.'
  },
  {
    icon: Layout,
    title: 'Self-Service Portal',
    description: 'Empower employees to manage their own profiles and requests.'
  }
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Comprehensive Solutions</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything you need to manage your workforce
          </h2>
          <p className="text-lg text-muted-foreground">
            Our platform provides curated tools, templates, and workflows to help you build a professional HR environment faster than ever.
          </p>
        </div>

        {/* First Feature Section */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16 mb-24">
          {/* Left Content (was Image3D) - now a visual placeholder */}
          <div className="relative rounded-xl border bg-card shadow-xl overflow-hidden min-h-[400px] flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
             <div className="text-center p-8">
                <div className="mb-6 inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 text-primary animate-pulse">
                  <TrendingUp className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Growth & Development</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">Visualize career paths and track progress in real-time.</p>
             </div>
          </div>

          {/* Right Content */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Tools that accelerate growth
              </h3>
              <p className="text-muted-foreground text-base text-pretty">
                Our curated modules offer premium workflows designed to save time and ensure consistency across your organization.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {mainFeatures.map((feature, index) => (
                <li key={index} className="group hover:bg-accent/5 flex items-start gap-3 p-2 rounded-lg transition-colors">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium leading-none mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <Button variant="outline" asChild>
                <a href="#modules">
                  Explore All Modules <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Second Feature Section (Grid) */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {secondaryFeatures.map((feature, index) => (
            <Card key={index} className="bg-background/60 backdrop-blur-sm hover:bg-background hover:shadow-md transition-all">
              <CardHeader>
                <div className="mb-2 w-fit rounded-lg bg-primary/10 p-2 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

