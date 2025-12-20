'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getPublishedJobs } from '@/app/services/recruitment';
import { JobRequisition } from '@/app/types/recruitment';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { GlassCard } from '@/app/components/ui/glass-card';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { LandingNavbar } from '@/app/components/landing/navbar';
import { LandingFooter } from '@/app/components/landing/footer';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Clock, 
  DollarSign, 
  Filter,
  ArrowRight,
  Building2,
  X,
  CheckCircle2
} from 'lucide-react';
import { DotPattern } from '@/app/components/dot-pattern';

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    location: '',
    type: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublishedJobs();
      
      const validJobs = data.filter((job) => {
        if (!job._id && !job.id && !job.requisitionId) return false;
        if (!job.title && !job.templateTitle) return false;
        const openings = job.numberOfOpenings || job.openings || 0;
        if (openings <= 0) return false;
        if (job.expiryDate) {
          const expiry = new Date(job.expiryDate);
          if (expiry < new Date()) return false;
        }
        return true;
      });
      
      setJobs(validJobs);
    } catch (err: any) {
      setError(err.message || 'Failed to load job openings');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => Array.from(new Set(jobs.map((j) => j.department).filter(Boolean))), [jobs]);
  const locations = useMemo(() => Array.from(new Set(jobs.map((j) => j.location).filter(Boolean))), [jobs]);
  const types = useMemo(() => Array.from(new Set(jobs.map((j) => j.employmentType).filter(Boolean))), [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          job.title?.toLowerCase().includes(searchLower) ||
          job.department?.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.department && job.department !== filters.department) return false;
      if (filters.location && job.location !== filters.location) return false;
      if (filters.type && job.employmentType !== filters.type) return false;
      return true;
    });
  }, [jobs, searchTerm, filters]);

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return 'Competitive';
    const curr = currency || 'EGP';
    if (min && max) {
      return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
    }
    return `${(min || max)?.toLocaleString()} ${curr}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <LoadingSpinner size="lg" />
              <p className="text-lg text-muted-foreground">Loading opportunities...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNavbar />
      
      <main className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-20 pb-12">
        <div className="absolute inset-0 z-0">
          <DotPattern className="opacity-[0.15]" size="lg" fadeStyle="circle" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="flex items-center justify-center gap-3 text-primary font-black uppercase tracking-[0.3em] text-[10px] mb-2">
              <span className="w-10 h-[1.5px] bg-primary/40 rounded-full" /> Career Opportunities
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter leading-tight">
              Join Our Team
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover exciting opportunities and make an impact
            </p>
            <div className="flex items-center justify-center gap-6 pt-4">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {jobs.length} Open Positions
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Search Bar */}
          <GlassCard variant="strong" className="p-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search jobs by title, department, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-xl border-border/50 bg-background/50 focus:border-primary"
              />
            </div>
          </GlassCard>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-xl"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            {(filters.department || filters.location || filters.type) && (
              <Button
                variant="ghost"
                onClick={() => setFilters({ department: '', location: '', type: '' })}
                className="text-sm"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'position' : 'positions'} found
            </span>
          </div>

          {showFilters && (
            <GlassCard variant="strong" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-xl bg-background/50 focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-xl bg-background/50 focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  >
                    <option value="">All Locations</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Employment Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-xl bg-background/50 focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  >
                    <option value="">All Types</option>
                    {types.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Error Message */}
          {error && (
            <GlassCard variant="strong" className="p-6 border-destructive/20 bg-destructive/5">
              <p className="text-destructive mb-4">{error}</p>
              <div className="flex gap-3">
                <Button onClick={fetchJobs} variant="outline">
                  Retry
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Go to Home</Link>
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Job Listings */}
          {filteredJobs.length === 0 ? (
            <GlassCard variant="strong" className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2">No positions found</h3>
              <p className="text-muted-foreground mb-6">
                {jobs.length === 0
                  ? "We don't have any open positions at the moment. Check back soon!"
                  : 'Try adjusting your search or filters to find what you\'re looking for.'}
              </p>
              <div className="flex gap-3 justify-center">
                {(searchTerm || filters.department || filters.location || filters.type) && (
                  <Button onClick={() => {
                    setSearchTerm('');
                    setFilters({ department: '', location: '', type: '' });
                  }}>
                    Clear All Filters
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href="/">Go to Home</Link>
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredJobs.map((job) => {
                const jobId = job._id || job.id || job.requisitionId;
                return (
                  <GlassCard
                    key={jobId}
                    variant="hover"
                    className="p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-foreground mb-2 hover:text-primary transition-colors">
                              {job.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              {job.department && (
                                <span className="flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4" />
                                  {job.department}
                                </span>
                              )}
                              {job.location && (
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </span>
                              )}
                              {job.employmentType && (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4" />
                                  {job.employmentType}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {job.employmentType}
                          </Badge>
                        </div>

                        {job.description && (
                          <p className="text-muted-foreground line-clamp-2 text-sm">{job.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {job.salaryRange && (
                            <span className="flex items-center gap-1.5 text-foreground font-medium">
                              <DollarSign className="w-4 h-4 text-primary" />
                              {formatSalary(job.salaryRange.min, job.salaryRange.max, job.salaryRange.currency)}
                            </span>
                          )}
                          {job.numberOfOpenings && (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Briefcase className="w-4 h-4" />
                              {job.numberOfOpenings} {job.numberOfOpenings === 1 ? 'opening' : 'openings'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:min-w-[200px]">
                        <Link href={`/careers/${jobId}`} className="w-full">
                          <Button className="w-full rounded-xl">
                            View Details
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                        <Link href={`/careers/${jobId}/apply`} className="w-full">
                          <Button variant="outline" className="w-full rounded-xl">
                            Apply Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </section>
      </main>
      
      <LandingFooter />
    </div>
  );
}
