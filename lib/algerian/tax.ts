/**
 * Utilitaires fiscaux algériens
 * TVA : Taxe sur la Valeur Ajoutée
 * G50 : Déclaration mensuelle TVA
 */

export const TVA_STANDARD = 19 // %
export const TVA_REDUCED = 9  // %
export const TVA_ZERO = 0

export function calculateTVA(ht: number, rate = TVA_STANDARD): number {
  return Math.round(ht * (rate / 100) * 100) / 100
}

export function htToTtc(ht: number, rate = TVA_STANDARD): number {
  return Math.round((ht + calculateTVA(ht, rate)) * 100) / 100
}

export function ttcToHt(ttc: number, rate = TVA_STANDARD): number {
  return Math.round((ttc / (1 + rate / 100)) * 100) / 100
}

// Échéances déclaratives algériennes
export function getG50Deadline(year: number, month: number): Date {
  // G50 : avant le 20 du mois suivant
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return new Date(nextYear, nextMonth - 1, 20)
}

export function getCNASDeadline(year: number, month: number): Date {
  // CNAS : avant le 30 du mois suivant
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return new Date(nextYear, nextMonth - 1, 30)
}

// Plan comptable SCF (Système Comptable Financier)
export const SCF_ACCOUNTS = {
  // Classe 1 — Comptes de capitaux
  '101': 'Capital social',
  '106': 'Réserves',
  '120': 'Résultat net - bénéfice',
  '129': 'Résultat net - perte',
  // Classe 2 — Comptes d\'immobilisations
  '211': 'Terrains',
  '213': 'Constructions',
  '215': 'Installations techniques',
  '218': 'Autres immobilisations corporelles',
  // Classe 3 — Comptes de stocks
  '300': 'Stocks de marchandises',
  '310': 'Matières premières',
  // Classe 4 — Comptes de tiers
  '400': 'Fournisseurs',
  '401': 'Fournisseurs - effets à payer',
  '411': 'Clients',
  '412': 'Clients - effets à recevoir',
  '421': 'Personnel - rémunérations dues',
  '431': 'Sécurité sociale',
  '441': 'État - impôts sur les bénéfices',
  '445': 'État - TVA',
  '4452': 'TVA collectée',
  '4455': 'TVA déductible',
  // Classe 5 — Comptes financiers
  '512': 'Banques comptes courants',
  '530': 'Caisse',
  // Classe 6 — Comptes de charges
  '600': 'Achats de marchandises',
  '621': 'Personnel extérieur',
  '641': 'Rémunérations du personnel',
  '645': 'Charges de sécurité sociale',
  '671': 'Charges exceptionnelles',
  // Classe 7 — Comptes de produits
  '700': 'Ventes de marchandises',
  '706': 'Prestations de services',
  '707': 'Ventes de produits finis',
  '771': 'Produits exceptionnels',
} as const
