"use client"

import Link from 'next/link'
import { ArrowRight, Play, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DotPattern } from '@/components/dot-pattern'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background pt-24 sm:pt-36 pb-20 lg:pt-40 lg:pb-32">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] opacity-50 mix-blend-screen animate-pulse duration-[5000ms]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] opacity-40 mix-blend-screen"></div>
      </div>

      {/* Decorative Pattern */}
      <div className="absolute inset-0 z-0">
        <DotPattern className="opacity-[0.25]" size="lg" fadeStyle="circle" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-5xl text-center">
          {/* Announcement Badge */}
          <div className="mb-8 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Badge variant="outline" className="px-4 py-1.5 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors backdrop-blur-sm rounded-full text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary fill-primary/20" />
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Next-Gen HR Management System</span>
              <div className="mx-2 h-4 w-[1px] bg-border/50"></div>
              <span className="text-primary flex items-center gap-1">
                New Release <ArrowRight className="w-3 h-3" />
              </span>
            </Badge>
          </div>

          {/* Main Headline */}
          <div className="relative mb-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl flex flex-col items-center">
              <span>HR Management</span>
              <span className="relative mt-2">
                <span className="absolute -inset-2 bg-gradient-to-r from-primary to-blue-600 blur-2xl opacity-20 rounded-full"></span>
                <span className="relative bg-gradient-to-r from-primary via-blue-500 to-indigo-600 bg-clip-text text-transparent pb-2">
                  System
                </span>
              </span>
            </h1>
          </div>

          {/* Arabic Headline */}
          <h2 className="mb-10 text-3xl sm:text-5xl font-bold bg-gradient-to-r from-slate-600 via-slate-800 to-black dark:from-slate-400 dark:via-slate-200 dark:to-white bg-clip-text text-transparent leading-tight py-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 font-arabic">
              شايف نفسك فين بعد ٥ سنين؟
          </h2>

          {/* Subheading */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            Empower your organization to discover, develop, and retain top talent. Our comprehensive platform
            transforms how you manage the entire full employee lifecycle with intelligence and ease.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105" asChild>
              <Link href="/dashboard">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full backdrop-blur-sm bg-background/50 border-border/50 hover:bg-accent/50 transition-all hover:scale-105" asChild>
              <Link href="/careers">
                View Careers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14 px-8 text-lg rounded-full backdrop-blur-sm bg-background/50 border-border/50 hover:bg-accent/50 transition-all hover:scale-105"
              onClick={(e) => {
                e.preventDefault()
                const element = document.getElementById('features')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Hero Image/Visual */}
        <div className="mx-auto mt-20 max-w-6xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="relative group">
            {/* Top background glow effect */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-[80%] h-40 bg-primary/30 rounded-full blur-[80px] opacity-60"></div>

            <div className="relative rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-sm p-2 shadow-2xl ring-1 ring-white/10">
              <div className="relative rounded-xl overflow-hidden bg-background aspect-[16/9] shadow-inner border border-border/50">
                {/* This would be where an actual Dashboard screenshot goes. For now, a CSS mock representation */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
                  <div className="text-center p-12 transform group-hover:scale-105 transition-transform duration-700 ease-out">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary to-blue-600 shadow-xl shadow-primary/20 mb-6 text-white animate-bounce-slow">
                      <Star className="w-12 h-12 fill-white/20" />
                    </div>
                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Interactive Dashboard</h3>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">Experience the future of work with our state-of-the-art interface designed for clarity and speed.</p>

                    {/* Decorative elements simulating UI */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>
                  </div>
                </div>

                {/* Glass overlay reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
              </div>
            </div>

            {/* Bottom reflection */}
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-[90%] h-12 bg-black/20 blur-xl rounded-[100%]"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
