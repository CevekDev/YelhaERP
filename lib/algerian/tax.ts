// ══════════════════════════════════════════════════════════════════
// Fiscalité algérienne — Mise à jour 2026
// Sources : CTCA, CIDTA, CNAS, CASNOS
// ══════════════════════════════════════════════════════════════════

// ── TVA ──────────────────────────────────────────────────────────
export const TVA_STANDARD = 19   // Taux normal — biens courants, BTP, commerce, importations
export const TVA_REDUCED  = 9    // Taux réduit — aliments de base, médicaments, AADL, agri.
export const TVA_ZERO     = 0    // Exonéré — exportations, médical, bancaire, enseignement

export type TVAType = 'standard' | 'reduced' | 'exempt'

export const TVA_RATES: Record<TVAType, number> = {
  standard: TVA_STANDARD,
  reduced:  TVA_REDUCED,
  exempt:   TVA_ZERO,
}

// Assujettissement obligatoire si CA > 240 M DA/an
export const TVA_THRESHOLD_DA = 240_000_000

export function calculateTVA(ht: number, rate = TVA_STANDARD): number {
  return Math.round(ht * (rate / 100) * 100) / 100
}

export function htToTtc(ht: number, rate = TVA_STANDARD): number {
  return Math.round((ht + calculateTVA(ht, rate)) * 100) / 100
}

export function ttcToHt(ttc: number, rate = TVA_STANDARD): number {
  return Math.round((ttc / (1 + rate / 100)) * 100) / 100
}

// G50 — TVA nette = (collectée 19% + collectée 9%) - (déductible achats + importations)
export interface G50Inputs {
  caHtStandard: number   // CA HT soumis à 19%
  caHtReduced:  number   // CA HT soumis à 9%
  tvaDeductible: number  // TVA sur achats locaux + importations
}

export interface G50Result {
  tvaCollecteeStandard: number
  tvaCollecteeReduced:  number
  tvaCollecteeTotale:   number
  tvaDeductible:        number
  tvaNette:             number   // à payer (peut être négatif = crédit)
  reportable:           boolean  // si négatif, reportable sur prochain mois
  penaliteRetard10:     number   // 10% si retard
}

export function calculateG50(inputs: G50Inputs): G50Result {
  const std = calculateTVA(inputs.caHtStandard, TVA_STANDARD)
  const red = calculateTVA(inputs.caHtReduced, TVA_REDUCED)
  const totale = std + red
  const nette = totale - inputs.tvaDeductible
  return {
    tvaCollecteeStandard: std,
    tvaCollecteeReduced:  red,
    tvaCollecteeTotale:   totale,
    tvaDeductible:        inputs.tvaDeductible,
    tvaNette:             Math.round(nette * 100) / 100,
    reportable:           nette < 0,
    penaliteRetard10:     nette > 0 ? Math.round(nette * 0.10 * 100) / 100 : 0,
  }
}

// ── TAP — Taxe sur l'Activité Professionnelle ────────────────────
export const TAP_RATES = {
  production:  0.01,   // 1% biens
  services:    0.02,   // 2% BTP, commerce, services, transport marchandises
}

export function calculateTAP(caHt: number, type: 'production' | 'services'): number {
  return Math.round(caHt * TAP_RATES[type] * 100) / 100
}

// ── IRG — Barème 2026 (annuel) ───────────────────────────────────
// Source : CIDTA art. 1-34 — tranche par tranche (progressif)
export const IRG_TRANCHES_2026 = [
  { min: 0,           max: 240_000,   rate: 0.00 },
  { min: 240_001,     max: 480_000,   rate: 0.23 },
  { min: 480_001,     max: 960_000,   rate: 0.27 },
  { min: 960_001,     max: 1_920_000, rate: 0.30 },
  { min: 1_920_001,   max: 3_840_000, rate: 0.33 },
  { min: 3_840_001,   max: Infinity,  rate: 0.35 },
]

export const IRG_MIN_DA = 10_000   // Minimum si résultat < seuil
export const IRG_SALAIRE_ABATTEMENT = 0.10  // Abattement 10% sur salaires
export const SNMG_MENSUEL = 20_000  // DA/mois

export function calculateIRGAnnuel(revenuImposableAnnuel: number): number {
  if (revenuImposableAnnuel <= 0) return 0
  let impot = 0
  for (const t of IRG_TRANCHES_2026) {
    if (revenuImposableAnnuel <= t.min) break
    const imposable = Math.min(revenuImposableAnnuel, t.max) - t.min
    impot += imposable * t.rate
  }
  return Math.max(Math.round(impot), revenuImposableAnnuel > 240_000 ? IRG_MIN_DA : 0)
}

// IRG mensuel sur salaire (avec abattement 10%)
export function calculateIRGSalaire(brut: number): number {
  const annuel = brut * 12
  const apresAbattement = annuel * (1 - IRG_SALAIRE_ABATTEMENT)
  const irgAnnuel = calculateIRGAnnuel(apresAbattement)
  return Math.round(irgAnnuel / 12)
}

// ── CNAS ─────────────────────────────────────────────────────────
export const CNAS_EMPLOYEE_RATE  = 0.09   // Salarié : 9% (maladie 1.5%, retraite 6.75%, chômage 0.5%, retraite anticipée 0.25%)
export const CNAS_EMPLOYER_RATE  = 0.26   // Employeur : 26% (maladie 12.5%, retraite ~11%, AT/MP 1.25%, chômage 1.5%, autres ~0.5%)
export const CNAS_TOTAL_RATE     = 0.35   // Total charges sociales

export function calculateCNAS(brut: number) {
  return {
    salarie:  Math.round(brut * CNAS_EMPLOYEE_RATE),
    employeur: Math.round(brut * CNAS_EMPLOYER_RATE),
    total:     Math.round(brut * CNAS_TOTAL_RATE),
  }
}

