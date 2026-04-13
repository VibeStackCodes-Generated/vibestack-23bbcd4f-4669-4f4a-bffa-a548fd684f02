import { useEffect, useState } from 'react';
import { db, type PurchaseRequisition } from '@/lib/db';
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

export default function PurchaseRequisitions() {
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ requestor: '', department: '', description: '', totalAmount: 0 });

  const load = async () => { setPrs(await db.purchaseRequisitions.toArray()); };
  useEffect(() => { load(); }, []);

  const filtered = prs.filter((p) =>
    p.prNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.requestor.toLowerCase().includes(search.toLowerCase()) ||
    p.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.requestor || !form.department) { toast.error('Requestor and department required'); return; }
    const count = await db.purchaseRequisitions.count();
    const prNumber = `PR-2024-${String(count + 1).padStart(3, '0')}`;
    await db.purchaseRequisitions.add({
      prNumber,
      requestor: form.requestor,
      department: form.department,
      date: new Date(),
      status: 'draft',
      totalAmount: form.totalAmount,
      description: form.description,
      createdAt: new Date(),
    });
    toast.success(`Requisition ${prNumber} created`);
    setDialogOpen(false);
    setForm({ requestor: '', department: '', description: '', totalAmount: 0 });
    load();
  };

  const approve = async (pr: PurchaseRequisition) => {
    await db.purchaseRequisitions.update(pr.id!, { status: 'approved' });
    toast.success(`${pr.prNumber} approved`);
    load();
  };

  const columns: Column<PurchaseRequisition>[] = [
    { key: 'prNumber', label: 'PR #', render: (p) => <span className="font-mono text-sm font-medium">{p.prNumber}</span> },
    { key: 'requestor', label: 'Requestor' },
    { key: 'department', label: 'Department' },
    { key: 'date', label: 'Date', render: (p) => formatDate(p.date) },
    { key: 'totalAmount', label: 'Amount', className: 'text-right', render: (p) => formatCurrency(p.totalAmount) },
    { key: 'description', label: 'Description', className: 'max-w-[200px] truncate' },
    { key: 'status', label: 'Status', render: (p) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={p.status} />
        {p.status === 'draft' && (
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); approve(p); }}>
            Approve
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Purchase Requisitions" description="Request and approve material purchases">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Requisition
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search requisitions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <DataTable data={filtered} columns={columns} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Purchase Requisition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Requestor</Label><Input value={form.requestor} onChange={(e) => setForm({ ...form, requestor: e.target.value })} placeholder="e.g. John Smith" /></div>
              <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Production" /></div>
            </div>
            <div><Label>Estimated Amount</Label><Input type="number" value={form.totalAmount || ''} onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What do you need?" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Submit Requisition</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
