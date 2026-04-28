'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  clientId: z.string().min(1, 'Client requis'),
  issueDate: z.string().min(1),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    description: z.string().min(1, 'Description requise'),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0),
    taxRate: z.coerce.number().min(0).max(100),
  })).min(1, 'Au moins une ligne requise'),
})
type FormData = z.infer<typeof schema>

interface Client { id: string; name: string }

export default function NewQuotePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      issueDate: new Date().toISOString().split('T')[0],
      lines: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 19 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines = watch('lines')

  useEffect(() => {
    fetch('/api/clients?limit=100').then(r => r.json()).then(d => setClients(d.clients ?? []))
  }, [])

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)
  const tax = lines.reduce((s, l) => {
    const ht = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)
    return s + ht * ((Number(l.taxRate) || 0) / 100)
  }, 0)
  const total = subtotal + tax

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        issueDate: new Date(data.issueDate).toISOString(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : undefined,
      }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Erreur lors de la création'); return }
    const quote = await res.json()
    toast.success('Devis créé !')
    router.push(`/dashboard/quotes/${quote.id}`)
  }

  return (
    <div>
      <Header title="Nouveau devis" />
      <div className="p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/quotes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-2xl font-bold">Nouveau devis</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select onValueChange={v => setValue('clientId', v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Date d&apos;émission *</Label>
                <Input type="date" {...register('issueDate')} />
              </div>
              <div className="space-y-2">
                <Label>Date d&apos;expiration</Label>
                <Input type="date" {...register('expiryDate')} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input placeholder="Conditions, remarques..." {...register('notes')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lignes du devis</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, taxRate: 19 })}>
                <Plus className="h-4 w-4 mr-1" />Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qté</div>
                <div className="col-span-2 text-center">P.U. (DA)</div>
                <div className="col-span-2 text-center">TVA %</div>
                <div className="col-span-1" />
              </div>
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input placeholder="Description du produit/service" {...register(`lines.${i}.description`)} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.001" min="0" {...register(`lines.${i}.quantity`)} className="text-center" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="1" min="0" {...register(`lines.${i}.unitPrice`)} className="text-center" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="1" min="0" max="100" {...register(`lines.${i}.taxRate`)} className="text-center" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex flex-col items-end gap-1 pr-10 da-amount">
                <div className="flex justify-between w-48 text-sm">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span>{formatDA(subtotal)}</span>
                </div>
                <div className="flex justify-between w-48 text-sm">
                  <span className="text-muted-foreground">TVA</span>
                  <span>{formatDA(tax)}</span>
                </div>
                <div className="flex justify-between w-48 font-bold text-lg">
                  <span>Total TTC</span>
                  <span className="text-yelha-600">{formatDA(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer le devis
            </Button>
            <Link href="/dashboard/quotes"><Button type="button" variant="outline">Annuler</Button></Link>
          </div>
        </form>
      </div>
    </div>
  )
}
