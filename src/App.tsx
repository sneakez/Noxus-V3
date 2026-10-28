import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { emitPrimaryAction } from '@/lib/events';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { useRouter } from '@/lib/router';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Sidebar, type PageId } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

// Public Marketing & Presentation Pages
import { LandingPage } from '@/pages/public/LandingPage';
import { SolutionsPage } from '@/pages/public/SolutionsPage';
import { PricingPage } from '@/pages/public/PricingPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { DemoSandboxPage } from '@/pages/public/DemoSandboxPage';
import { ProductDetailPage } from '@/pages/public/ProductDetailPage';
import { OrdersFeaturePage } from '@/pages/public/features/OrdersFeaturePage';
import { InventoryFeaturePage } from '@/pages/public/features/InventoryFeaturePage';
import { FulfillmentFeaturePage } from '@/pages/public/features/FulfillmentFeaturePage';
import { FinanceFeaturePage } from '@/pages/public/features/FinanceFeaturePage';
import { DemoControlPanel } from '@/components/mock/DemoControlPanel';

// Auth & Onboarding Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage';
import { OnboardingWizard } from '@/pages/onboarding/OnboardingWizard';

// Lazy Authenticated App Pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const WarehousesPage = lazy(() => import('@/pages/warehouses/WarehousesPage').then(m => ({ default: m.WarehousesPage })));
const TransfersPage = lazy(() => import('@/pages/transfers/TransfersPage').then(m => ({ default: m.TransfersPage })));
const BatchesPage = lazy(() => import('@/pages/batches/BatchesPage').then(m => ({ default: m.BatchesPage })));
const StockLedgerPage = lazy(() => import('@/pages/stockLedger/StockLedgerPage').then(m => ({ default: m.StockLedgerPage })));
const PurchaseOrdersPage = lazy(() => import('@/pages/purchaseOrders/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })));
const ChannelMappingPage = lazy(() => import('@/pages/channelMapping/ChannelMappingPage').then(m => ({ default: m.ChannelMappingPage })));
const ChannelConnectionsPage = lazy(() => import('@/pages/channelConnections/ChannelConnectionsPage').then(m => ({ default: m.ChannelConnectionsPage })));
const SyncMonitorPage = lazy(() => import('@/pages/syncMonitor/SyncMonitorPage').then(m => ({ default: m.SyncMonitorPage })));
const FulfillmentPage = lazy(() => import('@/pages/fulfillment/FulfillmentPage').then(m => ({ default: m.FulfillmentPage })));
const ReturnsPage = lazy(() => import('@/pages/returns/ReturnsPage').then(m => ({ default: m.ReturnsPage })));
const LedgerPage = lazy(() => import('@/pages/ledger/LedgerPage').then(m => ({ default: m.LedgerPage })));
const FeeReconciliationPage = lazy(() => import('@/pages/feeReconciliation/FeeReconciliationPage').then(m => ({ default: m.FeeReconciliationPage })));
const MarginControlPage = lazy(() => import('@/pages/marginControl/MarginControlPage').then(m => ({ default: m.MarginControlPage })));
const ComplaintsPage = lazy(() => import('@/pages/complaints/ComplaintsPage').then(m => ({ default: m.ComplaintsPage })));
const AuditTrailPage = lazy(() => import('@/pages/auditTrail/AuditTrailPage').then(m => ({ default: m.AuditTrailPage })));
const AutomationRulesPage = lazy(() => import('@/pages/automationRules/AutomationRulesPage').then(m => ({ default: m.AutomationRulesPage })));
const WebhooksPage = lazy(() => import('@/pages/webhooks/WebhooksPage').then(m => ({ default: m.WebhooksPage })));
const SimulatorPage = lazy(() => import('@/pages/simulator/SimulatorPage').then(m => ({ default: m.SimulatorPage })));
const SalesVelocityPage = lazy(() => import('@/pages/salesVelocity/SalesVelocityPage').then(m => ({ default: m.SalesVelocityPage })));
const RevenueReportPage = lazy(() => import('@/pages/revenueReport/RevenueReportPage').then(m => ({ default: m.RevenueReportPage })));
const BufferRulesPage = lazy(() => import('@/pages/bufferRules/BufferRulesPage').then(m => ({ default: m.BufferRulesPage })));
const RoutingRulesPage = lazy(() => import('@/pages/routingRules/RoutingRulesPage').then(m => ({ default: m.RoutingRulesPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const FlowGuidePage = lazy(() => import('@/pages/flowGuide/FlowGuidePage').then(m => ({ default: m.FlowGuidePage })));

interface PageMeta {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  primaryLabel: string;
}

const PAGE_META: Record<PageId, PageMeta> = {
  dashboard: { title: 'Dashboard', subtitle: 'Tổng quan hoạt động & phân tích số liệu', searchPlaceholder: 'Tìm kiếm nhanh...', primaryLabel: '' },
  orders: { title: 'Đơn hàng', subtitle: 'Trung tâm đơn hàng đa kênh — xử lý đa kho', searchPlaceholder: 'Tìm theo mã đơn hoặc khách hàng...', primaryLabel: 'Tạo đơn' },
  customers: { title: 'Khách hàng', subtitle: 'CRM thống nhất với điểm thưởng & RFM', searchPlaceholder: 'Tìm theo tên, email, hoặc công ty...', primaryLabel: 'Thêm khách hàng' },
  complaints: { title: 'Khiếu nại & AI', subtitle: 'Phân tích khiếu nại an toàn PII với AI sentiment', searchPlaceholder: 'Tìm khiếu nại...', primaryLabel: 'Tạo khiếu nại' },
  returns: { title: 'Đổi trả / RMA', subtitle: 'Quản lý đổi trả và hoàn tiền', searchPlaceholder: 'Tìm theo mã RMA hoặc đơn hàng...', primaryLabel: 'Tạo yêu cầu' },
  products: { title: 'Sản phẩm & BOM', subtitle: 'Danh mục với combo/bundle & đa kho', searchPlaceholder: 'Tìm theo tên, SKU, hoặc danh mục...', primaryLabel: 'Thêm sản phẩm' },
  inventory: { title: 'Tồn kho 5 trạng thái', subtitle: 'Physical, Reserved, Available, Unavailable, Incoming', searchPlaceholder: 'Tìm theo sản phẩm hoặc SKU...', primaryLabel: '' },
  warehouses: { title: 'Kho & Bin', subtitle: 'Quản lý đa kho với vị trí bin chi tiết', searchPlaceholder: 'Tìm kho...', primaryLabel: 'Thêm kho' },
  transfers: { title: 'Chuyển kho', subtitle: 'Chuyển kho liên chi nhánh theo dõi trạng thái', searchPlaceholder: 'Tìm phiếu chuyển...', primaryLabel: 'Tạo phiếu' },
  batches: { title: 'Lô & Serial', subtitle: 'Theo dõi lô FEFO & Serial/IMEI', searchPlaceholder: 'Tìm theo mã lô hoặc serial...', primaryLabel: '' },
  stockLedger: { title: 'Sổ giao dịch tồn', subtitle: 'Lịch sử giao dịch tồn kho bất biến (Append-only)', searchPlaceholder: 'Tìm giao dịch...', primaryLabel: '' },
  purchaseOrders: { title: 'Đơn mua hàng', subtitle: 'Quản lý PO với đặt trước & hàng sắp về', searchPlaceholder: 'Tìm theo mã PO hoặc nhà cung cấp...', primaryLabel: 'Tạo PO' },
  channelMapping: { title: 'Ánh xạ SKU kênh', subtitle: 'Ánh xạ SKU nội bộ sang SKU kênh TMĐT', searchPlaceholder: 'Tìm ánh xạ...', primaryLabel: 'Thêm ánh xạ' },
  channelConnections: { title: 'Kết nối kênh', subtitle: 'Quản lý kết nối shop Shopee, TikTok, Lazada', searchPlaceholder: 'Tìm kết nối...', primaryLabel: 'Thêm kết nối' },
  syncMonitor: { title: 'Giám sát đồng bộ', subtitle: 'Trạng thái đẩy tồn kho & log retry', searchPlaceholder: 'Tìm log...', primaryLabel: '' },
  fulfillment: { title: 'Wave Picking & SLA', subtitle: 'Wave picking, SLA countdown, scan-to-pack', searchPlaceholder: 'Tìm wave...', primaryLabel: 'Tạo wave' },
  ledger: { title: 'Sổ kép', subtitle: 'Bút toán kép với Debit == Credit', searchPlaceholder: 'Tìm bút toán...', primaryLabel: 'Tạo bút toán' },
  feeReconciliation: { title: 'Đối soát phí', subtitle: 'Phân tích phí chi tiết & phát hiện chênh lệch', searchPlaceholder: 'Tìm theo mã đơn...', primaryLabel: '' },
  marginControl: { title: 'Margin Circuit Breaker', subtitle: 'Tự động ngắt khi phát hiện margin âm', searchPlaceholder: 'Tìm kiếm...', primaryLabel: '' },
  salesVelocity: { title: 'Vận tốc bán', subtitle: 'Báo cáo doanh thu, lợi nhuận, vận tốc bán', searchPlaceholder: 'Tìm kiếm...', primaryLabel: '' },
  revenueReport: { title: 'Báo cáo doanh thu', subtitle: 'Phân tích doanh thu theo ngày, tháng, năm', searchPlaceholder: 'Tìm kiếm...', primaryLabel: '' },
  auditTrail: { title: 'Nhật ký Audit', subtitle: 'Nhật ký SHA-256 chống xóa', searchPlaceholder: 'Tìm nhật ký...', primaryLabel: '' },
  automationRules: { title: 'Luật tự động', subtitle: 'Tự động hóa đơn hàng IF-THEN', searchPlaceholder: 'Tìm luật...', primaryLabel: 'Tạo luật' },
  webhooks: { title: 'Outbound Webhooks', subtitle: 'Sự kiện HMAC gửi hệ thống bên ngoài', searchPlaceholder: 'Tìm webhook...', primaryLabel: 'Thêm webhook' },
  simulator: { title: 'Chaos Simulator', subtitle: 'Flash sale, duplicate webhook, margin attack', searchPlaceholder: 'Tìm kiếm...', primaryLabel: '' },
  bufferRules: { title: 'Tồn kho an toàn', subtitle: 'Cấu hình safety stock & reorder point', searchPlaceholder: 'Tìm quy tắc...', primaryLabel: 'Thêm quy tắc' },
  routingRules: { title: 'Định tuyến kho', subtitle: 'Cấu hình định tuyến kho tự động & tách/gộp đơn', searchPlaceholder: 'Tìm quy tắc...', primaryLabel: 'Thêm quy tắc' },
  settings: { title: 'Cài đặt & Phân quyền', subtitle: 'Quản lý người dùng & vai trò RBAC', searchPlaceholder: 'Tìm người dùng...', primaryLabel: '' },
  flowGuide: { title: 'Luồng hoạt động', subtitle: 'Hướng dẫn luồng end-to-end & phân quyền', searchPlaceholder: 'Tìm kiếm...', primaryLabel: '' },
};

function AuthenticatedWorkspace() {
  const { session, activeTenant } = useAuth();
  const [page, setPage] = useState<PageId>('dashboard');
  const [search, setSearch] = useState('');
  const [sidebarStats, setSidebarStats] = useState({ pendingOrders: 0, lowStock: 0 });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  async function refreshStats() {
    if (!activeTenant) return;
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('status').eq('tenant_id', activeTenant.id).in('status', ['pending', 'processing']),
        supabase.from('products').select('stock, reorder_level, safety_stock').eq('tenant_id', activeTenant.id),
      ]);
      if (ordersRes.error || productsRes.error) return;
      setSidebarStats({
        pendingOrders: ordersRes.data?.length ?? 0,
        lowStock: productsRes.data?.filter((p) => p.stock <= (p.reorder_level ?? 10)).length ?? 0,
      });
    } catch {
      // Silent fail
    }
  }

  useEffect(() => {
    if (!session || !activeTenant) return;
    refreshStats();
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, activeTenant]);

  function navigate(p: PageId) {
    setPage(p);
    setSearch('');
    setMobileSidebarOpen(false);
  }

  const meta = PAGE_META[page] || PAGE_META.dashboard;
  const showPrimary = page !== 'dashboard' && page !== 'inventory' && page !== 'batches' &&
    page !== 'stockLedger' && page !== 'feeReconciliation' && page !== 'marginControl' &&
    page !== 'auditTrail' && page !== 'simulator' && page !== 'syncMonitor' &&
    page !== 'salesVelocity' && page !== 'revenueReport' && page !== 'settings' &&
    page !== 'flowGuide';

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar 
        current={page} 
        onNavigate={navigate} 
        stats={sidebarStats} 
        mobileOpen={mobileSidebarOpen} 
        onMobileClose={() => setMobileSidebarOpen(false)} 
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={meta.searchPlaceholder}
          onPrimaryAction={showPrimary ? () => emitPrimaryAction(page) : undefined}
          primaryActionLabel={meta.primaryLabel}
          onMobileMenu={() => setMobileSidebarOpen(true)}
        />
        <main key={activeTenant?.id ?? 'default'} className="flex-1">
          <ErrorBoundary>
            <Suspense fallback={<FullPageSpinner label="Đang tải dữ liệu trang..." />}>
              {page === 'dashboard' && <DashboardPage onNavigate={(p) => navigate(p)} />}
              {page === 'orders' && <OrdersPage search={search} />}
              {page === 'customers' && <CustomersPage search={search} />}
              {page === 'complaints' && <ComplaintsPage search={search} />}
              {page === 'returns' && <ReturnsPage search={search} />}
              {page === 'products' && <ProductsPage search={search} />}
              {page === 'inventory' && <InventoryPage search={search} />}
              {page === 'warehouses' && <WarehousesPage search={search} />}
              {page === 'transfers' && <TransfersPage search={search} />}
              {page === 'batches' && <BatchesPage search={search} />}
              {page === 'stockLedger' && <StockLedgerPage search={search} />}
              {page === 'purchaseOrders' && <PurchaseOrdersPage search={search} />}
              {page === 'channelMapping' && <ChannelMappingPage search={search} />}
              {page === 'channelConnections' && <ChannelConnectionsPage search={search} />}
              {page === 'syncMonitor' && <SyncMonitorPage search={search} />}
              {page === 'fulfillment' && <FulfillmentPage search={search} />}
              {page === 'ledger' && <LedgerPage search={search} />}
              {page === 'feeReconciliation' && <FeeReconciliationPage search={search} />}
              {page === 'marginControl' && <MarginControlPage />}
              {page === 'salesVelocity' && <SalesVelocityPage />}
              {page === 'revenueReport' && <RevenueReportPage />}
              {page === 'auditTrail' && <AuditTrailPage search={search} />}
              {page === 'automationRules' && <AutomationRulesPage search={search} />}
              {page === 'webhooks' && <WebhooksPage search={search} />}
              {page === 'simulator' && <SimulatorPage />}
              {page === 'bufferRules' && <BufferRulesPage search={search} />}
              {page === 'routingRules' && <RoutingRulesPage search={search} />}
              {page === 'settings' && <SettingsPage search={search} />}
              {page === 'flowGuide' && <FlowGuidePage />}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function AppRouter() {
  const { path, navigate } = useRouter();
  const { session, loading: authLoading, activeTenant, memberships } = useAuth();

  if (authLoading) {
    return <FullPageSpinner label="Đang khởi tạo hệ thống..." />;
  }

  // 1. PUBLIC MARKETING & SITEMAP ROUTES
  if (path === '/') return <LandingPage onNavigate={navigate} />;
  if (path === '/solutions') return <SolutionsPage onNavigate={navigate} />;
  if (path === '/pricing') return <PricingPage onNavigate={navigate} />;
  if (path === '/about') return <AboutPage onNavigate={navigate} />;
  if (path === '/contact') return <ContactPage onNavigate={navigate} />;
  if (path === '/demo') return <DemoSandboxPage onNavigate={navigate} />;
  if (path === '/products' || path === '/product-detail') return <ProductDetailPage onNavigate={navigate} />;
  if (path === '/features/orders') return <OrdersFeaturePage onNavigate={navigate} />;
  if (path === '/features/inventory') return <InventoryFeaturePage onNavigate={navigate} />;
  if (path === '/features/fulfillment') return <FulfillmentFeaturePage onNavigate={navigate} />;
  if (path === '/features/finance') return <FinanceFeaturePage onNavigate={navigate} />;

  // 2. AUTHENTICATION & ONBOARDING LIFECYCLE
  if (path === '/login') {
    if (session) {
      navigate('/app', true);
      return null;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  if (path === '/register') {
    if (session) {
      navigate('/onboarding', true);
      return null;
    }
    return <RegisterPage onNavigate={navigate} />;
  }

  if (path === '/forgot-password') return <ForgotPasswordPage onNavigate={navigate} />;
  if (path === '/reset-password') return <ResetPasswordPage onNavigate={navigate} />;
  if (path === '/verify-email') return <VerifyEmailPage onNavigate={navigate} />;
  if (path === '/accept-invite') return <AcceptInvitePage onNavigate={navigate} />;

  if (path === '/onboarding') {
    return (
      <OnboardingWizard
        onComplete={() => navigate('/app', true)}
        onNavigate={navigate}
      />
    );
  }

  // 3. AUTHENTICATED OMS APPLICATION (/app or fallback)
  if (path.startsWith('/app')) {
    if (!session) {
      return <LoginPage onNavigate={navigate} />;
    }

    // If user has zero memberships, direct them to Onboarding Wizard
    if (memberships.length === 0 && !activeTenant) {
      return (
        <OnboardingWizard
          onComplete={() => navigate('/app', true)}
          onNavigate={navigate}
        />
      );
    }

    return <AuthenticatedWorkspace />;
  }

  // Default Fallback
  return <LandingPage onNavigate={navigate} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
        <DemoControlPanel />
      </ToastProvider>
    </AuthProvider>
  );
}
