import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { formatCurrency, formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';

interface DashboardData {
  totalAssets: number;
  totalLiabilities: number;
  totalRevenue: number;
  totalExpenses: number;
  openAP: number;
  openAR: number;
  totalInventoryValue: number;
  lowStockItems: number;
  openPOs: number;
  pendingPRs: number;
  accountsByType: { name: string; value: number }[];
  recentMovements: { date: string; receipts: number; issues: number }[];
}

const COLORS = ['hsl(210, 100%, 40%)', 'hsl(0, 84%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(35, 100%, 50%)', 'hsl(280, 67%, 55%)'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    async function load() {
      const accounts = await db.glAccounts.toArray();
      const apInvoices = await db.apInvoices.toArray();
      const arInvoices = await db.arInvoices.toArray();
      const materials = await db.materials.toArray();
      const pos = await db.purchaseOrders.toArray();
      const prs = await db.purchaseRequisitions.toArray();

      const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
      const totalLiabilities = accounts.filter((a) => a.type === 'liability').reduce((s, a) => s + a.balance, 0);
      const totalRevenue = accounts.filter((a) => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
      const totalExpenses = accounts.filter((a) => a.type === 'expense').reduce((s, a) => s + a.balance, 0);

      const openAP = apInvoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.amount - i.paidAmount), 0);
      const openAR = arInvoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.amount - i.paidAmount), 0);

      const totalInventoryValue = materials.reduce((s, m) => s + m.stockQuantity * m.unitCost, 0);
      const lowStockItems = materials.filter((m) => m.stockQuantity <= m.reorderLevel).length;

      const openPOs = pos.filter((p) => !['received', 'closed'].includes(p.status)).length;
      const pendingPRs = prs.filter((p) => p.status === 'draft' || p.status === 'approved').length;

      const typeMap: Record<string, number> = {};
      accounts.forEach((a) => {
        typeMap[a.type] = (typeMap[a.type] || 0) + a.balance;
      });
      const accountsByType = Object.entries(typeMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      setData({
        totalAssets,
        totalLiabilities,
        totalRevenue,
        totalExpenses,
        openAP,
        openAR,
        totalInventoryValue,
        lowStockItems,
        openPOs,
        pendingPRs,
        accountsByType,
        recentMovements: [
          { date: 'Jan', receipts: 45000, issues: 32000 },
          { date: 'Feb', receipts: 38000, issues: 28000 },
          { date: 'Mar', receipts: 52000, issues: 41000 },
          { date: 'Apr', receipts: 29000, issues: 35000 },
        ],
      });
    }
    load();
  }, []);

  if (!data) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  const kpis = [
    { label: 'Total Assets', value: formatCurrency(data.totalAssets), icon: DollarSign, trend: '+4.2%', up: true, color: 'text-blue-600 bg-blue-50' },
    { label: 'Net Revenue', value: formatCurrency(data.totalRevenue - data.totalExpenses), icon: TrendingUp, trend: '+12.5%', up: true, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Inventory Value', value: formatCurrency(data.totalInventoryValue), icon: Package, trend: '-2.1%', up: false, color: 'text-purple-600 bg-purple-50' },
    { label: 'Open POs', value: String(data.openPOs), icon: ShoppingCart, trend: `${data.pendingPRs} PRs pending`, up: true, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Dashboard" description="Enterprise resource overview — real-time KPIs" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs">
                {kpi.up ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                )}
                <span className={kpi.up ? 'text-emerald-600' : 'text-red-600'}>{kpi.trend}</span>
                <span className="text-muted-foreground ml-1">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Goods Movement Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.recentMovements}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="receipts" fill="hsl(210, 100%, 40%)" radius={[4, 4, 0, 0]} name="Receipts" />
                <Bar dataKey="issues" fill="hsl(35, 100%, 50%)" radius={[4, 4, 0, 0]} name="Issues" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">GL Balance by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.accountsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.accountsByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {data.accountsByType.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/finance/ap">
          <Card className="border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Open Payables</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(data.openAP)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/finance/ar">
          <Card className="border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Open Receivables</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(data.openAR)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/materials/inventory">
          <Card className="border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Low Stock Alerts</p>
                  <p className="text-lg font-bold text-amber-600">{data.lowStockItems} items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
