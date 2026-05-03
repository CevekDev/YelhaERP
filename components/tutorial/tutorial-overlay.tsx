'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { TUTORIALS, TutorialStep } from '@/lib/tutorials'

export function TutorialOverlay({ pageKey }: { pageKey: string }) {
  const [steps, setSteps] = useState<TutorialStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const { locale } = useT()

  useEffect(() => {
    const storageKey = `yelha_tutorial_${pageKey}`
    if (localStorage.getItem(storageKey)) return
    const pageTutorial = TUTORIALS[pageKey]
    if (!pageTutorial || pageTutorial.length === 0) return
    setSteps(pageTutorial)
    setTimeout(() => setVisible(true), 800)
  }, [pageKey])

  useEffect(() => {
    if (!visible || steps.length === 0) return
    const step = steps[currentStep]
    const el = document.querySelector(step.target)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep, visible, steps])

  function complete() {
    localStorage.setItem(`yelha_tutorial_${pageKey}`, '1')
    setVisible(false)
  }

  function next() {
    if (currentStep < steps.length - 1) setCurrentStep(c => c + 1)
    else complete()
  }

  function prev() {
    if (currentStep > 0) setCurrentStep(c => c - 1)
  }

  if (!visible || steps.length === 0) return null

  const step = steps[currentStep]
  const title = step.title[locale as 'fr' | 'en' | 'ar'] ?? step.title.fr
  const desc = step.description[locale as 'fr' | 'en' | 'ar'] ?? step.description.fr

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] pointer-events-none">
        <div className="absolute inset-0 bg-black/60" />
        {targetRect && (
          <div
            className="absolute bg-transparent rounded-lg ring-4 ring-primary ring-offset-2 transition-all duration-300"
            style={{
              top:    targetRect.top    - 4,
              left:   targetRect.left   - 4,
              width:  targetRect.width  + 8,
              height: targetRect.height + 8,
            }}
          />
        )}
      </div>

      {/* Step card */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[201] w-full max-w-sm px-4">
        <div className="bg-background border border-border rounded-2xl shadow-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Étape {currentStep + 1} / {steps.length}
              </div>
              <h3 className="font-bold text-base">{title}</h3>
            </div>
            <button onClick={complete} className="text-muted-foreground hover:text-foreground p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="w-full bg-muted rounded-full h-1 mb-3">
            <div
              className="bg-primary rounded-full h-1 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <p className={cn('text-sm text-muted-foreground mb-4 leading-relaxed', locale === 'ar' && 'text-right')}>{desc}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={complete}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {locale === 'ar' ? 'تخطي' : locale === 'en' ? 'Skip' : 'Passer'}
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {locale === 'ar' ? 'السابق' : locale === 'en' ? 'Previous' : 'Précédent'}
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors font-medium"
              >
                {currentStep < steps.length - 1
                  ? (locale === 'ar' ? 'التالي' : locale === 'en' ? 'Next' : 'Suivant')
                  : (locale === 'ar' ? 'تم' : locale === 'en' ? 'Done' : 'Terminer')}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
