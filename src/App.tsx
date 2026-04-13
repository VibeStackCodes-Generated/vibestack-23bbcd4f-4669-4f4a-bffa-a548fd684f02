import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useEffect } from 'react';
import { seedDatabase } from '@/lib/db';

import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import GeneralLedger from '@/pages/finance/GeneralLedger';
import JournalEntries from '@/pages/finance/JournalEntries';
import AccountsPayable from '@/pages/finance/AccountsPayable';
import AccountsReceivable from '@/pages/finance/AccountsReceivable';
import TrialBalance from '@/pages/finance/TrialBalance';
import PurchaseRequisitions from '@/pages/procurement/PurchaseRequisitions';
import PurchaseOrders from '@/pages/procurement/PurchaseOrders';
import VendorMaster from '@/pages/procurement/VendorMaster';
import Inventory from '@/pages/materials/Inventory';
import GoodsReceipt from '@/pages/materials/GoodsReceipt';
import GoodsIssue from '@/pages/materials/GoodsIssue';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            {/* Finance */}
            <Route path="/finance/gl" element={<GeneralLedger />} />
            <Route path="/finance/journal" element={<JournalEntries />} />
            <Route path="/finance/ap" element={<AccountsPayable />} />
            <Route path="/finance/ar" element={<AccountsReceivable />} />
            <Route path="/finance/trial-balance" element={<TrialBalance />} />
            {/* Procurement */}
            <Route path="/procurement/pr" element={<PurchaseRequisitions />} />
            <Route path="/procurement/po" element={<PurchaseOrders />} />
            <Route path="/procurement/vendors" element={<VendorMaster />} />
            {/* Materials Management */}
            <Route path="/materials/inventory" element={<Inventory />} />
            <Route path="/materials/goods-receipt" element={<GoodsReceipt />} />
            <Route path="/materials/goods-issue" element={<GoodsIssue />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
