import { useEffect, useState } from 'react';
import { db, type Material } from '@/lib/db';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export default function Inventory() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: 'Raw Materials', uom: 'EA',
    stockQuantity: 0, reorderLevel: 0, unitCost: 0, storageLocation: '',
  });

  const load = async () => { setMaterials(await db.materials.toArray()); };
  useEffect(() => { load(); }, []);

  const categories = [...new Set(materials.map((m) => m.category))];

  const filtered = materials.filter((m) => {
    const matchSearch = m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || m.category === filterCategory;
    return matchSearch && matchCat;
  });

  const totalValue = materials.reduce((s, m) => s + m.stockQuantity * m.unitCost, 0);
  const totalItems = materials.reduce((s, m) => s + m.stockQuantity, 0);
  const lowStock = materials.filter((m) => m.stockQuantity <= m.reorderLevel);

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    const count = await db.materials.count();
    const code = `MAT-${String(count + 1).padStart(3, '0')}`;
    await db.materials.add({
      code,
      ...form,
      status: 'active',
      createdAt: new Date(),
    });
    toast.success(`Material ${code} created`);
    setDialogOpen(false);
    setForm({ name: '', description: '', category: 'Raw Materials', uom: 'EA', stockQuantity: 0, reorderLevel: 0, unitCost: 0, storageLocation: '' });
    load();
  };

  const columns: Column<Material>[] = [
    { key: 'code', label: 'Material', render: (m) => (
      <div>
        <span className="font-mono text-sm font-medium">{m.code}</span>
        <p className="text-xs text-muted-foreground">{m.name}</p>
      </div>
    )},
    { key: 'category', label: 'Category', render: (m) => (
      <span className="text-sm">{m.category}</span>
    )},
    { key: 'stockQuantity', label: 'Stock', render: (m) => {
      const pct = m.reorderLevel > 0 ? Math.min((m.stockQuantity / (m.reorderLevel * 3)) * 100, 100) : 100;
      const isLow = m.stockQuantity <= m.reorderLevel;
      return (
        <div className="space-y-1 min-w-[120px]">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isLow ? 'text-red-600' : ''}`}>
              {formatNumber(m.stockQuantity)} {m.uom}
            </span>
            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          </div>
          <Progress value={pct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">Reorder at {formatNumber(m.reorderLevel)}</p>
        </div>
      );
    }},
    { key: 'unitCost', label: 'Unit Cost', className: 'text-right', render: (m) => formatCurrency(m.unitCost) },
    { key: 'value', label: 'Total Value', className: 'text-right', render: (m) => (
      <span className="font-medium">{formatCurrency(m.stockQuantity * m.unitCost)}</span>
    )},
    { key: 'storageLocation', label: 'Location', render: (m) => (
      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{m.storageLocation}</span>
    )},
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Inventory Overview" description="Material stock levels and valuation">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Material
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Materials</p>
          <p className="text-xl font-bold">{materials.length}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Stock</p>
          <p className="text-xl font-bold">{formatNumber(totalItems)}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Inventory Value</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalValue)}</p>
        </CardContent></Card>
        <Card className="border"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
          <p className="text-xl font-bold text-amber-600">{lowStock.length}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable data={filtered} columns={columns} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Material Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Stainless Steel Rod" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                    <SelectItem value="Components">Components</SelectItem>
                    <SelectItem value="Consumables">Consumables</SelectItem>
                    <SelectItem value="Finished Goods">Finished Goods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>UoM</Label>
                <Select value={form.uom} onValueChange={(v) => setForm({ ...form, uom: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EA">Each</SelectItem>
                    <SelectItem value="KG">Kilogram</SelectItem>
                    <SelectItem value="M">Meter</SelectItem>
                    <SelectItem value="L">Liter</SelectItem>
                    <SelectItem value="PAIR">Pair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Storage Location</Label><Input value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} placeholder="WH-A01" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Initial Stock</Label><Input type="number" value={form.stockQuantity || ''} onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })} /></div>
              <div><Label>Reorder Level</Label><Input type="number" value={form.reorderLevel || ''} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} /></div>
              <div><Label>Unit Cost</Label><Input type="number" step="0.01" value={form.unitCost || ''} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create Material</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
