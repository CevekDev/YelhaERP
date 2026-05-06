import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'

// PUBLIC route — no auth required
export async function GET(
  req: NextRequest,
  { params }: { params: { tableToken: string } }
) {
  void req

  try {
    const table = await prisma.restaurantTable.findFirst({
      where: { qrToken: params.tableToken, isActive: true },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    })

    if (!table) return apiError('Table introuvable ou QR code invalide', 404)

    const companyId = table.companyId

    const [config, categories] = await Promise.all([
      prisma.restaurantConfig.findUnique({
        where: { companyId },
        select: {
          name: true,
          logo: true,
          address: true,
          phone: true,
          enableQrMenu: true,
        },
      }),
      prisma.menuCategory.findMany({
        where: { companyId, isActive: true, isAvailable: true },
        include: {
          items: {
            where: { isActive: true, isAvailable: true },
            select: {
              id: true,
              name: true,
              nameAr: true,
              description: true,
              imageUrl: true,
              price: true,
              taxRate: true,
              preparationTime: true,
              allergens: true,
              tags: true,
              loyaltyPoints: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    if (config && !config.enableQrMenu) {
      return apiError('Le menu QR n\'est pas activé pour ce restaurant', 403)
    }

    return apiSuccess({
      table: {
        id: table.id,
        number: table.number,
        capacity: table.capacity,
      },
      restaurant: {
        name: config?.name ?? table.company.name,
        logo: config?.logo ?? null,
        address: config?.address ?? null,
        phone: config?.phone ?? null,
      },
      categories,
    })
  } catch {
    return apiError('Erreur serveur', 500)
  }
}