// ── CASNOS (indépendants / auto-entrepreneurs) ───────────────────
export const CASNOS_RATE    = 0.15            // 15% du revenu déclaré
export const CASNOS_MIN_DA  = 36_000          // Min annuel (SNMG × 12 × 15%)
export const CASNOS_QUARTERLY_MIN = 9_000     // Min trimestriel

export function calculateCASNOS(revenuAnnuel: number): number {
  const calc = Math.round(revenuAnnuel * CASNOS_RATE)
  return Math.max(calc, CASNOS_MIN_DA)
}

// ── IBS — Impôt sur les Bénéfices des Sociétés ──────────────────
export const IBS_RATE_NORMAL  = 0.26   // 26% activités générales
export const IBS_RATE_REDUCED1 = 0.19  // 19% activités spécifiques
export const IBS_RATE_REDUCED2 = 0.23  // 23% activités spécifiques
export const IBS_ACOMPTE_RATE = 0.30   // 30% de l'IBS N-1

export function calculateIBS(benefice: number, rate = IBS_RATE_NORMAL): number {
  if (benefice <= 0) return 0
  return Math.round(benefice * rate)
}

// ── Auto-Entrepreneurs (ANAE) ────────────────────────────────────
export const AE_IFU_RATES = { min: 0.005, max: 0.02 }  // IFU 0.5% à 2%
export const AE_TVA_THRESHOLD = 5_000_000  // Exon TVA si CA < 5M DA
export const AE_CASNOS_ANNUAL_MIN = 36_000
export const AE_DECLARATION_DEADLINE_DAY = 31  // 31 janvier

// ── Calendrier fiscal 2026 ───────────────────────────────────────
export interface DeadlineEntry {
  label: string
  date: Date
  formulaire: string
  type: 'G50' | 'CNAS' | 'IBS' | 'IRG' | 'BILAN'
}

export function getFiscalCalendar2026(): DeadlineEntry[] {
  return [
    { label: 'G50 (TVA, TAP, IRG prov.) — mensuel', date: new Date(2026, 0, 20), formulaire: 'G50', type: 'G50' },
    { label: 'DAS CNAS annuelle', date: new Date(2026, 2, 31), formulaire: 'CNAS', type: 'CNAS' },
    { label: '1er acompte IBS/IRG', date: new Date(2026, 2, 20), formulaire: 'G50A', type: 'IBS' },
    { label: '2e acompte IBS', date: new Date(2026, 5, 20), formulaire: 'G50A', type: 'IBS' },
    { label: 'Bilan + IBS/IRG annuel', date: new Date(2026, 3, 30), formulaire: 'Série G + SCF', type: 'BILAN' },
    { label: '3e acompte IBS + solde', date: new Date(2026, 10, 20), formulaire: 'G50A', type: 'IBS' },
  ]
}

// ── Échéances mensuelles ─────────────────────────────────────────
export function getG50Deadline(year: number, month: number): Date {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear  = month === 12 ? year + 1 : year
  return new Date(nextYear, nextMonth - 1, 20)
}

export function getCNASDeadline(year: number, month: number): Date {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear  = month === 12 ? year + 1 : year
  return new Date(nextYear, nextMonth - 1, 30)
}

// ── Paie complète ─────────────────────────────────────────────────
export interface PayrollResult {
  brut:          number
  cnasEmployee:  number
  cnasEmployer:  number
  irg:           number
  net:           number
  coutTotal:     number  // brut + CNAS employeur
}

export function calculatePayroll(brut: number): PayrollResult {
  const cnas = calculateCNAS(brut)
  const brutApresAbattement = brut * (1 - IRG_SALAIRE_ABATTEMENT)
  const irgMensuel = calculateIRGAnnuel(brutApresAbattement * 12) / 12
  const net = brut - cnas.salarie - Math.round(irgMensuel)
  return {
    brut,
    cnasEmployee: cnas.salarie,
    cnasEmployer: cnas.employeur,
    irg:          Math.round(irgMensuel),
    net:          Math.round(net),
    coutTotal:    brut + cnas.employeur,
  }
}

// ── Plan comptable SCF ────────────────────────────────────────────
export const SCF_ACCOUNTS = {
  '101': 'Capital social',
  '106': 'Réserves',
  '120': 'Résultat net - bénéfice',
  '129': 'Résultat net - perte',
  '211': 'Terrains',
  '213': 'Constructions',
  '215': 'Installations techniques',
  '218': 'Autres immobilisations corporelles',
  '300': 'Stocks de marchandises',
  '310': 'Matières premières',
  '400': 'Fournisseurs',
  '401': 'Fournisseurs - effets à payer',
  '411': 'Clients',
  '412': 'Clients - effets à recevoir',
  '421': 'Personnel - rémunérations dues',
  '431': 'Sécurité sociale - CNAS',
  '441': 'État - impôts sur les bénéfices (IBS)',
  '444': 'État - IRG',
  '445': 'État - TVA',
  '4452': 'TVA collectée (19%)',
  '4453': 'TVA collectée (9%)',
  '4455': 'TVA déductible',
  '447': 'État - TAP',
  '512': 'Banques comptes courants',
  '530': 'Caisse',
  '600': 'Achats de marchandises',
  '621': 'Personnel extérieur',
  '641': 'Rémunérations du personnel',
  '645': 'Charges de sécurité sociale (CNAS)',
  '671': 'Charges exceptionnelles',
  '700': 'Ventes de marchandises',
  '706': 'Prestations de services',
  '707': 'Ventes de produits finis',
  '771': 'Produits exceptionnels',
} as const
