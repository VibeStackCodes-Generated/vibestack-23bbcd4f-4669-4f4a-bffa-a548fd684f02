import { useEffect, useState } from 'react';
import { db, type GLAccount } from '@/lib/db';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function TrialBalance() {
  const [accounts, setAccounts] = useState<GLAccount[]>([]);

  useEffect(() => {
    db.glAccounts.orderBy('code').toArray().then(setAccounts);
  }, []);

  const debitTypes = ['asset', 'expense'];

  const rows = accounts.map((a) => ({
    ...a,
    debit: debitTypes.includes(a.type) ? a.balance : 0,
    credit: !debitTypes.includes(a.type) ? a.balance : 0,
  }));

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <PageHeader title="Trial Balance" description="Summary of all GL account balances">
        {isBalanced ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle className="w-3 h-3" /> Balanced
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
            <AlertCircle className="w-3 h-3" /> Unbalanced — Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
          </Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Debits</p>
            <p className="text-2xl font-bold">{formatCurrency(totalDebit)}</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Credits</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCredit)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border overflow-hidden">
        <CardHeader className="bg-muted/50 py-3">
          <CardTitle className="text-sm font-semibold">Trial Balance Report</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground text-sm">{r.type}</TableCell>
                  <TableCell className="text-right font-medium">{r.debit > 0 ? formatCurrency(r.debit) : '—'}</TableCell>
                  <TableCell className="text-right font-medium">{r.credit > 0 ? formatCurrency(r.credit) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalCredit)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>
    </div>
  );
}
