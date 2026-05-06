'use client'
import { HelpCircle, CheckCircle, Lightbulb } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MODULE_HELP } from '@/lib/help/modules-help'
import { useT } from '@/lib/i18n'

interface ModuleHelpProps {
  module: string
}

export function ModuleHelp({ module }: ModuleHelpProps) {
  const { locale } = useT()
  const help = MODULE_HELP[module]?.[locale as 'fr' | 'ar' | 'en'] ?? MODULE_HELP[module]?.fr
  if (!help) return null

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 flex items-center justify-center transition-colors flex-shrink-0"
          title="Aide sur ce module"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-bold">{help.title}</SheetTitle>
        </SheetHeader>
        <p className="text-slate-600 text-sm mb-5">{help.description}</p>

        {help.features.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" /> Fonctionnalités
            </h3>
            <ul className="space-y-1.5">
              {help.features.map((f, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span> {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {help.tips.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4" /> Conseils
            </h3>
            <ul className="space-y-1.5">
              {help.tips.map((tip, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="mt-0.5">💡</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <a href="/dashboard/settings/help" className="text-sm text-emerald-600 hover:underline">
            📚 Voir le manuel complet →
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
