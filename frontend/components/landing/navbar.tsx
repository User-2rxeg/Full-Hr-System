"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, Zap, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'

const navigationItems = [
  { name: 'Home', href: '/' },
  { name: 'Features', href: '#features' },
  { name: 'Modules', href: '#modules' },
  { name: 'Careers', href: '/careers', highlight: true },
  { name: 'Contact', href: '#contact' },
]

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { isAuthenticated, getDashboardRoute } = useAuth()
  const pathname = usePathname()

  // Handle smooth scrolling for hash links
  useEffect(() => {
    const handleHashClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href^="#"]')
      if (link) {
        const href = link.getAttribute('href')
        if (href && href.startsWith('#')) {
          e.preventDefault()
          const id = href.substring(1)
          const element = document.getElementById(id)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }
      }
    }

    document.addEventListener('click', handleHashClick)
    return () => document.removeEventListener('click', handleHashClick)
  }, [])

  const handleLinkClick = (href: string) => {
    if (href.startsWith('#')) {
      const id = href.substring(1)
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    setIsOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl">
              HR System
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.name}>
                {item.href.startsWith('#') ? (
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault()
                      handleLinkClick(item.href)
                    }}
                    className={navigationMenuTriggerStyle()}
                  >
                    {item.name}
                  </a>
                ) : (
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href}
                      className={`${navigationMenuTriggerStyle()} ${item.highlight ? 'text-primary font-semibold' : ''}`}
                    >
                      {item.name}
                      {item.highlight && (
                        <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[10px]">
                          <Briefcase className="w-3 h-3 mr-1" />
                          Jobs
                        </Badge>
                      )}
                    </Link>
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <Button asChild>
              <Link href={getDashboardRoute()}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader className="text-left border-b pb-4 mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Zap className="h-5 w-5" />
                  </div>
                  HR System
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4">
                {navigationItems.map((item) => (
                  item.href.startsWith('#') ? (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault()
                        handleLinkClick(item.href)
                      }}
                      className="text-lg font-medium hover:text-primary transition-colors py-2"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`text-lg font-medium hover:text-primary transition-colors py-2 ${item.highlight ? 'text-primary font-semibold' : ''}`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                      {item.highlight && (
                        <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[10px]">
                          <Briefcase className="w-3 h-3 mr-1" />
                          Jobs
                        </Badge>
                      )}
                    </Link>
                  )
                ))}
                <div className="border-t pt-4 mt-2 flex flex-col gap-2">
                  {isAuthenticated ? (
                    <Button className="w-full justify-start" asChild onClick={() => setIsOpen(false)}>
                      <Link href={getDashboardRoute()}>Return to Dashboard</Link>
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button className="w-full justify-start" asChild>
                        <Link href="/register">Get Started</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

