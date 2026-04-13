import Dexie, { type Table } from 'dexie';

// ─── Finance Types ───
export interface GLAccount {
  id?: number;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  currency: string;
  createdAt: Date;
}

export interface JournalEntry {
  id?: number;
  entryNumber: string;
  date: Date;
  description: string;
  status: 'draft' | 'posted' | 'reversed';
  createdAt: Date;
  totalDebit: number;
  totalCredit: number;
}

export interface JournalLine {
  id?: number;
  journalEntryId: number;
  glAccountId: number;
  debit: number;
  credit: number;
  description: string;
}

export interface APInvoice {
  id?: number;
  invoiceNumber: string;
  vendorId: number;
  date: Date;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  status: 'open' | 'partial' | 'paid' | 'overdue';
  description: string;
  createdAt: Date;
}

export interface ARInvoice {
  id?: number;
  invoiceNumber: string;
  customerName: string;
  date: Date;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  status: 'open' | 'partial' | 'paid' | 'overdue';
  description: string;
  createdAt: Date;
}

// ─── Procurement Types ───
export interface Vendor {
  id?: number;
  code: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  paymentTerms: string;
  status: 'active' | 'inactive' | 'blocked';
  createdAt: Date;
}

export interface PurchaseRequisition {
  id?: number;
  prNumber: string;
  requestor: string;
  department: string;
  date: Date;
  status: 'draft' | 'approved' | 'rejected' | 'converted';
  totalAmount: number;
  description: string;
  createdAt: Date;
}

export interface PRLine {
  id?: number;
  prId: number;
  materialId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: Date;
}

export interface PurchaseOrder {
  id?: number;
  poNumber: string;
  vendorId: number;
  prId?: number;
  date: Date;
  deliveryDate: Date;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'closed';
  totalAmount: number;
  description: string;
  createdAt: Date;
}

export interface POLine {
  id?: number;
  poId: number;
  materialId: number;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  totalPrice: number;
}

// ─── Materials Management Types ───
export interface Material {
  id?: number;
  code: string;
  name: string;
  description: string;
  category: string;
  uom: string;
  stockQuantity: number;
  reorderLevel: number;
  unitCost: number;
  storageLocation: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface GoodsMovement {
  id?: number;
  documentNumber: string;
  type: 'receipt' | 'issue';
  materialId: number;
  quantity: number;
  poId?: number;
  referenceDoc: string;
  storageLocation: string;
  date: Date;
  remarks: string;
  createdAt: Date;
}

// ─── Database ───
class ERPDatabase extends Dexie {
  glAccounts!: Table<GLAccount>;
  journalEntries!: Table<JournalEntry>;
  journalLines!: Table<JournalLine>;
  apInvoices!: Table<APInvoice>;
  arInvoices!: Table<ARInvoice>;
  vendors!: Table<Vendor>;
  purchaseRequisitions!: Table<PurchaseRequisition>;
  prLines!: Table<PRLine>;
  purchaseOrders!: Table<PurchaseOrder>;
  poLines!: Table<POLine>;
  materials!: Table<Material>;
  goodsMovements!: Table<GoodsMovement>;

