'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { User } from 'lucide-react'

interface OrgNode {
  id: string
  firstName: string
  lastName: string
  position?: string
  department?: string
  reports: OrgNode[]
}

function OrgCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`bg-card border-2 rounded-lg p-3 text-center w-40 shadow-sm ${depth === 0 ? 'border-primary' : 'border-border'}`}>
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="font-medium text-sm">{node.firstName} {node.lastName}</div>
        {node.position && <div className="text-xs text-muted-foreground mt-0.5">{node.position}</div>}
        {node.department && <div className="text-xs text-primary mt-0.5">{node.department}</div>}
      </div>
      {node.reports.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-6 items-start">
            {node.reports.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center relative">
                {i === 0 && node.reports.length > 1 && <div className="absolute top-0 left-1/2 w-1/2 h-px bg-border" />}
                {i === node.reports.length - 1 && node.reports.length > 1 && <div className="absolute top-0 right-1/2 w-1/2 h-px bg-border" />}
                {node.reports.length > 1 && i > 0 && i < node.reports.length - 1 && <div className="absolute top-0 left-0 right-0 h-px bg-border" />}
                <div className="w-px h-6 bg-border" />
                <OrgCard node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const [tree, setTree] = useState<OrgNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hr/org-chart').then(r => r.json()).then(d => {
      setTree(d.data ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'RH', href: '/dashboard/hr/leaves' }, { label: 'Organigramme' }]} />
      <h1 className="text-2xl font-bold">Organigramme</h1>

      {tree.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun employé trouvé.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-12 justify-center p-8 min-w-max">
            {tree.map(root => <OrgCard key={root.id} node={root} />)}
          </div>
        </div>
      )}
    </div>
  )
}
