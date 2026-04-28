import { z } from 'zod'

export const registerSchema = z.object({
  name:        z.string().min(2).max(100).trim(),
  email:       z.string().email().toLowerCase().trim(),
  password:    z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128)
    .regex(/[A-Z]/, 'Doit contenir une majuscule')
    .regex(/[0-9]/, 'Doit contenir un chiffre'),
  companyName: z.string().min(2).max(200).trim(),
  phone:       z.string().min(9).max(20).regex(/^0[5-7]\d{8}$/, 'Numéro algérien invalide (ex: 0555123456)'),
  birthDate:   z.string().refine(d => {
    const date = new Date(d)
    if (isNaN(date.getTime())) return false
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return age >= 18 && age <= 100
  }, 'Vous devez avoir au moins 18 ans'),
})

export const loginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
