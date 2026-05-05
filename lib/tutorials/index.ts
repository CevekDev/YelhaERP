export type TutorialStep = {
  target: string
  title: { fr: string; en: string; ar: string }
  description: { fr: string; en: string; ar: string }
  position: 'top' | 'bottom' | 'left' | 'right'
}

export const TUTORIALS: Record<string, TutorialStep[]> = {

  // ── Factures ────────────────────────────────────────────────
  invoices: [
    {
      target: '[data-tutorial="new-invoice"]',
      title: { fr: 'Créer une facture', en: 'Create an invoice', ar: 'إنشاء فاتورة' },
      description: {
        fr: 'Cliquez ici pour créer une nouvelle facture client. Vous pouvez choisir entre une facture standard, simplifiée ou proforma.',
        en: 'Click here to create a new customer invoice. Choose between standard, simplified or proforma invoice.',
        ar: 'انقر هنا لإنشاء فاتورة عميل جديدة. يمكنك الاختيار بين فاتورة عادية أو مبسطة أو مبدئية.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="invoice-filters"]',
      title: { fr: 'Filtrer les factures', en: 'Filter invoices', ar: 'تصفية الفواتير' },
      description: {
        fr: 'Filtrez par statut (brouillon, envoyée, payée, en retard) pour retrouver rapidement vos factures.',
        en: 'Filter by status (draft, sent, paid, overdue) to quickly find your invoices.',
        ar: 'صفّ حسب الحالة للعثور على فواتيرك بسرعة.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="invoice-export"]',
      title: { fr: 'Exporter en PDF', en: 'Export to PDF', ar: 'تصدير إلى PDF' },
      description: {
        fr: 'Téléchargez vos factures en PDF pour les envoyer à vos clients par email ou les imprimer.',
        en: 'Download your invoices as PDF to send to customers by email or print them.',
        ar: 'قم بتنزيل فواتيرك بصيغة PDF لإرسالها للعملاء.',
      },
      position: 'bottom',
    },
  ],

  // ── Devis ───────────────────────────────────────────────────
  quotes: [
    {
      target: '[data-tutorial="new-quote"]',
      title: { fr: 'Créer un devis', en: 'Create a quote', ar: 'إنشاء عرض سعر' },
      description: {
        fr: 'Créez un devis à envoyer à votre client. Une fois accepté, convertissez-le en facture en un clic.',
        en: 'Create a quote to send to your client. Once accepted, convert it to an invoice in one click.',
        ar: 'أنشئ عرض سعر لإرساله لعميلك. بعد الموافقة، حوّله إلى فاتورة بنقرة واحدة.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="quote-status"]',
      title: { fr: 'Statuts des devis', en: 'Quote statuses', ar: 'حالات عروض الأسعار' },
      description: {
        fr: 'Filtrez vos devis par statut : brouillon, envoyé, accepté ou refusé. Suivez facilement vos opportunités commerciales.',
        en: 'Filter quotes by status: draft, sent, accepted or declined. Easily track your sales opportunities.',
        ar: 'صفّ عروضك حسب الحالة: مسودة، مرسل، مقبول أو مرفوض.',
      },
      position: 'bottom',
    },
  ],

  // ── Clients ─────────────────────────────────────────────────
  clients: [
    {
      target: '[data-tutorial="new-client"]',
      title: { fr: 'Ajouter un client', en: 'Add a client', ar: 'إضافة عميل' },
      description: {
        fr: 'Créez une fiche client avec ses informations fiscales (NIF, RC) pour vos factures officielles.',
        en: 'Create a client record with tax information (NIF, RC) for official invoices.',
        ar: 'أنشئ ملف عميل مع معلوماته الضريبية للفواتير الرسمية.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="client-search"]',
      title: { fr: 'Rechercher un client', en: 'Search a client', ar: 'البحث عن عميل' },
      description: {
        fr: 'Recherchez vos clients par nom, NIF ou téléphone pour accéder rapidement à leur fiche.',
        en: 'Search clients by name, NIF or phone to quickly access their profile.',
        ar: 'ابحث عن عملائك بالاسم أو رقم التعريف الضريبي أو الهاتف.',
      },
      position: 'bottom',
    },
  ],

  // ── Fournisseurs ─────────────────────────────────────────────
  suppliers: [
    {
      target: '[data-tutorial="new-supplier"]',
      title: { fr: 'Ajouter un fournisseur', en: 'Add a supplier', ar: 'إضافة مورد' },
      description: {
        fr: 'Enregistrez vos fournisseurs pour gérer vos achats, bons de commande et factures fournisseurs.',
        en: 'Register your suppliers to manage purchases, purchase orders and supplier invoices.',
        ar: 'سجّل مورديك لإدارة مشترياتك وأوامر الشراء وفواتير الموردين.',
      },
      position: 'bottom',
    },
  ],

  // ── Produits ─────────────────────────────────────────────────
  products: [
    {
      target: '[data-tutorial="new-product"]',
      title: { fr: 'Ajouter un produit', en: 'Add a product', ar: 'إضافة منتج' },
      description: {
        fr: 'Créez vos produits avec SKU, prix, TVA et stock initial. Ces produits apparaîtront dans vos factures.',
        en: 'Create products with SKU, price, VAT and initial stock. These will appear in your invoices.',
        ar: 'أنشئ منتجاتك مع رمز المنتج والسعر وضريبة القيمة المضافة والمخزون الأولي.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="stock-alert"]',
      title: { fr: 'Alerte de stock', en: 'Stock alert', ar: 'تنبيه المخزون' },
      description: {
        fr: 'Définissez un seuil d\'alerte pour être notifié quand le stock d\'un produit est trop bas.',
        en: 'Set an alert threshold to be notified when a product\'s stock runs low.',
        ar: 'حدد حد التنبيه ليتم إخطارك عند انخفاض مخزون المنتج.',
      },
      position: 'bottom',
    },
  ],

  // ── Stock ────────────────────────────────────────────────────
  stock: [
    {
      target: '[data-tutorial="new-movement"]',
      title: { fr: 'Enregistrer un mouvement', en: 'Record a movement', ar: 'تسجيل حركة مخزون' },
      description: {
        fr: 'Enregistrez une entrée (achat, retour) ou une sortie (vente, perte). Chaque mouvement met à jour le stock automatiquement.',
        en: 'Record an IN (purchase, return) or OUT (sale, loss) movement. Each movement auto-updates stock.',
        ar: 'سجّل حركة دخول (شراء، إرجاع) أو خروج (بيع، خسارة). كل حركة تحدث المخزون تلقائياً.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="stock-filter"]',
      title: { fr: 'Filtrer les mouvements', en: 'Filter movements', ar: 'تصفية الحركات' },
      description: {
        fr: 'Filtrez par type (entrée/sortie/ajustement) ou par produit pour analyser vos flux de stock.',
        en: 'Filter by type (in/out/adjustment) or product to analyze your stock flows.',
        ar: 'صفّ حسب النوع أو المنتج لتحليل حركات مخزونك.',
      },
      position: 'bottom',
    },
  ],

  // ── Achats ───────────────────────────────────────────────────
  purchases: [
    {
      target: '[data-tutorial="new-order"]',
      title: { fr: 'Créer un bon de commande', en: 'Create a purchase order', ar: 'إنشاء أمر شراء' },
      description: {
        fr: 'Créez un bon de commande fournisseur pour gérer vos achats. Il sera automatiquement lié à la réception et à la facture fournisseur.',
        en: 'Create a supplier purchase order to manage your purchases. It will be automatically linked to the receipt and supplier invoice.',
        ar: 'أنشئ أمر شراء من المورد لإدارة مشترياتك.',
      },
      position: 'bottom',
    },
  ],

  // ── POS / Caisse ──────────────────────────────────────────────
  pos: [
    {
      target: '[data-tutorial="open-session"]',
      title: { fr: 'Ouvrir la caisse', en: 'Open cash register', ar: 'فتح الصندوق' },
      description: {
        fr: 'Commencez par ouvrir une session de caisse en indiquant le fonds initial. Toutes vos ventes seront comptabilisées dans cette session.',
        en: 'Start by opening a cash session with the initial fund. All your sales will be recorded in this session.',
        ar: 'ابدأ بفتح جلسة صندوق مع الرصيد الأولي.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="product-search"]',
      title: { fr: 'Scanner un produit', en: 'Scan a product', ar: 'مسح منتج' },
      description: {
        fr: 'Scannez le code-barres ou tapez le nom/SKU du produit. Il s\'ajoute automatiquement au panier.',
        en: 'Scan the barcode or type the product name/SKU. It is automatically added to the cart.',
        ar: 'امسح الباركود أو اكتب اسم المنتج. سيُضاف تلقائياً إلى السلة.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="payment-methods"]',
      title: { fr: 'Mode de paiement', en: 'Payment method', ar: 'طريقة الدفع' },
      description: {
        fr: 'Choisissez Espèces pour un paiement immédiat avec calcul de la monnaie, ou Dette pour enregistrer une vente à crédit.',
        en: 'Choose Cash for immediate payment with change calculation, or Debt to record a credit sale.',
        ar: 'اختر نقداً للدفع الفوري مع حساب الباقي، أو ديناً لتسجيل بيع بالأجل.',
      },
      position: 'top',
    },
  ],

  // ── CRM ──────────────────────────────────────────────────────
  crm: [
    {
      target: '[data-tutorial="new-lead"]',
      title: { fr: 'Ajouter un lead', en: 'Add a lead', ar: 'إضافة عميل محتمل' },
      description: {
        fr: 'Enregistrez un prospect et suivez son avancement dans votre pipeline commercial (nouveau, contacté, qualifié, gagné/perdu).',
        en: 'Record a prospect and track their progress in your sales pipeline.',
        ar: 'سجّل عميلاً محتملاً وتابع تقدمه في خط مبيعاتك.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="pipeline-view"]',
      title: { fr: 'Vue pipeline', en: 'Pipeline view', ar: 'عرض خط الأنابيب' },
      description: {
        fr: 'Visualisez vos opportunités par stade de vente en mode kanban pour avoir une vue d\'ensemble de votre activité commerciale.',
        en: 'Visualize your opportunities by sales stage in kanban mode for an overview of your commercial activity.',
        ar: 'تصوّر فرصك حسب مرحلة البيع في وضع كانبان.',
      },
      position: 'bottom',
    },
  ],

  // ── E-commerce ───────────────────────────────────────────────
  ecommerce: [
    {
      target: '[data-tutorial="new-order"]',
      title: { fr: 'Ajouter une commande', en: 'Add an order', ar: 'إضافة طلب' },
      description: {
        fr: 'Créez une commande manuellement avec les informations du client, l\'adresse de livraison et le montant.',
        en: 'Manually create an order with customer info, delivery address and amount.',
        ar: 'أنشئ طلباً يدوياً مع بيانات العميل وعنوان التوصيل والمبلغ.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="order-status"]',
      title: { fr: 'Changer le statut', en: 'Change status', ar: 'تغيير الحالة' },
      description: {
        fr: 'Mettez à jour le statut de chaque commande (confirmée, expédiée, livrée, retournée…) pour suivre en temps réel.',
        en: 'Update the status of each order (confirmed, shipped, delivered, returned…) for real-time tracking.',
        ar: 'حدّث حالة كل طلب (مؤكد، مشحون، تم التوصيل، مُرجع…) للمتابعة الفورية.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="delivery-config"]',
      title: { fr: 'Configurer la livraison', en: 'Configure delivery', ar: 'إعداد التوصيل' },
      description: {
        fr: 'Ajoutez vos sociétés de livraison (Yalidine, Maystro…) ou vos livreurs indépendants pour automatiser le suivi.',
        en: 'Add your delivery companies (Yalidine, Maystro…) or independent drivers to automate tracking.',
        ar: 'أضف شركات التوصيل أو السائقين المستقلين لأتمتة التتبع.',
      },
      position: 'bottom',
    },
  ],

  // ── Abonnements ──────────────────────────────────────────────
  subscriptions: [
    {
      target: '[data-tutorial="new-sub"]',
      title: { fr: 'Créer un abonnement', en: 'Create a subscription', ar: 'إنشاء اشتراك' },
      description: {
        fr: 'Assignez un plan tarifaire à un client existant ou créez un nouveau client directement depuis ce formulaire.',
        en: 'Assign a pricing plan to an existing client or create a new client directly from this form.',
        ar: 'خصّص خطة تسعير لعميل موجود أو أنشئ عميلاً جديداً مباشرة من هذا النموذج.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="manage-plans"]',
      title: { fr: 'Gérer les plans', en: 'Manage plans', ar: 'إدارة الخطط' },
      description: {
        fr: 'Créez des plans avec un tarif, un intervalle (mensuel, annuel…) et une liste de fonctionnalités incluses.',
        en: 'Create plans with a price, interval (monthly, yearly…) and a list of included features.',
        ar: 'أنشئ خططاً بسعر وفترة (شهري، سنوي…) وقائمة بالميزات المضمّنة.',
      },
      position: 'bottom',
    },
  ],

  // ── RH / Paie ────────────────────────────────────────────────
  payroll: [
    {
      target: '[data-tutorial="new-employee"]',
      title: { fr: 'Ajouter un employé', en: 'Add an employee', ar: 'إضافة موظف' },
      description: {
        fr: 'Enregistrez vos employés avec leur poste, salaire de base et informations CNAS pour générer les fiches de paie.',
        en: 'Register your employees with their position, base salary and CNAS info to generate payslips.',
        ar: 'سجّل موظفيك مع منصبهم والراتب الأساسي ومعلومات الضمان الاجتماعي.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="generate-payroll"]',
      title: { fr: 'Générer les fiches de paie', en: 'Generate payslips', ar: 'إنشاء كشوف الرواتب' },
      description: {
        fr: 'Calculez automatiquement l\'IRG, les cotisations CNAS et le salaire net selon la législation algérienne.',
        en: 'Automatically calculate IRG, CNAS contributions and net salary according to Algerian law.',
        ar: 'احسب تلقائياً ضريبة الدخل واشتراكات الضمان الاجتماعي وصافي الراتب.',
      },
      position: 'bottom',
    },
  ],

  // ── Projets ──────────────────────────────────────────────────
  projects: [
    {
      target: '[data-tutorial="new-project"]',
      title: { fr: 'Créer un projet', en: 'Create a project', ar: 'إنشاء مشروع' },
      description: {
        fr: 'Créez un projet, associez-le à un client, définissez un budget et des dates. Suivez l\'avancement et les heures travaillées.',
        en: 'Create a project, link it to a client, set a budget and dates. Track progress and hours worked.',
        ar: 'أنشئ مشروعاً وربطه بعميل وحدد ميزانية وتواريخ. تتبع التقدم والساعات المنجزة.',
      },
      position: 'bottom',
    },
  ],

  // ── Production ───────────────────────────────────────────────
  production: [
    {
      target: '[data-tutorial="new-production"]',
      title: { fr: 'Ordre de fabrication', en: 'Production order', ar: 'أمر إنتاج' },
      description: {
        fr: 'Créez un ordre de fabrication basé sur une nomenclature (BOM). Le stock des matières premières sera automatiquement déduit.',
        en: 'Create a production order based on a bill of materials (BOM). Raw material stock will be automatically deducted.',
        ar: 'أنشئ أمر إنتاج بناءً على قائمة المواد. سيُخصم مخزون المواد الخام تلقائياً.',
      },
      position: 'bottom',
    },
  ],

  // ── Comptabilité ─────────────────────────────────────────────
  accounting: [
    {
      target: '[data-tutorial="new-entry"]',
      title: { fr: 'Saisir une écriture', en: 'Add a journal entry', ar: 'إدخال قيد محاسبي' },
      description: {
        fr: 'Enregistrez vos écritures comptables selon le Plan Comptable National (PCN) algérien. Débit et crédit doivent être équilibrés.',
        en: 'Record your accounting entries according to the Algerian National Chart of Accounts (PCN). Debit and credit must be balanced.',
        ar: 'سجّل قيودك المحاسبية وفق المخطط الوطني للمحاسبة الجزائري.',
      },
      position: 'bottom',
    },
  ],

  // ── Dépenses ─────────────────────────────────────────────────
  expenses: [
    {
      target: '[data-tutorial="new-expense"]',
      title: { fr: 'Ajouter une dépense', en: 'Add an expense', ar: 'إضافة مصروف' },
      description: {
        fr: 'Enregistrez vos dépenses professionnelles (carburant, repas, fournitures…) avec justificatif pour la comptabilité.',
        en: 'Record your business expenses (fuel, meals, supplies…) with receipts for accounting.',
        ar: 'سجّل نفقاتك المهنية مع الإيصالات للمحاسبة.',
      },
      position: 'bottom',
    },
  ],

  // ── Dashboard ────────────────────────────────────────────────
  dashboard: [
    {
      target: '[data-tutorial="kpi-revenue"]',
      title: { fr: 'Chiffre d\'affaires', en: 'Revenue', ar: 'رقم الأعمال' },
      description: {
        fr: 'Votre CA du mois en cours, calculé à partir de toutes les factures payées. Cliquez pour voir le détail.',
        en: 'Your current month\'s revenue, calculated from all paid invoices. Click to see details.',
        ar: 'إيراداتك للشهر الحالي محسوبة من جميع الفواتير المدفوعة.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="quick-actions"]',
      title: { fr: 'Actions rapides', en: 'Quick actions', ar: 'إجراءات سريعة' },
      description: {
        fr: 'Accédez directement aux actions les plus fréquentes : créer une facture, ajouter un client, enregistrer une dépense.',
        en: 'Access the most frequent actions directly: create an invoice, add a client, record an expense.',
        ar: 'وصول مباشر إلى الإجراءات الأكثر استخداماً: إنشاء فاتورة، إضافة عميل، تسجيل مصروف.',
      },
      position: 'bottom',
    },
  ],
}
