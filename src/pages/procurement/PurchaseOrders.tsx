import { useEffect, useState } from 'react';
import { db, type PurchaseOrder, type Vendor } from '@/lib/db';
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

export default function PurchaseOrders() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ vendorId: 0, totalAmount: 0, description: '', deliveryDays: 14 });

  const load = async () => {
    setPos(await db.purchaseOrders.toArray());
    setVendors(await db.vendors.where('status').equals('active').toArray());
  };

  useEffect(() => { load(); }, []);

  const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v.name]));

  const filtered = pos.filter((p) =>
    p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    (vendorMap[p.vendorId] || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = pos.reduce((s, p) => s + p.totalAmount, 0);
  const openCount = pos.filter(p => !['received', 'closed'].includes(p.status)).length;

  const handleSave = async () => {
    if (!form.vendorId || !form.totalAmount) { toast.error('Vendor and amount required'); return; }
    const count = await db.purchaseOrders.count();
    const poNumber = `PO-2024-${String(count + 1).padStart(3, '0')}`;
    const now = new Date();
    const deliveryDate = new Date(now);
    deliveryDate.setDate(deliveryDate.getDate() + form.deliveryDays);

    await db.purchaseOrders.add({
      poNumber,
      vendorId: form.vendorId,
      date: now,
      deliveryDate,
      status: 'draft',
      totalAmount: form.totalAmount,
      description: form.description,
      createdAt: now,
    });
    toast.success(`Purchase order ${poNumber} created`);
    setDialogOpen(false);
    setForm({ vendorId: 0, totalAmount: 0, description: '', deliveryDays: 14 });
    load();
  };

  const advanceStatus = async (po: PurchaseOrder) => {
    const nextStatus: Record<string, PurchaseOrder['status']> = {
      draft: 'sent',
      sent: 'confirmed',
      confirmed: 'received',
      received: 'closed',
    };
    const next = nextStatus[po.status];
    if (!next) return;
    await db.purchaseOrders.update(po.id!, { status: next });
    toast.success(`${po.poNumber} → ${next}`);
    load();
  };

  const statusAction: Record<string, string> = {
    draft: 'Send',
    sent: 'Confirm',
    confirmed: 'Receive',
    received: 'Close',
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: 'poNumber', label: 'PO #', render: (p) => <span className="font-mono text-sm font-medium">{p.poNumber}</span> },
    { key: 'vendorId', label: 'Vendor', render: (p) => vendorMap[p.vendorId] || 'Unknown' },
    { key: 'date', label: 'Date', render: (p) => formatDate(p.date) },
    { key: 'deliveryDate', label: 'Delivery', render: (p) => formatDate(p.deliveryDate) },
    { key: 'totalAmount', label: 'Amount', className: 'text-right', render: (p) => formatCurrency(p.totalAmount) },
    { key: 'status', label: 'Status', render: (p) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={p.status} />
        {statusAction[p.status] && (
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); advanceStatus(p); }}>
            {statusAction[p.status]}
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Purchase Orders" description="Manage purchase orders to vendors">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New PO
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total POs</p>
          <p className="text-xl font-bold">{pos.length}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Open Orders</p>
          <p className="text-xl font-bold text-amber-600">{openCount}</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <DataTable data={filtered} columns={columns} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
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
              <div><Label>Amount</Label><Input type="number" value={form.totalAmount || ''} onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })} /></div>
              <div><Label>Delivery (days)</Label><Input type="number" value={form.deliveryDays} onChange={(e) => setForm({ ...form, deliveryDays: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
