# YelhaERP — Design System MASTER

## Identité Visuelle

### Couleur Primaire
```
Yelha Green : #1D9E75
HSL        : 161° 69% 37%
Usage      : Boutons primaires, icônes actives, badges plan, highlights
```

### Palette complète
| Token       | Hex       | Usage                        |
|-------------|-----------|------------------------------|
| yelha-50    | #e8f8f3   | Backgrounds légers           |
| yelha-100   | #c4eddf   | Hover states, badges         |
| yelha-500   | #1D9E75   | Primaire                     |
| yelha-600   | #178860   | Hover boutons primaires      |
| yelha-700   | #11704d   | Textes de marque             |

### Couleurs sémantiques
| État       | Couleur    | Usage                        |
|------------|------------|------------------------------|
| Success    | emerald-500 | Paiements reçus, OK          |
| Warning    | amber-500  | Impayés, délais proches      |
| Danger     | red-500    | Dépassements, erreurs        |
| Info       | blue-500   | Notifications neutres        |

---

## Typographie

### Police principale
- **Inter** (latin, latin-ext) — Import Google Fonts
- Fallback : `system-ui, sans-serif`

### Police arabe (RTL)
- **Cairo** → **Tajawal** → `system-ui, sans-serif`

### Échelle
| Classe Tailwind | Taille | Usage                    |
|-----------------|--------|--------------------------|
| text-xs         | 12px   | Labels, badges, metadata |
| text-sm         | 14px   | Corps tableaux, inputs   |
| text-base       | 16px   | Corps standard           |
| text-lg         | 18px   | Titres section           |
| text-2xl        | 24px   | KPI valeurs              |
| text-3xl        | 30px   | Titres de page           |

---

## Layout

### Structure globale
```
┌─────────────────────────────────────────┐
│  Sidebar (240px fixe)   │  Main area    │
│  ─────────────────────  │  ─────────    │
│  Logo + Plan            │  Header 64px  │
│  Navigation items       │  ─────────    │
│  ─────────────────────  │  Content      │
│  Déconnexion            │  p-6          │
└─────────────────────────────────────────┘
```

### Breakpoints
- Mobile : sidebar masquée (hamburger)
- Tablet : 768px+ → sidebar overlay
- Desktop : 1024px+ → sidebar fixe

---

## Composants

### Boutons
```tsx
// Primaire
<Button>Action principale</Button>

// Secondaire
<Button variant="outline">Annuler</Button>

// Danger
<Button variant="destructive">Supprimer</Button>
```

### Cards KPI
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">Titre</CardTitle>
    <div className="p-2 rounded-lg bg-yelha-50">
      <Icon className="h-4 w-4 text-yelha-600" />
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold da-amount">1 500 000 DA</p>
    <p className="text-xs text-muted-foreground mt-1">sous-titre</p>
  </CardContent>
</Card>
```

### Montants
- Toujours utiliser `.da-amount` pour les valeurs monétaires
- Format : `1 500 000,00 DA` (espace comme séparateur de milliers, virgule décimale)
- Utiliser `formatDA()` ou `formatDACompact()` depuis `@/lib/algerian/format`

### Tableaux
- Toujours avec pagination pour > 20 lignes
- Cursor-based pagination pour les listes longues
- Colonnes minimales : sélectionner uniquement ce qui est affiché

---

## Statuts de facture (couleurs)

| Statut    | Badge variant | Label FR     |
|-----------|---------------|--------------|
| DRAFT     | secondary     | Brouillon    |
| SENT      | info          | Envoyée      |
| PAID      | success       | Payée        |
| PARTIAL   | warning       | Partielle    |
| OVERDUE   | destructive   | En retard    |
| CANCELLED | outline       | Annulée      |

---

## RTL (Arabe)

- Activer avec `dir="rtl"` sur le `<html>` ou le container
- La sidebar passe à droite automatiquement
- Police remplacée par Cairo/Tajawal
- Utiliser `start`/`end` au lieu de `left`/`right` dans les classes Tailwind quand possible

---

## Pre-Delivery Checklist

Avant de livrer chaque composant, vérifier :

- [ ] Responsive (mobile + desktop)
- [ ] Support RTL basique
- [ ] Formatage DA correct sur les montants
- [ ] Loading states sur les actions async
- [ ] Gestion d'état vide (empty state)
- [ ] Validation Zod côté serveur sur chaque route API
- [ ] `companyId` jamais lu du client, toujours de la session
- [ ] Rate limiting sur chaque route API