  constructor() {
    super('ERPLiteDB');
    this.version(1).stores({
      glAccounts: '++id, code, type',
      journalEntries: '++id, entryNumber, status, date',
      journalLines: '++id, journalEntryId, glAccountId',
      apInvoices: '++id, invoiceNumber, vendorId, status',
      arInvoices: '++id, invoiceNumber, status',
      vendors: '++id, code, status',
      purchaseRequisitions: '++id, prNumber, status',
      prLines: '++id, prId, materialId',
      purchaseOrders: '++id, poNumber, vendorId, status',
      poLines: '++id, poId, materialId',
      materials: '++id, code, category, status',
      goodsMovements: '++id, documentNumber, type, materialId, poId',
    });
  }
}

export const db = new ERPDatabase();

// ─── Seed Data ───
export async function seedDatabase() {
  const accountCount = await db.glAccounts.count();
  if (accountCount > 0) return;

  // GL Accounts
  const accounts: Omit<GLAccount, 'id'>[] = [
    { code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', balance: 245000, currency: 'USD', createdAt: new Date() },
    { code: '1100', name: 'Accounts Receivable', type: 'asset', balance: 87500, currency: 'USD', createdAt: new Date() },
    { code: '1200', name: 'Inventory', type: 'asset', balance: 156000, currency: 'USD', createdAt: new Date() },
    { code: '1300', name: 'Prepaid Expenses', type: 'asset', balance: 12000, currency: 'USD', createdAt: new Date() },
    { code: '1500', name: 'Fixed Assets', type: 'asset', balance: 320000, currency: 'USD', createdAt: new Date() },
    { code: '2000', name: 'Accounts Payable', type: 'liability', balance: 64500, currency: 'USD', createdAt: new Date() },
    { code: '2100', name: 'Accrued Liabilities', type: 'liability', balance: 23000, currency: 'USD', createdAt: new Date() },
    { code: '2200', name: 'Short-term Loans', type: 'liability', balance: 50000, currency: 'USD', createdAt: new Date() },
    { code: '3000', name: 'Common Stock', type: 'equity', balance: 500000, currency: 'USD', createdAt: new Date() },
    { code: '3100', name: 'Retained Earnings', type: 'equity', balance: 125000, currency: 'USD', createdAt: new Date() },
    { code: '4000', name: 'Sales Revenue', type: 'revenue', balance: 412000, currency: 'USD', createdAt: new Date() },
    { code: '4100', name: 'Service Revenue', type: 'revenue', balance: 85000, currency: 'USD', createdAt: new Date() },
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', balance: 198000, currency: 'USD', createdAt: new Date() },
    { code: '5100', name: 'Salaries & Wages', type: 'expense', balance: 145000, currency: 'USD', createdAt: new Date() },
    { code: '5200', name: 'Rent Expense', type: 'expense', balance: 36000, currency: 'USD', createdAt: new Date() },
    { code: '5300', name: 'Utilities Expense', type: 'expense', balance: 8500, currency: 'USD', createdAt: new Date() },
    { code: '5400', name: 'Office Supplies', type: 'expense', balance: 4200, currency: 'USD', createdAt: new Date() },
    { code: '5500', name: 'Depreciation Expense', type: 'expense', balance: 24000, currency: 'USD', createdAt: new Date() },
  ];
  await db.glAccounts.bulkAdd(accounts);

  // Vendors
  const vendors: Omit<Vendor, 'id'>[] = [
    { code: 'V-1001', name: 'Apex Industrial Supply', contact: 'Robert Chen', email: 'rchen@apexsupply.com', phone: '+1-555-0101', address: '1200 Commerce Blvd', city: 'Houston', country: 'US', paymentTerms: 'Net 30', status: 'active', createdAt: new Date() },
    { code: 'V-1002', name: 'GlobalTech Components', contact: 'Maria Santos', email: 'msantos@globaltech.com', phone: '+1-555-0202', address: '450 Innovation Dr', city: 'San Jose', country: 'US', paymentTerms: 'Net 45', status: 'active', createdAt: new Date() },
    { code: 'V-1003', name: 'Nordic Raw Materials AG', contact: 'Erik Johansson', email: 'erik@nordicraw.eu', phone: '+49-30-555-0303', address: 'Industriestr. 88', city: 'Hamburg', country: 'DE', paymentTerms: 'Net 60', status: 'active', createdAt: new Date() },
    { code: 'V-1004', name: 'Pacific Logistics Corp', contact: 'James Wu', email: 'jwu@pacificlog.com', phone: '+1-555-0404', address: '789 Harbor Way', city: 'Long Beach', country: 'US', paymentTerms: 'Net 30', status: 'active', createdAt: new Date() },
    { code: 'V-1005', name: 'Meridian Office Solutions', contact: 'Sarah Thompson', email: 'sthompson@meridian.com', phone: '+1-555-0505', address: '321 Business Park', city: 'Chicago', country: 'US', paymentTerms: 'Net 15', status: 'inactive', createdAt: new Date() },
  ];
  await db.vendors.bulkAdd(vendors);

  // Materials
  const materials: Omit<Material, 'id'>[] = [
    { code: 'MAT-001', name: 'Steel Plate A36', description: 'Hot-rolled structural steel plate', category: 'Raw Materials', uom: 'KG', stockQuantity: 5200, reorderLevel: 1000, unitCost: 1.85, storageLocation: 'WH-A01', status: 'active', createdAt: new Date() },
    { code: 'MAT-002', name: 'Copper Wire 12AWG', description: 'Solid copper conductor wire', category: 'Raw Materials', uom: 'M', stockQuantity: 12000, reorderLevel: 3000, unitCost: 0.45, storageLocation: 'WH-A02', status: 'active', createdAt: new Date() },
    { code: 'MAT-003', name: 'Circuit Board PCB-X1', description: 'Multi-layer printed circuit board', category: 'Components', uom: 'EA', stockQuantity: 340, reorderLevel: 100, unitCost: 24.50, storageLocation: 'WH-B01', status: 'active', createdAt: new Date() },
    { code: 'MAT-004', name: 'Hydraulic Pump HP-200', description: 'Industrial hydraulic pump 200 PSI', category: 'Components', uom: 'EA', stockQuantity: 28, reorderLevel: 10, unitCost: 450.00, storageLocation: 'WH-C01', status: 'active', createdAt: new Date() },
    { code: 'MAT-005', name: 'Bearing SKF 6205', description: 'Deep groove ball bearing', category: 'Components', uom: 'EA', stockQuantity: 890, reorderLevel: 200, unitCost: 12.75, storageLocation: 'WH-B02', status: 'active', createdAt: new Date() },
    { code: 'MAT-006', name: 'Lubricant ISO VG 68', description: 'Industrial lubricant oil', category: 'Consumables', uom: 'L', stockQuantity: 450, reorderLevel: 100, unitCost: 3.20, storageLocation: 'WH-D01', status: 'active', createdAt: new Date() },
    { code: 'MAT-007', name: 'Safety Gloves XL', description: 'Cut-resistant work gloves', category: 'Consumables', uom: 'PAIR', stockQuantity: 200, reorderLevel: 50, unitCost: 8.50, storageLocation: 'WH-D02', status: 'active', createdAt: new Date() },
    { code: 'MAT-008', name: 'Aluminum Sheet 6061', description: '6061-T6 aluminum alloy sheet', category: 'Raw Materials', uom: 'KG', stockQuantity: 3100, reorderLevel: 800, unitCost: 3.40, storageLocation: 'WH-A03', status: 'active', createdAt: new Date() },
  ];
  await db.materials.bulkAdd(materials);

  // Journal Entries
  const journalEntries: Omit<JournalEntry, 'id'>[] = [
    { entryNumber: 'JE-2024-001', date: new Date('2024-01-15'), description: 'Monthly rent payment', status: 'posted', createdAt: new Date(), totalDebit: 3000, totalCredit: 3000 },
    { entryNumber: 'JE-2024-002', date: new Date('2024-01-20'), description: 'Customer payment received', status: 'posted', createdAt: new Date(), totalDebit: 15000, totalCredit: 15000 },
    { entryNumber: 'JE-2024-003', date: new Date('2024-02-01'), description: 'Inventory purchase from Apex', status: 'posted', createdAt: new Date(), totalDebit: 8500, totalCredit: 8500 },
    { entryNumber: 'JE-2024-004', date: new Date('2024-02-10'), description: 'Salary disbursement - February', status: 'draft', createdAt: new Date(), totalDebit: 24000, totalCredit: 24000 },
  ];
  await db.journalEntries.bulkAdd(journalEntries);

  // Journal Lines
  const journalLines: Omit<JournalLine, 'id'>[] = [
    { journalEntryId: 1, glAccountId: 15, debit: 3000, credit: 0, description: 'Rent expense' },
    { journalEntryId: 1, glAccountId: 1, debit: 0, credit: 3000, description: 'Cash payment' },
    { journalEntryId: 2, glAccountId: 1, debit: 15000, credit: 0, description: 'Cash received' },
    { journalEntryId: 2, glAccountId: 2, debit: 0, credit: 15000, description: 'AR reduction' },
    { journalEntryId: 3, glAccountId: 3, debit: 8500, credit: 0, description: 'Inventory increase' },
    { journalEntryId: 3, glAccountId: 6, debit: 0, credit: 8500, description: 'AP increase' },
    { journalEntryId: 4, glAccountId: 14, debit: 24000, credit: 0, description: 'Salary expense' },
    { journalEntryId: 4, glAccountId: 1, debit: 0, credit: 24000, description: 'Cash payment' },
  ];
  await db.journalLines.bulkAdd(journalLines);

  // AP Invoices
  const apInvoices: Omit<APInvoice, 'id'>[] = [
    { invoiceNumber: 'AP-2024-001', vendorId: 1, date: new Date('2024-01-10'), dueDate: new Date('2024-02-09'), amount: 12500, paidAmount: 12500, status: 'paid', description: 'Steel plate order Q1', createdAt: new Date() },
    { invoiceNumber: 'AP-2024-002', vendorId: 2, date: new Date('2024-01-25'), dueDate: new Date('2024-03-10'), amount: 8340, paidAmount: 4000, status: 'partial', description: 'PCB components batch', createdAt: new Date() },
    { invoiceNumber: 'AP-2024-003', vendorId: 3, date: new Date('2024-02-05'), dueDate: new Date('2024-04-05'), amount: 22100, paidAmount: 0, status: 'open', description: 'Raw materials import', createdAt: new Date() },
    { invoiceNumber: 'AP-2024-004', vendorId: 4, date: new Date('2024-02-15'), dueDate: new Date('2024-03-17'), amount: 5600, paidAmount: 0, status: 'overdue', description: 'Freight charges', createdAt: new Date() },
  ];
  await db.apInvoices.bulkAdd(apInvoices);

  // AR Invoices
  const arInvoices: Omit<ARInvoice, 'id'>[] = [
    { invoiceNumber: 'AR-2024-001', customerName: 'Titan Manufacturing Co.', date: new Date('2024-01-05'), dueDate: new Date('2024-02-04'), amount: 34500, paidAmount: 34500, status: 'paid', description: 'Custom fabrication order', createdAt: new Date() },
    { invoiceNumber: 'AR-2024-002', customerName: 'Pinnacle Engineering', date: new Date('2024-01-18'), dueDate: new Date('2024-02-17'), amount: 18200, paidAmount: 10000, status: 'partial', description: 'Consulting services', createdAt: new Date() },
    { invoiceNumber: 'AR-2024-003', customerName: 'Summit Industries LLC', date: new Date('2024-02-01'), dueDate: new Date('2024-03-02'), amount: 27800, paidAmount: 0, status: 'open', description: 'Equipment supply', createdAt: new Date() },
    { invoiceNumber: 'AR-2024-004', customerName: 'Cascade Systems Inc.', date: new Date('2024-02-12'), dueDate: new Date('2024-03-14'), amount: 9450, paidAmount: 0, status: 'overdue', description: 'Maintenance contract', createdAt: new Date() },
  ];
  await db.arInvoices.bulkAdd(arInvoices);

  // Purchase Requisitions
  const prs: Omit<PurchaseRequisition, 'id'>[] = [
    { prNumber: 'PR-2024-001', requestor: 'Michael Torres', department: 'Production', date: new Date('2024-01-08'), status: 'converted', totalAmount: 9250, description: 'Steel plates for Q1 production', createdAt: new Date() },
    { prNumber: 'PR-2024-002', requestor: 'Lisa Park', department: 'Engineering', date: new Date('2024-01-22'), status: 'approved', totalAmount: 15680, description: 'Electronic components restock', createdAt: new Date() },
    { prNumber: 'PR-2024-003', requestor: 'David Kim', department: 'Maintenance', date: new Date('2024-02-03'), status: 'draft', totalAmount: 3200, description: 'Replacement bearings and lubricant', createdAt: new Date() },
  ];
  await db.purchaseRequisitions.bulkAdd(prs);

  // Purchase Orders
  const pos: Omit<PurchaseOrder, 'id'>[] = [
    { poNumber: 'PO-2024-001', vendorId: 1, prId: 1, date: new Date('2024-01-12'), deliveryDate: new Date('2024-02-01'), status: 'received', totalAmount: 9250, description: 'Steel plate order', createdAt: new Date() },
    { poNumber: 'PO-2024-002', vendorId: 2, date: new Date('2024-01-28'), deliveryDate: new Date('2024-02-15'), status: 'confirmed', totalAmount: 12450, description: 'PCB and components', createdAt: new Date() },
    { poNumber: 'PO-2024-003', vendorId: 3, date: new Date('2024-02-08'), deliveryDate: new Date('2024-03-10'), status: 'sent', totalAmount: 22100, description: 'Aluminum sheets bulk', createdAt: new Date() },
  ];
  await db.purchaseOrders.bulkAdd(pos);

  // Goods Movements
  const movements: Omit<GoodsMovement, 'id'>[] = [
    { documentNumber: 'GR-2024-001', type: 'receipt', materialId: 1, quantity: 2000, poId: 1, referenceDoc: 'PO-2024-001', storageLocation: 'WH-A01', date: new Date('2024-02-01'), remarks: 'Full delivery received', createdAt: new Date() },
    { documentNumber: 'GI-2024-001', type: 'issue', materialId: 1, quantity: 500, referenceDoc: 'WO-2024-015', storageLocation: 'WH-A01', date: new Date('2024-02-05'), remarks: 'Production order consumption', createdAt: new Date() },
    { documentNumber: 'GR-2024-002', type: 'receipt', materialId: 3, quantity: 100, poId: 2, referenceDoc: 'PO-2024-002', storageLocation: 'WH-B01', date: new Date('2024-02-15'), remarks: 'Partial delivery', createdAt: new Date() },
    { documentNumber: 'GI-2024-002', type: 'issue', materialId: 5, quantity: 50, referenceDoc: 'WO-2024-018', storageLocation: 'WH-B02', date: new Date('2024-02-18'), remarks: 'Assembly line consumption', createdAt: new Date() },
    { documentNumber: 'GI-2024-003', type: 'issue', materialId: 6, quantity: 20, referenceDoc: 'MR-2024-003', storageLocation: 'WH-D01', date: new Date('2024-02-20'), remarks: 'Maintenance request', createdAt: new Date() },
  ];
  await db.goodsMovements.bulkAdd(movements);
}
