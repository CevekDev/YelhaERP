// SCF account mapping for expense categories (Plan Comptable Algérien)
export const EXPENSE_ACCOUNTS: Record<string, { code: string; label: string }> = {
  TRANSPORT:     { code: '624', label: 'Transport et déplacements' },
  REPAS:         { code: '625', label: 'Repas et réceptions' },
  HEBERGEMENT:   { code: '6251', label: 'Hébergement' },
  FOURNITURES:   { code: '606', label: 'Fournitures de bureau' },
  COMMUNICATION: { code: '626', label: 'Télécommunications' },
  MAINTENANCE:   { code: '615', label: 'Entretien et réparations' },
  PUBLICITE:     { code: '623', label: 'Publicité et marketing' },
  FORMATION:     { code: '6323', label: 'Formation du personnel' },
  HONORAIRES:    { code: '622', label: 'Honoraires' },
  AUTRE:         { code: '628', label: 'Autres charges' },
}
