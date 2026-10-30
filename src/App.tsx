import { mockStore } from '@/mock/store';
import { WorkQueuePage } from '@/pages/workQueue/WorkQueuePage';
import { getAllowedPagesForRole } from '@/lib/permissions';
import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
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
const ExecutiveAnalyticsDashboard = lazy(() => import('@/pages/analytics/ExecutiveAnalyticsDashboard').then(m => ({ default: m.ExecutiveAnalyticsDashboard })));
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
const BusinessRulesReviewPage = lazy(() => import('@/pages/businessRules/BusinessRulesReviewPage').then(m => ({ default: m.BusinessRulesReviewPage })));
const OwnerValidationCenterPage = lazy(() => import('@/pages/businessValidation/OwnerValidationCenterPage').then(m => ({ default: m.OwnerValidationCenterPage })));

// V6 Specialized Analytics Pages
const OrderEconomicsPage = lazy(() => import('@/pages/unitEconomics/OrderEconomicsPage').then(m => ({ default: m.OrderEconomicsPage })));
const SkuEconomicsPage = lazy(() => import('@/pages/unitEconomics/SkuEconomicsPage').then(m => ({ default: m.SkuEconomicsPage })));
const ChannelEconomicsPage = lazy(() => import('@/pages/unitEconomics/ChannelEconomicsPage').then(m => ({ default: m.ChannelEconomicsPage })));
const PricingIntelligencePage = lazy(() => import('@/pages/unitEconomics/PricingIntelligencePage').then(m => ({ default: m.PricingIntelligencePage })));
const SalesAnalyticsPage = lazy(() => import('@/pages/analytics/SalesAnalyticsPage').then(m => ({ default: m.SalesAnalyticsPage })));
const InventoryAnalyticsPage = lazy(() => import('@/pages/analytics/InventoryAnalyticsPage').then(m => ({ default: m.InventoryAnalyticsPage })));
const MarketingAnalyticsPage = lazy(() => import('@/pages/analytics/MarketingAnalyticsPage').then(m => ({ default: m.MarketingAnalyticsPage })));
const CustomerAnalyticsPage = lazy(() => import('@/pages/analytics/CustomerAnalyticsPage').then(m => ({ default: m.CustomerAnalyticsPage })));
const OperationsAnalyticsPage = lazy(() => import('@/pages/analytics/OperationsAnalyticsPage').then(m => ({ default: m.OperationsAnalyticsPage })));
const CashWorkingCapitalPage = lazy(() => import('@/pages/analytics/CashWorkingCapitalPage').then(m => ({ default: m.CashWorkingCapitalPage })));
const FounderExecutionPage = lazy(() => import('@/pages/founder/FounderExecutionPage').then(m => ({ default: m.FounderExecutionPage })));

interface PageMeta {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
}

