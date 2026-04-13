import { useEffect, useState } from 'react';
import { db, type JournalEntry, type JournalLine, type GLAccount } from '@/lib/db';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<{ glAccountId: number; debit: number; credit: number; description: string }[]>([
    { glAccountId: 0, debit: 0, credit: 0, description: '' },
    { glAccountId: 0, debit: 0, credit: 0, description: '' },
  ]);

  const load = async () => {
    setEntries(await db.journalEntries.orderBy('date').reverse().toArray());
    setAccounts(await db.glAccounts.toArray());
  };

  useEffect(() => { load(); }, []);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addLine = () => setLines([...lines, { glAccountId: 0, debit: 0, credit: 0, description: '' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };

  const handleSave = async () => {
    if (!description) { toast.error('Description is required'); return; }
    if (!isBalanced) { toast.error('Debits must equal credits'); return; }
    if (lines.some((l) => l.glAccountId === 0)) { toast.error('Select accounts for all lines'); return; }

    const count = await db.journalEntries.count();
    const entryNumber = `JE-2024-${String(count + 1).padStart(3, '0')}`;

    const entryId = await db.journalEntries.add({
      entryNumber,
      date: new Date(),
      description,
      status: 'draft',
      createdAt: new Date(),
      totalDebit,
      totalCredit,
    });

    await db.journalLines.bulkAdd(
      lines.map((l) => ({ ...l, journalEntryId: entryId as number }))
    );

    toast.success(`Journal entry ${entryNumber} created`);
    setDialogOpen(false);
    setDescription('');
    setLines([
      { glAccountId: 0, debit: 0, credit: 0, description: '' },
      { glAccountId: 0, debit: 0, credit: 0, description: '' },
    ]);
    load();
  };

  const postEntry = async (entry: JournalEntry) => {
    if (entry.status !== 'draft') return;
    await db.journalEntries.update(entry.id!, { status: 'posted' });
    const entryLines = await db.journalLines.where('journalEntryId').equals(entry.id!).toArray();
    for (const line of entryLines) {
      const account = await db.glAccounts.get(line.glAccountId);
      if (account) {
        const newBalance = account.balance + line.debit - line.credit;
        await db.glAccounts.update(account.id!, { balance: newBalance });
      }
    }
    toast.success(`${entry.entryNumber} posted to ledger`);
    load();
  };

  const columns: Column<JournalEntry>[] = [
    { key: 'entryNumber', label: 'Entry #', render: (e) => <span className="font-mono text-sm font-medium">{e.entryNumber}</span> },
    { key: 'date', label: 'Date', render: (e) => formatDate(e.date) },
    { key: 'description', label: 'Description' },
    { key: 'totalDebit', label: 'Debit', className: 'text-right', render: (e) => formatCurrency(e.totalDebit) },
    { key: 'totalCredit', label: 'Credit', className: 'text-right', render: (e) => formatCurrency(e.totalCredit) },
    { key: 'status', label: 'Status', render: (e) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={e.status} />
        {e.status === 'draft' && (
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(ev) => { ev.stopPropagation(); postEntry(e); }}>
            Post
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Journal Entries" description="Create and manage journal entries">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Entry
        </Button>
      </PageHeader>

      <DataTable data={entries} columns={columns} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Entry description" />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_100px_100px_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Account</span><span className="text-right">Debit</span><span className="text-right">Credit</span><span></span>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-center">
                  <Select value={String(line.glAccountId)} onValueChange={(v) => updateLine(i, 'glAccountId', Number(v))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" className="h-9 text-right" value={line.debit || ''} onChange={(e) => updateLine(i, 'debit', Number(e.target.value))} placeholder="0.00" />
                  <Input type="number" className="h-9 text-right" value={line.credit || ''} onChange={(e) => updateLine(i, 'credit', Number(e.target.value))} placeholder="0.00" />
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeLine(i)} disabled={lines.length <= 2}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine}>+ Add Line</Button>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Total Debit:</span>{' '}
                <span className="font-bold">{formatCurrency(totalDebit)}</span>
                <span className="mx-4 text-muted-foreground">Total Credit:</span>{' '}
                <span className="font-bold">{formatCurrency(totalCredit)}</span>
              </div>
              <span className={`text-xs font-medium ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!isBalanced}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
