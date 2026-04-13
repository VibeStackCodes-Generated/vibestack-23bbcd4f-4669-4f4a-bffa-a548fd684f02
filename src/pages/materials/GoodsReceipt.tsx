import { useEffect, useState } from 'react';
import { db, type GoodsMovement, type Material, type PurchaseOrder } from '@/lib/db';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatNumber, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function GoodsReceipt() {
  const [movements, setMovements] = useState<GoodsMovement[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ materialId: 0, quantity: 0, poId: 0, storageLocation: '', remarks: '' });

  const load = async () => {
    setMovements(await db.goodsMovements.where('type').equals('receipt').toArray());
    setMaterials(await db.materials.toArray());
    setPos(await db.purchaseOrders.toArray());
  };

  useEffect(() => { load(); }, []);

  const materialMap = Object.fromEntries(materials.map((m) => [m.id, m]));
  const poMap = Object.fromEntries(pos.map((p) => [p.id, p]));

  const handleSave = async () => {
    if (!form.materialId || !form.quantity) { toast.error('Material and quantity required'); return; }
    const count = await db.goodsMovements.count();
    const documentNumber = `GR-2024-${String(count + 1).padStart(3, '0')}`;
    const material = materialMap[form.materialId];

    await db.goodsMovements.add({
      documentNumber,
      type: 'receipt',
      materialId: form.materialId,
      quantity: form.quantity,
      poId: form.poId || undefined,
      referenceDoc: form.poId ? (poMap[form.poId]?.poNumber || '') : '',
      storageLocation: form.storageLocation || material?.storageLocation || '',
      date: new Date(),
      remarks: form.remarks,
      createdAt: new Date(),
    });

    if (material) {
      await db.materials.update(form.materialId, {
        stockQuantity: material.stockQuantity + form.quantity,
      });
    }

    toast.success(`${documentNumber}: +${form.quantity} ${material?.uom || 'units'} of ${material?.name || 'material'}`);
    setDialogOpen(false);
    setForm({ materialId: 0, quantity: 0, poId: 0, storageLocation: '', remarks: '' });
    load();
  };

  const columns: Column<GoodsMovement>[] = [
    { key: 'documentNumber', label: 'Document #', render: (m) => <span className="font-mono text-sm font-medium">{m.documentNumber}</span> },
    { key: 'type', label: 'Type', render: () => <StatusBadge status="receipt" /> },
    { key: 'materialId', label: 'Material', render: (m) => {
      const mat = materialMap[m.materialId];
      return mat ? <div><span className="font-medium">{mat.name}</span><br/><span className="text-xs text-muted-foreground">{mat.code}</span></div> : 'Unknown';
    }},
    { key: 'quantity', label: 'Quantity', className: 'text-right', render: (m) => {
      const mat = materialMap[m.materialId];
      return <span className="font-medium text-emerald-600">+{formatNumber(m.quantity)} {mat?.uom || ''}</span>;
    }},
    { key: 'referenceDoc', label: 'Reference', render: (m) => m.referenceDoc ? <span className="font-mono text-xs">{m.referenceDoc}</span> : '—' },
    { key: 'storageLocation', label: 'Location', render: (m) => <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{m.storageLocation}</span> },
    { key: 'date', label: 'Date', render: (m) => formatDate(m.date) },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Goods Receipt" description="Record incoming material deliveries">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Post Receipt
        </Button>
      </PageHeader>

      <DataTable data={movements.reverse()} columns={columns} emptyMessage="No goods receipts recorded" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Goods Receipt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material</Label>
              <Select value={String(form.materialId)} onValueChange={(v) => setForm({ ...form, materialId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.code} — {m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Quantity</Label><Input type="number" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
              <div>
                <Label>Reference PO (optional)</Label>
                <Select value={String(form.poId)} onValueChange={(v) => setForm({ ...form, poId: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    {pos.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.poNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Storage Location</Label><Input value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} placeholder="e.g. WH-A01" /></div>
            <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Post Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