const PAGE_META: Record<PageId, PageMeta> = {
  // Overview
  dashboard: { title: 'Công việc & bàn giao', subtitle: 'Theo dõi đầu việc theo role, hàng và tiền', searchPlaceholder: 'Tìm kiếm nhanh...' },
  
  // Sales
  orders: { title: 'Quản trị đơn hàng', subtitle: 'Theo dõi tiến trình từ đặt hàng, giữ kho, đóng gói đến đối soát POD', searchPlaceholder: 'Tìm mã đơn, khách hàng...' },
  customers: { title: 'Khách hàng (CRM)', subtitle: 'Hồ sơ khách hàng, phân tầng giá trị và lịch sử mua hàng', searchPlaceholder: 'Tìm tên khách, SĐT...' },
  salesAnalytics: { title: 'Phân tích bán hàng', subtitle: 'Vận tốc bán, tăng trưởng MoM và xu hướng doanh số', searchPlaceholder: 'Tìm kiếm...' },
  
  // Operations & WMS
  inventory: { title: 'Tồn kho 5 trạng thái', subtitle: 'Vật lý = Khả dụng + Đang giữ + Không khả dụng · Hàng sắp về', searchPlaceholder: 'Tìm tên sản phẩm hoặc SKU...' },
  fulfillment: { title: 'Xử lý đơn & Đóng gói', subtitle: 'Điều phối xuất kho, nhặt hàng theo wave và cam kết SLA', searchPlaceholder: 'Tìm wave...' },
  inventoryAnalytics: { title: 'Phân tích kho vận', subtitle: 'Phân loại ABC, tuổi hàng tồn kho và điểm đặt hàng lại', searchPlaceholder: 'Tìm SKU...' },
  transfers: { title: 'Chuyển kho chi nhánh', subtitle: 'Điều chuyển hàng hóa giữa các kho nội bộ', searchPlaceholder: 'Tìm phiếu chuyển...' },
  batches: { title: 'Lô & Serial', subtitle: 'Theo dõi lô hàng theo hạn dùng và số serial/IMEI', searchPlaceholder: 'Tìm mã lô hoặc serial...' },
  warehouses: { title: 'Kho & Vị trí Bin', subtitle: 'Quản lý danh sách kho và sơ đồ vị trí lưu trữ', searchPlaceholder: 'Tìm kho...' },
  stockLedger: { title: 'Sổ cái thẻ kho', subtitle: 'Lịch sử giao dịch biến động tồn kho bất biến (Append-only)', searchPlaceholder: 'Tìm giao dịch...' },

  // Procurement
  purchaseOrders: { title: 'Đơn mua hàng (PO)', subtitle: 'Quản lý đặt hàng nhà cung cấp và theo dõi hàng sắp về', searchPlaceholder: 'Tìm mã PO, nhà cung cấp...' },
  products: { title: 'Sản phẩm & SKU', subtitle: 'Danh mục sản phẩm, biến thể SKU và giá vốn', searchPlaceholder: 'Tìm sản phẩm, SKU...' },

  // After-sales
  returns: { title: 'Đổi trả & Xử lý RMA', subtitle: 'Quy trình đổi trả hàng, hoàn tiền và nhập lại kho', searchPlaceholder: 'Tìm mã RMA, mã đơn...' },

  // Unit Economics
  orderEconomics: { title: 'Kinh tế đơn hàng (P&L)', subtitle: 'Bóc tách chi phí & biên đóng góp từng đơn hàng (CM1, CM2, CM3)', searchPlaceholder: 'Tìm mã đơn...' },
  skuEconomics: { title: 'Biên lợi nhuận SKU', subtitle: 'Lợi nhuận đóng góp, giá hòa vốn và ma trận danh mục SKU', searchPlaceholder: 'Tìm SKU...' },
  channelEconomics: { title: 'Hiệu quả kênh & Phí sàn', subtitle: 'So sánh doanh thu thuần, take-rate phí sàn và lợi nhuận từng kênh', searchPlaceholder: 'Tìm kênh...' },
  pricingCalculator: { title: 'Định giá & Hòa vốn', subtitle: 'Máy tính định giá hòa vốn, giá mục tiêu và trần voucher giảm giá', searchPlaceholder: 'Tìm sản phẩm...' },

  // Data Analytics
  marketingAnalytics: { title: 'Hiệu quả Ads & ROAS', subtitle: 'Phân tích chi phí quảng cáo, CAC và lợi nhuận sau Ads (CM3)', searchPlaceholder: 'Tìm chiến dịch...' },
  customerAnalytics: { title: 'Khách hàng & Cohorts', subtitle: 'Ma trận giữ chân theo tháng (Cohort Retention) và phân tầng RFM', searchPlaceholder: 'Tìm phân khúc...' },
  operationsAnalytics: { title: 'Vận hành & SLA kho', subtitle: 'Năng suất kho, thời gian xử lý đơn (Cycle Time) và tỷ lệ giao thành công', searchPlaceholder: 'Tìm kiếm...' },
  cashWorkingCapital: { title: 'Dòng tiền & Vốn lưu động', subtitle: 'Quản trị thanh khoản, chu kỳ chuyển đổi tiền mặt (CCC) & công nợ sàn', searchPlaceholder: 'Tìm đợt đối soát...' },
  founderExecution: { title: 'Kế hoạch OKRs & Quyết định', subtitle: 'Quản trị mục tiêu điều hành, nhiệm vụ trọng yếu và nhật ký quyết định', searchPlaceholder: 'Tìm kiếm mục tiêu hoặc nhiệm vụ...' },

  // Governance & Admin
  channelConnections: { title: 'Kênh bán & Kết nối API', subtitle: 'Quản lý kết nối shop TikTok, Shopee, Lazada', searchPlaceholder: 'Tìm kết nối...' },
  settings: { title: 'Cài đặt & Phân quyền', subtitle: 'Quản trị người dùng, vai trò phân quyền và chính sách', searchPlaceholder: 'Tìm người dùng...' },
  auditTrail: { title: 'Nhật ký hệ thống (Audit)', subtitle: 'Nhật ký kiểm toán SHA-256 bất biến chống sửa xóa', searchPlaceholder: 'Tìm nhật ký...' },

  // Demo Lab
  ownerValidation: { title: 'Nghiệm thu nghiệp vụ', subtitle: 'Mô phỏng trực tiếp và đối soát quy tắc vận hành cho người quản trị', searchPlaceholder: 'Tìm kịch bản...' },
  businessRules: { title: 'Quy tắc nghiệp vụ', subtitle: 'Rà soát và thiết lập phương án vận hành', searchPlaceholder: 'Tìm quy tắc...' },
  simulator: { title: 'Mô phỏng tình huống', subtitle: 'Kiểm thử tải cao điểm và kịch bản bất thường', searchPlaceholder: 'Tìm kiếm...' },

  // Legacy routes
  complaints: { title: 'Khiếu nại khách hàng', subtitle: 'Phân loại khiếu nại và đánh giá mức độ hài lòng', searchPlaceholder: 'Tìm khiếu nại...' },
  channelMapping: { title: 'Ánh xạ SKU kênh', subtitle: 'Ánh xạ SKU nội bộ sang SKU kênh TMĐT', searchPlaceholder: 'Tìm ánh xạ...' },
  syncMonitor: { title: 'Giám sát đồng bộ', subtitle: 'Trạng thái đẩy tồn kho & log retry', searchPlaceholder: 'Tìm log...' },
  ledger: { title: 'Sổ kép', subtitle: 'Bút toán kép với Debit == Credit', searchPlaceholder: 'Tìm bút toán...' },
  feeReconciliation: { title: 'Đối soát phí', subtitle: 'Phân tích phí chi tiết & phát hiện chênh lệch', searchPlaceholder: 'Tìm theo mã đơn...' },
  marginControl: { title: 'Kiểm soát biên lợi nhuận', subtitle: 'Cảnh báo và kiểm soát đơn hàng có biên lợi nhuận âm', searchPlaceholder: 'Tìm kiếm...' },
  salesVelocity: { title: 'Vận tốc bán', subtitle: 'Báo cáo doanh thu, lợi nhuận, vận tốc bán', searchPlaceholder: 'Tìm kiếm...' },
  revenueReport: { title: 'Báo cáo doanh thu', subtitle: 'Phân tích doanh thu theo ngày, tháng, năm', searchPlaceholder: 'Tìm kiếm...' },
  automationRules: { title: 'Luật tự động', subtitle: 'Tự động hóa đơn hàng IF-THEN', searchPlaceholder: 'Tìm luật...' },
  webhooks: { title: 'Outbound Webhooks', subtitle: 'Sự kiện HMAC gửi hệ thống bên ngoài', searchPlaceholder: 'Tìm webhook...' },
  bufferRules: { title: 'Tồn kho an toàn', subtitle: 'Cấu hình safety stock & reorder point', searchPlaceholder: 'Tìm quy tắc...' },
  routingRules: { title: 'Định tuyến kho', subtitle: 'Cấu hình định tuyến kho tự động & tách/gộp đơn', searchPlaceholder: 'Tìm quy tắc...' },
  flowGuide: { title: 'Luồng hoạt động', subtitle: 'Hướng dẫn luồng end-to-end & phân quyền', searchPlaceholder: 'Tìm kiếm...' },
};

