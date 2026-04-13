import { useEffect, useState } from 'react';
import { db, type Vendor } from '@/lib/db';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, MapPin, Mail, Phone, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorMaster() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', contact: '', email: '', phone: '', address: '', city: '', country: '', paymentTerms: 'Net 30',
  });

  const load = async () => { setVendors(await db.vendors.toArray()); };
  useEffect(() => { load(); }, []);

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.code.toLowerCase().includes(search.toLowerCase()) ||
    v.city.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error('Name and email required'); return; }
    const count = await db.vendors.count();
    const code = `V-${String(1000 + count + 1)}`;
    await db.vendors.add({
      code,
      ...form,
      status: 'active',
      createdAt: new Date(),
    });
    toast.success(`Vendor ${code} created`);
    setDialogOpen(false);
    setForm({ name: '', contact: '', email: '', phone: '', address: '', city: '', country: '', paymentTerms: 'Net 30' });
    load();
  };

  const toggleStatus = async (vendor: Vendor) => {
    const newStatus = vendor.status === 'active' ? 'inactive' : 'active';
    await db.vendors.update(vendor.id!, { status: newStatus });
    toast.success(`${vendor.name} set to ${newStatus}`);
    load();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Vendor Master" description="Manage supplier information">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Vendor
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => (
          <Card key={v.id} className="border hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{v.code}</p>
                  <h3 className="font-semibold text-base mt-0.5">{v.name}</h3>
                </div>
                <StatusBadge status={v.status} />
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{v.contact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{v.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{v.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{v.city}, {v.country}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <span className="text-xs text-muted-foreground">{v.paymentTerms}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleStatus(v)}>
                  {v.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No vendors found</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Company Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Contact Person</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div>
                <Label>Payment Terms</Label>
                <Select value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
