"use client"

import React from 'react'
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer'

export function GlobalThemeCustomizer() {
  const [themeCustomizerOpen, setThemeCustomizerOpen] = React.useState(false)

  return (
    <>
      <ThemeCustomizerTrigger onClick={() => setThemeCustomizerOpen(true)} />
      <ThemeCustomizer open={themeCustomizerOpen} onOpenChange={setThemeCustomizerOpen} />
    </>
  )
}

