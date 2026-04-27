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

/**
 * Barème IRG mensuel (DA) — décret 2022
 * Tranche : [min, max, taux, déduction fixe]
 */
const IRG_BRACKETS = [
  { min: 0,       max: 20000,  rate: 0,    deduction: 0 },
  { min: 20001,   max: 40000,  rate: 0.23, deduction: 4600 },
  { min: 40001,   max: 80000,  rate: 0.27, deduction: 6200 },
  { min: 80001,   max: 160000, rate: 0.30, deduction: 8600 },
  { min: 160001,  max: 320000, rate: 0.33, deduction: 13400 },
  { min: 320001,  max: Infinity, rate: 0.35, deduction: 19800 },
]

export function calculateIRG(taxableIncome: number): number {
  const bracket = IRG_BRACKETS.find(b => taxableIncome >= b.min && taxableIncome <= b.max)
  if (!bracket || bracket.rate === 0) return 0
  const irg = taxableIncome * bracket.rate - bracket.deduction
  return Math.max(0, Math.round(irg * 100) / 100)
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
