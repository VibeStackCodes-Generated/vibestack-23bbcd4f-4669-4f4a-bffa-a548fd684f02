import { useEffect, useState } from 'react';
import { db, type ARInvoice } from '@/lib/db';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

export default function AccountsReceivable() {
  const [invoices, setInvoices] = useState<ARInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ customerName: '', amount: 0, description: '', dueInDays: 30 });

  const load = async () => { setInvoices(await db.arInvoices.toArray()); };
  useEffect(() => { load(); }, []);

  const filtered = invoices.filter((i) =>
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    i.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const totalOpen = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  const handleSave = async () => {
    if (!form.customerName || !form.amount) { toast.error('Customer and amount required'); return; }
    const count = await db.arInvoices.count();
    const invoiceNumber = `AR-2024-${String(count + 1).padStart(3, '0')}`;
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + form.dueInDays);

    await db.arInvoices.add({
      invoiceNumber,
      customerName: form.customerName,
      date: now,
      dueDate,
      amount: form.amount,
      paidAmount: 0,
      status: 'open',
      description: form.description,
      createdAt: now,
    });
    toast.success(`Invoice ${invoiceNumber} created`);
    setDialogOpen(false);
    setForm({ customerName: '', amount: 0, description: '', dueInDays: 30 });
    load();
  };

  const collectPayment = async (inv: ARInvoice) => {
    await db.arInvoices.update(inv.id!, { paidAmount: inv.amount, status: 'paid' });
    toast.success(`${inv.invoiceNumber} payment collected`);
    load();
  };

  const columns: Column<ARInvoice>[] = [
    { key: 'invoiceNumber', label: 'Invoice #', render: (i) => <span className="font-mono text-sm font-medium">{i.invoiceNumber}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'date', label: 'Date', render: (i) => formatDate(i.date) },
    { key: 'dueDate', label: 'Due Date', render: (i) => formatDate(i.dueDate) },
    { key: 'amount', label: 'Amount', className: 'text-right', render: (i) => formatCurrency(i.amount) },
    { key: 'paidAmount', label: 'Received', className: 'text-right', render: (i) => formatCurrency(i.paidAmount) },
    { key: 'status', label: 'Status', render: (i) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={i.status} />
        {i.status !== 'paid' && (
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); collectPayment(i); }}>
            Collect
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Accounts Receivable" description="Track customer invoices and collections">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Invoices</p>
          <p className="text-xl font-bold">{invoices.length}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalOpen)}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <DataTable data={filtered} columns={columns} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create AR Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Customer Name</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="e.g. Acme Corp" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount</Label><Input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div><Label>Payment Terms (days)</Label><Input type="number" value={form.dueInDays} onChange={(e) => setForm({ ...form, dueInDays: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
