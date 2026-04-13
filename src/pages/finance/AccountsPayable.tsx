import { useEffect, useState } from 'react';
import { db, type APInvoice, type Vendor } from '@/lib/db';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

export default function AccountsPayable() {
  const [invoices, setInvoices] = useState<APInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ vendorId: 0, amount: 0, description: '', dueInDays: 30 });

  const load = async () => {
    setInvoices(await db.apInvoices.toArray());
    setVendors(await db.vendors.where('status').equals('active').toArray());
  };

  useEffect(() => { load(); }, []);

  const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v.name]));

  const filtered = invoices.filter((i) =>
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    (vendorMap[i.vendorId] || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalOpen = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  const handleSave = async () => {
    if (!form.vendorId || !form.amount) { toast.error('Vendor and amount required'); return; }
    const count = await db.apInvoices.count();
    const invoiceNumber = `AP-2024-${String(count + 1).padStart(3, '0')}`;
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + form.dueInDays);

    await db.apInvoices.add({
      invoiceNumber,
      vendorId: form.vendorId,
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
    setForm({ vendorId: 0, amount: 0, description: '', dueInDays: 30 });
    load();
  };

  const markPaid = async (inv: APInvoice) => {
    await db.apInvoices.update(inv.id!, { paidAmount: inv.amount, status: 'paid' });
    toast.success(`${inv.invoiceNumber} marked as paid`);
    load();
  };

  const columns: Column<APInvoice>[] = [
    { key: 'invoiceNumber', label: 'Invoice #', render: (i) => <span className="font-mono text-sm font-medium">{i.invoiceNumber}</span> },
    { key: 'vendorId', label: 'Vendor', render: (i) => vendorMap[i.vendorId] || 'Unknown' },
    { key: 'date', label: 'Date', render: (i) => formatDate(i.date) },
    { key: 'dueDate', label: 'Due Date', render: (i) => formatDate(i.dueDate) },
    { key: 'amount', label: 'Amount', className: 'text-right', render: (i) => formatCurrency(i.amount) },
    { key: 'paidAmount', label: 'Paid', className: 'text-right', render: (i) => formatCurrency(i.paidAmount) },
    { key: 'status', label: 'Status', render: (i) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={i.status} />
        {i.status !== 'paid' && (
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); markPaid(i); }}>
            Pay
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Accounts Payable" description="Manage vendor invoices and payments">
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
          <p className="text-xs text-muted-foreground">Open Balance</p>
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
          <DialogHeader><DialogTitle>Create AP Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor</Label>
              <Select value={String(form.vendorId)} onValueChange={(v) => setForm({ ...form, vendorId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
