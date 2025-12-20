'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getJobById } from '@/app/services/recruitment';
import { JobRequisition } from '@/app/types/recruitment';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { GlassCard } from '@/app/components/ui/glass-card';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { LandingNavbar } from '@/app/components/landing/navbar';
import { LandingFooter } from '@/app/components/landing/footer';
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  Clock, 
  DollarSign, 
  Briefcase,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function JobDetailsPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getJobById(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <LoadingSpinner size="lg" />
              <p className="text-lg text-muted-foreground">Loading job details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <GlassCard variant="strong" className="p-12 text-center max-w-2xl mx-auto border-destructive/20 bg-destructive/5">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive text-lg mb-6">{error || 'Job not found'}</p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline">
                <Link href="/careers">Back to Careers</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNavbar />
      
      <main className="flex-1">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/careers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Jobs
            </Link>
          </Button>
        </div>

        {/* Main Info Card */}
        <GlassCard variant="strong" className="p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-black text-foreground mb-4 tracking-tight">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {job.department && (
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                )}
                {job.employmentType && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {job.employmentType}
                  </span>
                )}
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm py-2 px-4">
              {job.numberOfOpenings} {job.numberOfOpenings === 1 ? 'Opening' : 'Openings'}
            </Badge>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-xl border border-border/50">
            {job.employmentType && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Employment Type</p>
                <p className="font-semibold text-foreground">{job.employmentType}</p>
              </div>
            )}
            {job.salaryRange && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Salary Range</p>
                <p className="font-semibold text-foreground">
                  {job.salaryRange.min.toLocaleString()} - {job.salaryRange.max.toLocaleString()} {job.salaryRange.currency}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Posted Date</p>
              <p className="font-semibold text-foreground">
                {new Date(job.postingDate || job.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Apply Button */}
          <Link href={`/careers/${jobId}/apply`} className="block">
            <Button className="w-full" size="lg">
              Apply for this Position
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </Link>
        </GlassCard>

        {/* Job Description */}
        {job.description && (
          <GlassCard variant="strong" className="p-8 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Job Description</h2>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{job.description}</p>
          </GlassCard>
        )}

        {/* Qualifications */}
        {job.qualifications && job.qualifications.length > 0 && (
          <GlassCard variant="strong" className="p-8 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Qualifications</h2>
            <ul className="space-y-2">
              {job.qualifications.map((qual, index) => (
                <li key={index} className="flex items-start text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span>{qual}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        {/* Skills Required */}
        {job.skills && job.skills.length > 0 && (
          <GlassCard variant="strong" className="p-8 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Apply CTA */}
        <GlassCard variant="strong" className="p-8 border-primary/20 bg-primary/5">
          <h2 className="text-lg font-bold text-foreground mb-2">Ready to Apply?</h2>
          <p className="text-muted-foreground mb-6">
            Submit your application to join our team
          </p>
          <Link href={`/careers/${jobId}/apply`}>
            <Button size="lg" className="w-full">
              Apply Now
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </Link>
        </GlassCard>
      </div>
      </main>
      
      <LandingFooter />
    </div>
  );
}
