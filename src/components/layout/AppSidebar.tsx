import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  CreditCard,
  Scale,
  ShoppingCart,
  ClipboardList,
  Package,
  Users,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  Hexagon,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: { label: string; path: string; icon: React.ReactNode }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Finance',
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { label: 'General Ledger', path: '/finance/gl', icon: <BookOpen className="w-4 h-4" /> },
      { label: 'Journal Entries', path: '/finance/journal', icon: <FileText className="w-4 h-4" /> },
      { label: 'Accounts Payable', path: '/finance/ap', icon: <Receipt className="w-4 h-4" /> },
      { label: 'Accounts Receivable', path: '/finance/ar', icon: <CreditCard className="w-4 h-4" /> },
      { label: 'Trial Balance', path: '/finance/trial-balance', icon: <Scale className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Procurement',
    icon: <ShoppingCart className="w-4 h-4" />,
    items: [
      { label: 'Purchase Requisitions', path: '/procurement/pr', icon: <ClipboardList className="w-4 h-4" /> },
      { label: 'Purchase Orders', path: '/procurement/po', icon: <ShoppingCart className="w-4 h-4" /> },
      { label: 'Vendor Master', path: '/procurement/vendors', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Materials',
    icon: <Package className="w-4 h-4" />,
    items: [
      { label: 'Inventory Overview', path: '/materials/inventory', icon: <Warehouse className="w-4 h-4" /> },
      { label: 'Goods Receipt', path: '/materials/goods-receipt', icon: <ArrowDownToLine className="w-4 h-4" /> },
      { label: 'Goods Issue', path: '/materials/goods-issue', icon: <ArrowUpFromLine className="w-4 h-4" /> },
    ],
  },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Finance: true,
    Procurement: true,
    Materials: true,
  });

  const toggleGroup = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar-background text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Hexagon className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">ERP Lite</h1>
            <p className="text-[10px] text-sidebar-muted-foreground">Enterprise Suite</p>
          </div>
        )}
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-4 pb-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )
          }
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed ? (
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-3 py-2 mt-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted-foreground hover:text-sidebar-foreground transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    'w-3 h-3 transition-transform',
                    expanded[group.label] ? '' : '-rotate-90'
                  )}
                />
              </button>
            ) : (
              <div className="flex justify-center py-2 mt-3">
                <div className="w-6 h-px bg-sidebar-border" />
              </div>
            )}
            {(collapsed || expanded[group.label]) && (
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-12 border-t border-sidebar-border flex items-center justify-center text-sidebar-muted-foreground hover:text-sidebar-foreground transition-colors shrink-0"
      >
        <ChevronDown className={cn('w-4 h-4 transition-transform', collapsed ? '-rotate-90' : 'rotate-90')} />
      </button>
    </aside>
  );
}
