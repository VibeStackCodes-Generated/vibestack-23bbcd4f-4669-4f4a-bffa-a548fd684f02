import { useEffect, useState } from 'react';
import { db, type GoodsMovement, type Material } from '@/lib/db';
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

export default function GoodsIssue() {
  const [movements, setMovements] = useState<GoodsMovement[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ materialId: 0, quantity: 0, referenceDoc: '', storageLocation: '', remarks: '' });

  const load = async () => {
    setMovements(await db.goodsMovements.where('type').equals('issue').toArray());
    setMaterials(await db.materials.toArray());
  };

  useEffect(() => { load(); }, []);

  const materialMap = Object.fromEntries(materials.map((m) => [m.id, m]));

  const handleSave = async () => {
    if (!form.materialId || !form.quantity) { toast.error('Material and quantity required'); return; }
    const material = materialMap[form.materialId];
    if (material && form.quantity > material.stockQuantity) {
      toast.error(`Insufficient stock. Available: ${material.stockQuantity} ${material.uom}`);
      return;
    }

    const count = await db.goodsMovements.count();
    const documentNumber = `GI-2024-${String(count + 1).padStart(3, '0')}`;

    await db.goodsMovements.add({
      documentNumber,
      type: 'issue',
      materialId: form.materialId,
      quantity: form.quantity,
      referenceDoc: form.referenceDoc,
      storageLocation: form.storageLocation || material?.storageLocation || '',
      date: new Date(),
      remarks: form.remarks,
      createdAt: new Date(),
    });

    if (material) {
      await db.materials.update(form.materialId, {
        stockQuantity: material.stockQuantity - form.quantity,
      });
    }

    toast.success(`${documentNumber}: -${form.quantity} ${material?.uom || 'units'} of ${material?.name || 'material'}`);
    setDialogOpen(false);
    setForm({ materialId: 0, quantity: 0, referenceDoc: '', storageLocation: '', remarks: '' });
    load();
  };

  const selectedMaterial = form.materialId ? materialMap[form.materialId] : null;

  const columns: Column<GoodsMovement>[] = [
    { key: 'documentNumber', label: 'Document #', render: (m) => <span className="font-mono text-sm font-medium">{m.documentNumber}</span> },
    { key: 'type', label: 'Type', render: () => <StatusBadge status="issue" /> },
    { key: 'materialId', label: 'Material', render: (m) => {
      const mat = materialMap[m.materialId];
      return mat ? <div><span className="font-medium">{mat.name}</span><br/><span className="text-xs text-muted-foreground">{mat.code}</span></div> : 'Unknown';
    }},
    { key: 'quantity', label: 'Quantity', className: 'text-right', render: (m) => {
      const mat = materialMap[m.materialId];
      return <span className="font-medium text-orange-600">-{formatNumber(m.quantity)} {mat?.uom || ''}</span>;
    }},
    { key: 'referenceDoc', label: 'Reference', render: (m) => m.referenceDoc ? <span className="font-mono text-xs">{m.referenceDoc}</span> : '—' },
    { key: 'storageLocation', label: 'Location', render: (m) => <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{m.storageLocation}</span> },
    { key: 'date', label: 'Date', render: (m) => formatDate(m.date) },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Goods Issue" description="Record material consumption and outgoing stock">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Post Issue
        </Button>
      </PageHeader>

      <DataTable data={movements.reverse()} columns={columns} emptyMessage="No goods issues recorded" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Goods Issue</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material</Label>
              <Select value={String(form.materialId)} onValueChange={(v) => setForm({ ...form, materialId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.code} — {m.name} (Stock: {formatNumber(m.stockQuantity)} {m.uom})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMaterial && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {formatNumber(selectedMaterial.stockQuantity)} {selectedMaterial.uom} in {selectedMaterial.storageLocation}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Quantity</Label><Input type="number" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
              <div><Label>Reference Document</Label><Input value={form.referenceDoc} onChange={(e) => setForm({ ...form, referenceDoc: e.target.value })} placeholder="e.g. WO-2024-020" /></div>
            </div>
            <div><Label>Storage Location</Label><Input value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} placeholder="e.g. WH-A01" /></div>
            <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Post Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
