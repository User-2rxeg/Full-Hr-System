"use client"

import {
  Building2,
  Users,
  Activity,
  Headphones
} from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { DotPattern } from '@/app/components/dot-pattern'

const stats = [
  {
    icon: Building2,
    value: '500+',
    label: 'Companies',
    description: 'Trust our platform'
  },
  {
    icon: Users,
    value: '50K+',
    label: 'Employees',
    description: 'Managed daily'
  },
  {
    icon: Activity,
    value: '99.9%',
    label: 'Uptime',
    description: 'Enterprise reliability'
  },
  {
    icon: Headphones,
    value: '24/7',
    label: 'Support',
    description: 'Always here for you'
  }
]

export function StatsSection() {
  return (
    <section className="py-12 sm:py-16 relative">
      {/* Background with transparency */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/10" />
      <DotPattern className="opacity-50" size="md" fadeStyle="circle" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="text-center bg-background/60 backdrop-blur-sm border-border/50 py-0 hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {stat.value}
                  </h3>
                  <p className="font-semibold text-foreground">{stat.label}</p>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

