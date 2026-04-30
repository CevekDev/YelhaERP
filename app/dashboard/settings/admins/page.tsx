'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Users, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:      { label: 'Administrateur', color: 'bg-purple-100 text-purple-700' },
  ACCOUNTANT: { label: 'Comptable',      color: 'bg-blue-100 text-blue-700' },
  EMPLOYEE:   { label: 'Employé',        color: 'bg-gray-100 text-gray-700' },
  VIEWER:     { label: 'Lecteur',        color: 'bg-slate-100 text-slate-600' },
}

export default function AdminsSettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' })

  const fetchUsers = () => {
    fetch('/api/admins').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setUsers(d.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Compte créé pour ${form.name}`)
      setOpen(false)
      setForm({ name: '', email: '', password: '', role: 'EMPLOYEE' })
      fetchUsers()
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Erreur lors de la création')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le compte de ${name} ?`)) return
    const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Compte supprimé'); fetchUsers() }
    else toast.error('Erreur lors de la suppression')
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <Breadcrumb items={[{ label: 'Paramètres', href: '/dashboard/settings' }, { label: 'Collaborateurs' }]} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Collaborateurs & accès</h1>
            <p className="text-muted-foreground text-sm">Gérez les comptes de vos employés et collaborateurs</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un compte collaborateur</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nom complet *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Prénom Nom" required />
              </div>
              <div className="space-y-1.5">
                <Label>Email (identifiant de connexion) *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="collaborateur@entreprise.dz" required />
              </div>
              <div className="space-y-1.5">
                <Label>Mot de passe *</Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({...f, password: e.target.value}))}
                    placeholder="Minimum 6 caractères"
                    required minLength={6}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Rôle *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({...f, role: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrateur — accès complet</SelectItem>
                    <SelectItem value="ACCOUNTANT">Comptable — facturation & compta</SelectItem>
                    <SelectItem value="EMPLOYEE">Employé — lecture & saisie</SelectItem>
                    <SelectItem value="VIEWER">Lecteur — lecture seule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                Le collaborateur se connecte avec cet email et mot de passe via l'onglet <strong>"Accès collaborateur"</strong> sur la page de connexion.
              </div>
              <Button type="submit" className="w-full" disabled={saving || !form.name || !form.email || !form.password}>
                {saving ? 'Création...' : 'Créer le compte'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun collaborateur ajouté</p>
            <p className="text-xs mt-1">Ajoutez des employés, comptables ou administrateurs</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nom</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Rôle</th>
                <th className="text-left px-4 py-3 font-medium">Ajouté le</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const role = ROLE_LABELS[u.role] ?? { label: u.role, color: 'bg-gray-100 text-gray-700' }
                return (
                  <tr key={u.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${role.color}`}>{role.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString('fr-DZ')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(u.id, u.name)} className="text-destructive hover:opacity-70 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
