"use client"

import { Separator } from '@/app/components/ui/separator'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Github, Twitter, Linkedin, Youtube, Zap } from 'lucide-react'
import Link from 'next/link'

const footerLinks = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'Modules', href: '#modules' },
    { name: 'Career Vision', href: '#career-vision' },
    { name: 'Pricing', href: '#pricing' },
  ],
  company: [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '#about' },
    { name: 'Careers', href: '/careers' },
    { name: 'Blog', href: '#blog' },
    { name: 'Contact', href: '#contact' },
  ],
  resources: [
    { name: 'Help Center', href: '#help' },
    { name: 'Documentation', href: '#docs' },
    { name: 'Community', href: '#community' },
    { name: 'Partners', href: '#partners' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Security', href: '#security' },
    { name: 'Cookie Policy', href: '#cookies' },
  ],
}

const socialLinks = [
  { name: 'Twitter', href: '#', icon: Twitter },
  { name: 'GitHub', href: '#', icon: Github },
  { name: 'LinkedIn', href: '#', icon: Linkedin },
  { name: 'YouTube', href: '#', icon: Youtube },
]

export function LandingFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Newsletter Section */}
        <div className="mb-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">Stay updated</h3>
            <p className="text-muted-foreground mb-6">
              Get the latest updates, articles, and resources sent to your inbox weekly.
            </p>
            <div className="flex flex-col gap-2 max-w-md mx-auto sm:flex-row">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1"
              />
              <Button>Subscribe</Button>
            </div>
          </div>
        </div>

        <Separator className="mb-16" />

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-5 w-5" />
              </div>
              <span className="font-bold text-xl">HR System</span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              A comprehensive HR platform designed to help organizations discover, develop, and retain top talent.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((item) => (
                <li key={item.name}>
                  {item.href.startsWith('#') ? (
                    <a 
                      href={item.href} 
                      onClick={(e) => {
                        e.preventDefault()
                        const id = item.href.substring(1)
                        const element = document.getElementById(id)
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} HR System. All rights reserved.
          </p>
          <div className="flex gap-6">
            {footerLinks.legal.map((item) => (
              <a key={item.name} href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

