/**
 * Calculs de paie selon la législation algérienne
 * CNAS : Caisse Nationale des Assurances Sociales
 * IRG : Impôt sur le Revenu Global
 */

export const CNAS_EMPLOYEE_RATE = 0.09 // 9%
export const CNAS_EMPLOYER_RATE = 0.26 // 26%

export interface PayrollCalculation {
  baseSalary: number
  grossSalary: number
  cnasEmployee: number
  cnasEmployer: number
  taxableIncome: number
  irg: number
  netSalary: number
}

// Barème IRG mensuel progressif par tranches (DA) — décret 2022
const IRG_BRACKETS = [
  { min: 0,      max: 20000,   rate: 0 },
  { min: 20001,  max: 40000,   rate: 0.23 },
  { min: 40001,  max: 80000,   rate: 0.27 },
  { min: 80001,  max: 160000,  rate: 0.30 },
  { min: 160001, max: 320000,  rate: 0.33 },
  { min: 320001, max: Infinity, rate: 0.35 },
]

export function calculateIRG(taxableIncome: number): number {
  if (taxableIncome <= 20000) return 0

  let irg = 0
  for (const bracket of IRG_BRACKETS) {
    if (taxableIncome <= bracket.min) break
    const taxable = Math.min(taxableIncome, bracket.max) - bracket.min
    irg += taxable * bracket.rate
  }

  // Abattement salaire unique : 40% (min 1 000 DA, max 1 500 DA)
  const abattement = Math.min(Math.max(irg * 0.4, 1000), 1500)
  return Math.max(0, Math.round((irg - abattement) * 100) / 100)
}

export function calculatePayroll(baseSalary: number, allowances = 0): PayrollCalculation {
  const grossSalary = baseSalary + allowances

  const cnasEmployee = Math.round(grossSalary * CNAS_EMPLOYEE_RATE * 100) / 100
  const cnasEmployer = Math.round(grossSalary * CNAS_EMPLOYER_RATE * 100) / 100

  const taxableIncome = grossSalary - cnasEmployee
  const irg = calculateIRG(taxableIncome)

  const netSalary = Math.round((grossSalary - cnasEmployee - irg) * 100) / 100

  return {
    baseSalary,
    grossSalary,
    cnasEmployee,
    cnasEmployer,
    taxableIncome,
    irg,
    netSalary,
  }
}
