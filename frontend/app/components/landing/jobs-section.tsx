"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPublishedJobs } from '@/app/services/recruitment'
import { JobRequisition } from '@/app/types/recruitment'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { GlassCard } from '@/app/components/ui/glass-card'
import { LoadingSpinner } from '@/app/components/ui/loading-spinner'
import { ArrowRight, Briefcase, MapPin, Clock, Building2 } from 'lucide-react'

export function JobsSection() {
  const [jobs, setJobs] = useState<JobRequisition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getPublishedJobs()
        // Get top 3 jobs
        setJobs(data.slice(0, 3))
      } catch (err) {
        console.error('Error fetching jobs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [])

  if (loading) {
    return (
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </section>
    )
  }

  if (jobs.length === 0) {
    return null // Don't show section if no jobs
  }

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Join Our Team</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Open Positions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore exciting career opportunities and be part of our growing team
            </p>
          </div>

          {/* Featured Jobs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {jobs.map((job) => {
              const jobId = job._id || job.id || job.requisitionId
              return (
                <GlassCard key={jobId} variant="hover" className="p-6 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {job.employmentType || 'Full-time'}
                      </Badge>
                      {job.numberOfOpenings && (
                        <span className="text-xs text-muted-foreground">
                          {job.numberOfOpenings} {job.numberOfOpenings === 1 ? 'opening' : 'openings'}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">
                      {job.title || job.templateTitle || 'Position'}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      {job.department && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>{job.department}</span>
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                      )}
                    </div>

                    {job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {job.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border/50">
                    <Link href={`/careers/${jobId}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/careers/${jobId}/apply`} className="flex-1">
                      <Button className="w-full" size="sm">
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                </GlassCard>
              )
            })}
          </div>

          {/* View All Jobs CTA */}
          <div className="text-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/careers">
                View All Open Positions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

