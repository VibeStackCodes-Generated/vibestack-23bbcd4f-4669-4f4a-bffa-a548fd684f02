import { useEffect, useState } from 'react';
import { db, type GLAccount } from '@/lib/db';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

export default function GeneralLedger() {
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'asset' as GLAccount['type'], balance: 0 });

  const load = async () => {
    const data = await db.glAccounts.toArray();
    setAccounts(data);
  };

  useEffect(() => { load(); }, []);

  const filtered = accounts.filter((a) => {
    const matchSearch = a.code.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || a.type === filterType;
    return matchSearch && matchType;
  });

  const totals = {
    asset: accounts.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0),
    liability: accounts.filter(a => a.type === 'liability').reduce((s, a) => s + a.balance, 0),
    equity: accounts.filter(a => a.type === 'equity').reduce((s, a) => s + a.balance, 0),
    revenue: accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + a.balance, 0),
    expense: accounts.filter(a => a.type === 'expense').reduce((s, a) => s + a.balance, 0),
  };

  const handleSave = async () => {
    if (!form.code || !form.name) { toast.error('Code and name are required'); return; }
    await db.glAccounts.add({ ...form, currency: 'USD', createdAt: new Date() });
    toast.success(`Account ${form.code} created`);
    setDialogOpen(false);
    setForm({ code: '', name: '', type: 'asset', balance: 0 });
    load();
  };

  const columns: Column<GLAccount>[] = [
    { key: 'code', label: 'Account', render: (a) => <span className="font-mono text-sm font-medium">{a.code}</span> },
    { key: 'name', label: 'Description' },
    { key: 'type', label: 'Type', render: (a) => <StatusBadge status={a.type} /> },
    { key: 'balance', label: 'Balance', className: 'text-right', render: (a) => (
      <span className={`font-medium ${a.type === 'expense' || a.type === 'asset' ? '' : 'text-emerald-600'}`}>
        {formatCurrency(a.balance)}
      </span>
    )},
    { key: 'currency', label: 'Currency' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="General Ledger" description="Chart of accounts and balances">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Account
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(totals).map(([type, total]) => (
          <Card key={type} className="border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground capitalize font-medium">{type}</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(total)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="liability">Liability</SelectItem>
            <SelectItem value="equity">Equity</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable data={filtered} columns={columns} />

      {/* New Account Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create GL Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 6000" />
              </div>
              <div>
                <Label>Account Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as GLAccount['type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Account Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Marketing Expense" />
            </div>
            <div>
              <Label>Opening Balance</Label>
              <Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