function AuthenticatedWorkspace() {
  const { session, activeTenant, activeRole } = useAuth();
  const [page, setPage] = useState<PageId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('page') as PageId;
      if (q && PAGE_META[q]) return q;
      const hash = window.location.hash.replace('#', '') as PageId;
      if (hash && PAGE_META[hash]) return hash;
    }
    return 'dashboard';
  });

  const [search, setSearch] = useState('');
  const [, setRevision] = useState(0);
  useEffect(() => mockStore.subscribe(() => setRevision(r => r + 1)), []);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', page);
      window.history.replaceState({}, '', url.toString());
    }
  }, [page]);

  const handleNavigate = (nextPage: PageId) => {
    setPage(nextPage);
    setSearch('');
  };

  const allowed = getAllowedPagesForRole(activeRole).includes(page);
  const meta = PAGE_META[page] || PAGE_META.dashboard;

  return (
    <div className="flex h-screen bg-app-gradient overflow-hidden font-sans">
      <Sidebar
        current={page}
        onNavigate={handleNavigate}
        stats={{ pendingOrders: mockStore.getOrders().filter(o => o.status === 'pending').length, lowStock: mockStore.getInventory5State().filter(i => i.available <= i.safety_stock).length }}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          searchPlaceholder={meta.searchPlaceholder}
          search={search}
          onSearch={setSearch}
          onMobileMenu={() => setMobileOpen(!mobileOpen)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent">
          <ErrorBoundary>
            {!allowed ? <div className="p-8" role="alert"><h1 className="text-xl font-semibold">Không có quyền truy cập trang này</h1><p>Chuyển về công việc trong phạm vi tài khoản.</p><button className="border rounded p-2 mt-3" onClick={() => handleNavigate('dashboard')}>Mở công việc</button></div> : <Suspense fallback={<FullPageSpinner label="Đang tải dữ liệu..." />}>
              {/* Overview */}
              {page === 'dashboard' && <WorkQueuePage />}
              
              {/* Sales */}
              {page === 'orders' && <OrdersPage search={search} onNavigate={(p) => handleNavigate(p as PageId)} />}
              {page === 'customers' && <CustomersPage search={search} />}
              {page === 'salesAnalytics' && <SalesAnalyticsPage />}

              {/* Operations & WMS */}
              {page === 'inventory' && <InventoryPage search={search} />}
              {page === 'fulfillment' && <WorkQueuePage focus="warehouse" />}
              {page === 'inventoryAnalytics' && <InventoryAnalyticsPage onNavigate={(p) => handleNavigate(p as PageId)} />}
              {page === 'transfers' && <TransfersPage search={search} />}
              {page === 'batches' && <BatchesPage search={search} />}
              {page === 'warehouses' && <WarehousesPage search={search} />}
              {page === 'stockLedger' && <StockLedgerPage search={search} />}

              {/* Procurement */}
              {page === 'purchaseOrders' && <PurchaseOrdersPage search={search} />}
              {page === 'products' && <ProductsPage search={search} />}

              {/* After-sales */}
              {page === 'returns' && <WorkQueuePage focus="returns" />}

              {/* Unit Economics */}
              {page === 'orderEconomics' && <OrderEconomicsPage onNavigate={(p) => handleNavigate(p as PageId)} />}
              {page === 'skuEconomics' && <SkuEconomicsPage onNavigate={(p) => handleNavigate(p as PageId)} />}
              {page === 'channelEconomics' && <ChannelEconomicsPage onNavigate={(p) => handleNavigate(p as PageId)} />}
              {page === 'pricingCalculator' && <PricingIntelligencePage />}

              {/* Data Analytics */}
              {page === 'marketingAnalytics' && <MarketingAnalyticsPage />}
              {page === 'customerAnalytics' && <CustomerAnalyticsPage />}
              {page === 'operationsAnalytics' && <OperationsAnalyticsPage />}
              {page === 'cashWorkingCapital' && <CashWorkingCapitalPage />}
              {page === 'founderExecution' && <FounderExecutionPage />}

              {/* Governance & Admin */}
              {page === 'channelConnections' && <ChannelConnectionsPage search={search} />}
              {page === 'settings' && <SettingsPage search={search} />}
              {page === 'auditTrail' && <AuditTrailPage search={search} />}

              {/* Demo Lab */}
              {page === 'ownerValidation' && <OwnerValidationCenterPage />}
              {page === 'businessRules' && <BusinessRulesReviewPage />}
              {page === 'simulator' && <SimulatorPage />}

              {/* Legacy routes preserved */}
              {page === 'complaints' && <ComplaintsPage search={search} />}
              {page === 'channelMapping' && <ChannelMappingPage search={search} />}
              {page === 'syncMonitor' && <WorkQueuePage focus="sync" />}
              {page === 'ledger' && <LedgerPage search={search} />}
              {page === 'feeReconciliation' && <FeeReconciliationPage search={search} />}
              {page === 'marginControl' && <MarginControlPage />}
              {page === 'salesVelocity' && <SalesVelocityPage />}
              {page === 'revenueReport' && <RevenueReportPage />}
              {page === 'automationRules' && <AutomationRulesPage search={search} />}
              {page === 'webhooks' && <WebhooksPage search={search} />}
              {page === 'bufferRules' && <BufferRulesPage search={search} />}
              {page === 'routingRules' && <RoutingRulesPage search={search} />}
              {page === 'flowGuide' && <FlowGuidePage />}
            </Suspense>}
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

export function App() {
  const [storageError, setStorageError] = useState('');
  useEffect(() => { const listener = (e: Event) => setStorageError((e as CustomEvent<string>).detail); window.addEventListener('nexus-storage-error', listener); return () => window.removeEventListener('nexus-storage-error', listener); }, []);
  return (
    <ToastProvider>
      <AuthProvider>
        {storageError && <p role="alert" className="fixed top-0 left-0 right-0 z-[100] bg-rose-100 text-rose-900 p-4">{storageError}</p>}
        <AppRouter />
        {/* Global Demo Control Panel for quick testing and resets */}
        <DemoControlPanel />
      </AuthProvider>
    </ToastProvider>
  );
}
export default App;
