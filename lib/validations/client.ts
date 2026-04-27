import { z } from 'zod'

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra',
  'Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret',
  'Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda',
  'Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',
  'MSila','Mascara','Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj',
  'Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela',
  'Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
  'Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar','Ouled Djellal',
  'Béni Abbès','In Salah','In Guezzam','Touggourt','Djanet','El MGhair',
  'El Meniaa',
]

export const clientSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  nif: z.string().max(20).optional().nullable(),
  nis: z.string().max(20).optional().nullable(),
  rc: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  wilaya: z.enum(WILAYAS as [string, ...string[]]).optional().nullable(),
  phone: z
    .string()
    .regex(/^(\+213|0)[5-7]\d{8}$/, 'Numéro de téléphone algérien invalide')
    .optional()
    .nullable(),
  email: z.string().email().optional().nullable(),
})

export const clientQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  wilaya: z.string().optional(),
  cursor: z.string().optional(),
})
