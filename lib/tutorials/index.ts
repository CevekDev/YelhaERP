export type TutorialStep = {
  target: string
  title: { fr: string; en: string; ar: string }
  description: { fr: string; en: string; ar: string }
  position: 'top' | 'bottom' | 'left' | 'right'
}

export const TUTORIALS: Record<string, TutorialStep[]> = {
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
        ar: 'صفّ حسب الحالة (مسودة، مرسلة، مدفوعة، متأخرة) للعثور على فواتيرك بسرعة.',
      },
      position: 'bottom',
    },
    {
      target: '[data-tutorial="invoice-export"]',
      title: { fr: 'Exporter en PDF', en: 'Export to PDF', ar: 'تصدير إلى PDF' },
      description: {
        fr: 'Téléchargez vos factures en PDF pour les envoyer à vos clients par email ou les imprimer.',
        en: 'Download your invoices as PDF to send to customers by email or print them.',
        ar: 'قم بتنزيل فواتيرك بصيغة PDF لإرسالها للعملاء عبر البريد الإلكتروني أو طباعتها.',
      },
      position: 'bottom',
    },
  ],
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
  ],
  pos: [
    {
      target: '[data-tutorial="open-session"]',
      title: { fr: 'Ouvrir la caisse', en: 'Open cash register', ar: 'فتح الصندوق' },
      description: {
        fr: 'Commencez par ouvrir une session de caisse en indiquant le fonds initial. Toutes vos ventes seront comptabilisées dans cette session.',
        en: 'Start by opening a cash session with the initial fund. All your sales will be recorded in this session.',
        ar: 'ابدأ بفتح جلسة صندوق مع الرصيد الأولي. ستُسجَّل جميع مبيعاتك في هذه الجلسة.',
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
  ],
}
