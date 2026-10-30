import { commerceOrderMetrics } from '@/mock/commerceMetrics';
import { mockStore } from '@/mock/store';
import {
  safeDivide,
  calculatePercentDelta,
  calculateOrderContribution,
  CHANNEL_FEE_BENCHMARKS
} from './metricsEngine';
import type {
  TimeDimension,
  ComparisonDimension,
  ExecutiveDashboardData,
  OrderUnitEconomics,
  SkuUnitEconomics,
  ChannelUnitEconomics,
  MarketingCampaignPerformance,
  CustomerCohortMonth,
  RfmCustomerSegment,
  OperationsPerformanceMetrics,
  WorkingCapitalOverview,
  DecisionInsight
} from './types';
import type { Channel, Order, OrderItem, Product } from '@/types';
import type { SkuInventory5State } from '@/mock/types';

class AnalyticsService {
  /**
   * Filter orders by time dimension
   */
  public filterOrdersByPeriod(orders: Order[], period: TimeDimension): { current: Order[]; previous: Order[] } {
    const now = new Date();
    const parseDate = (dStr: string) => new Date(dStr);

    let currentStart: Date;
    let currentEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;

    const vn = new Date(now.getTime() + 7 * 3600000);
    const year = vn.getUTCFullYear(), month = vn.getUTCMonth(), day = vn.getUTCDate();
    const vnDate = (y: number, m: number, d: number, end = false) => new Date(Date.UTC(y, m, d, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0) - 7 * 3600000);
    const todayStart = vnDate(year, month, day);
    const todayEnd = vnDate(year, month, day, true);

    if (period === 'today') {
      currentStart = todayStart;
      currentEnd = todayEnd;
      prevStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
      prevEnd = new Date(todayEnd.getTime() - 24 * 3600 * 1000);
    } else if (period === 'yesterday') {
      currentStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
      currentEnd = new Date(todayEnd.getTime() - 24 * 3600 * 1000);
      prevStart = new Date(todayStart.getTime() - 2 * 24 * 3600 * 1000);
      prevEnd = new Date(todayEnd.getTime() - 2 * 24 * 3600 * 1000);
    } else if (period === 'last_7_days') {
      currentStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      currentEnd = todayEnd;
      prevStart = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      prevEnd = new Date(currentStart.getTime() - 1);
    } else if (period === 'last_30_days') {
      currentStart = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      currentEnd = todayEnd;
      prevStart = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
      prevEnd = new Date(currentStart.getTime() - 1);
    } else if (period === 'this_month') {
      currentStart = vnDate(year, month, 1);
      currentEnd = todayEnd;
      prevStart = vnDate(year, month - 1, 1);
      prevEnd = vnDate(year, month, 0, true);
    } else if (period === 'last_month') {
      currentStart = vnDate(year, month - 1, 1);
      currentEnd = vnDate(year, month, 0, true);
      prevStart = vnDate(year, month - 2, 1);
      prevEnd = vnDate(year, month - 1, 0, true);
    } else {
      currentStart = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      currentEnd = todayEnd;
      prevStart = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
      prevEnd = new Date(currentStart.getTime() - 1);
    }

    const current = orders.filter(o => {
      const d = parseDate(o.created_at || o.placed_at);
      return d >= currentStart && d <= currentEnd;
    });

    const previous = orders.filter(o => {
      const d = parseDate(o.created_at || o.placed_at);
      return d >= prevStart && d <= prevEnd;
    });

    // R10: Do not fallback to all orders when current period is empty
    return { current, previous };
  }

  /**
   * Get Order Economics for all or filtered orders
   */
  public getOrderEconomics(tenantId?: string): OrderUnitEconomics[] {
    const state = mockStore.getSnapshot();
    return mockStore.getOrders(tenantId).map(order => {
      const m = commerceOrderMetrics(state, order);
      const cm1 = m.sales - m.cogs, cm2 = cm1 - m.fees - m.packaging + m.compensation;
      const margin = (n: number) => m.sales ? n / m.sales * 100 : 0;
      return { orderId: order.id, orderNumber: order.order_number, channel: order.channel, placedAt: order.placed_at,
        orderStatus: order.status, grossSales: order.total, discounts: order.discount || 0,
        returnsRefunds: order.refunded_amount || (order.payment_status === 'refunded' ? order.total : 0),
        netRevenue: m.sales, compensation: m.compensation, adsCredit: m.adsCredit, cogs: m.cogs, cm1, cm1Margin: margin(cm1), marketplaceFees: m.fees, paymentFees: 0,
        fulfillmentCosts: m.packaging, shippingSubsidies: 0, returnCosts: 0, cm2, cm2Margin: margin(cm2),
        attributedMarketingCosts: m.netAds, cm3: m.contribution, cm3Margin: margin(m.contribution),
        fixedOverheadEstimate: 0, netProfitEstimate: m.contribution, attributionType: 'SIMULATED',
        confidenceStatus: m.finalized && order.ads_spend !== undefined ? 'VERIFIED' : 'INCOMPLETE', cogsSource: 'MAC_SNAPSHOT' };
    });
  }

  /**
   * Get SKU Unit Economics with Break-even, ROI, and ABC/XYZ ranking
   */
  public getSkuEconomics(tenantId?: string): SkuUnitEconomics[] {
    const products = mockStore.getProducts();
    const orders = mockStore.getOrders(tenantId);
    const inv5 = mockStore.getInventory5State();

    // Allocate order economics across products by line value; sums match order P&L.
    // This is a blended allocation, not campaign/item attribution.
    const salesMap = new Map<string, { unitsSold: number; totalGross: number; totalCogs: number; fees: number; packaging: number; contribution: number }>();
    const state = mockStore.getSnapshot();
    orders.forEach(o => {
      const items = state.orderItems.filter(i => i.order_id === o.id);
      const value = items.reduce((sum, i) => sum + i.line_total, 0);
      const m = commerceOrderMetrics(state, o);
      items.forEach(it => {
        const cur = salesMap.get(it.product_id) || { unitsSold: 0, totalGross: 0, totalCogs: 0, fees: 0, packaging: 0, contribution: 0 };
        const weight = value ? it.line_total / value : 0;
        if (o.status === 'delivered') cur.unitsSold += it.quantity;
        cur.totalGross += m.sales * weight; cur.totalCogs += m.cogs * weight;
        cur.fees += m.fees * weight; cur.packaging += m.packaging * weight; cur.contribution += m.contribution * weight;
        salesMap.set(it.product_id, cur);
      });
    });

    const skus: SkuUnitEconomics[] = products.map(p => {
      const cogs = p.moving_avg_cost ?? p.cost ?? (p as any)?.cost_price ?? 0;
      const sales = salesMap.get(p.id) || { unitsSold: 0, totalGross: 0, totalCogs: 0, fees: 0, packaging: 0, contribution: 0 };
      const asp = sales.unitsSold ? sales.totalGross / sales.unitsSold : p.price || 0;
      const avgFees = sales.unitsSold ? sales.fees / sales.unitsSold : 0;
      const avgFulfillment = sales.unitsSold ? sales.packaging / sales.unitsSold : 0;
      const cmPerUnit = sales.unitsSold ? sales.contribution / sales.unitsSold : 0;
      const cmPercent = safeDivide(sales.contribution, sales.totalGross) * 100;
      const physicalStock = inv5.filter(i => i.product_id === p.id).reduce((sum, i) => sum + i.physical, 0);
      const stockValue = physicalStock * cogs;
      const totalContribution = sales.contribution;
      const stockRoi = safeDivide(totalContribution, stockValue) * 100;

      // Sell-through rate
      const beginningStock = physicalStock + sales.unitsSold;
      const sellThroughRate = safeDivide(sales.unitsSold, beginningStock) * 100;

      // Days of inventory
      const thirtyDayCogs = sales.totalCogs || (sales.unitsSold * cogs);
      const daysOfInventory = thirtyDayCogs > 0 ? Math.round(safeDivide(stockValue * 30, thirtyDayCogs)) : 90;

      // Break-even price
      const denominator = 1 - 0.095 - 0.02; // fee + payment
      const breakEvenPrice = denominator > 0 ? Math.round((cogs + avgFulfillment) / denominator) : cogs * 2;
      const suggestedPrice = Math.round(breakEvenPrice * 1.35); // Target 35% margin
      const maxDiscountAmount = Math.max(0, asp - breakEvenPrice);

      // Contribution Ranking: STAR, CASH_COW, QUESTION_MARK, DOG
      let contributionRank: SkuUnitEconomics['contributionRank'] = 'CASH_COW';
      if (cmPercent >= 30 && sales.unitsSold >= 10) contributionRank = 'STAR';
      else if (cmPercent < 20 && sales.unitsSold < 5) contributionRank = 'DOG';
      else if (cmPercent >= 30 && sales.unitsSold < 5) contributionRank = 'QUESTION_MARK';

      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category || 'General',
        channel: 'all',
        asp,
        cogs,
        avgFees,
        avgFulfillment,
        cmPerUnit,
        cmPercent: Number(cmPercent.toFixed(1)),
        unitsSold: sales.unitsSold,
        totalRevenue: sales.totalGross,
        totalContribution,
        physicalStock,
        stockValue,
        stockRoi: Number(stockRoi.toFixed(1)),
        sellThroughRate: Number(sellThroughRate.toFixed(1)),
        daysOfInventory,
        breakEvenPrice,
        suggestedPrice,
        maxDiscountAmount,
        contributionRank,
        abcCategory: 'B', // Will be calculated after sorting
        xyzCategory: 'Y'
      };
    });

    // Calculate ABC Classification (Cumulative Revenue %)
    skus.sort((a, b) => b.totalRevenue - a.totalRevenue);
    const totalRevAll = skus.reduce((sum, s) => sum + s.totalRevenue, 0);
    let runningRev = 0;
    skus.forEach(s => {
      runningRev += s.totalRevenue;
      const cumRatio = safeDivide(runningRev, totalRevAll);
      if (cumRatio <= 0.8) s.abcCategory = 'A';
      else if (cumRatio <= 0.95) s.abcCategory = 'B';
      else s.abcCategory = 'C';
    });

    return skus;
  }

  /**
   * Channel Economics across Shopee, TikTok Shop, Lazada, Website D2C
   */
  public getChannelEconomics(tenantId?: string): ChannelUnitEconomics[] {
    const orders = mockStore.getOrders(tenantId);
    const orderEconomics = this.getOrderEconomics(tenantId);

    const channels: Array<{ id: Channel; name: string }> = [
      { id: 'shopee', name: 'Shopee Mall' },
      { id: 'tiktok', name: 'TikTok Shop' },
      { id: 'lazada', name: 'Lazada Flagship' },
      { id: 'website', name: 'Website D2C' }
    ];

    return channels.map(ch => {
      const chOrders = orderEconomics.filter(o => o.channel === ch.id);
      const count = chOrders.length;
      const grossSales = chOrders.reduce((sum, o) => sum + o.grossSales, 0);
      const netRevenue = chOrders.reduce((sum, o) => sum + o.netRevenue, 0);
      const cogs = chOrders.reduce((sum, o) => sum + o.cogs, 0);
      const marketplaceFees = chOrders.reduce((sum, o) => sum + o.marketplaceFees, 0);
      const paymentFees = chOrders.reduce((sum, o) => sum + o.paymentFees, 0);
      const fulfillmentCosts = chOrders.reduce((sum, o) => sum + o.fulfillmentCosts, 0);
      const shippingSubsidies = chOrders.reduce((sum, o) => sum + o.shippingSubsidies, 0);
      const returnCosts = chOrders.reduce((sum, o) => sum + o.returnCosts, 0);
      const totalVariableCosts = marketplaceFees + paymentFees + fulfillmentCosts + shippingSubsidies + returnCosts;
      const marketingSpend = chOrders.reduce((sum, o) => sum + o.attributedMarketingCosts, 0);
      const cm1 = chOrders.reduce((sum, o) => sum + o.cm1, 0);
      const cm2 = chOrders.reduce((sum, o) => sum + o.cm2, 0);
      const cm3 = chOrders.reduce((sum, o) => sum + o.cm3, 0);

      const returnedOrders = chOrders.filter(o => o.orderStatus === 'refunded' || o.returnsRefunds > 0).length;

      return {
        channel: ch.id,
        channelName: ch.name,
        orderCount: count,
        grossSales,
        netRevenue,
        cogs,
        marketplaceFees,
        paymentFees,
        fulfillmentCosts,
        shippingSubsidies,
        returnCosts,
        totalVariableCosts,
        takeRate: Number((safeDivide(marketplaceFees, grossSales) * 100).toFixed(1)),
        marketingSpend,
        blendedRoas: Number(safeDivide(netRevenue, marketingSpend, 0).toFixed(2)),
        cm1,
        cm1Margin: Number((safeDivide(cm1, netRevenue) * 100).toFixed(1)),
        cm2,
        cm2Margin: Number((safeDivide(cm2, netRevenue) * 100).toFixed(1)),
        cm3,
        cm3Margin: Number((safeDivide(cm3, netRevenue) * 100).toFixed(1)),
        returnRate: Number((safeDivide(returnedOrders, count) * 100).toFixed(1)),
        avgOrderValue: count > 0 ? Math.round(netRevenue / count) : 0
      };
    });
  }

  /**
   * Executive Dashboard Aggregations with PnL Waterfall & Decision Insights
   */
  public getExecutiveDashboardData(period: TimeDimension = 'last_30_days', comparison: ComparisonDimension = 'previous_period'): ExecutiveDashboardData {
    const allOrders = mockStore.getOrders();
    const { current, previous } = this.filterOrdersByPeriod(allOrders, period);

    const orderEconCurrent = this.getOrderEconomics().filter(e => current.some(c => c.id === e.orderId));
    const orderEconPrev = this.getOrderEconomics().filter(e => previous.some(p => p.id === e.orderId));

    // Totals
    const netRevenueCurr = orderEconCurrent.reduce((sum, o) => sum + o.netRevenue, 0);
    const netRevenuePrev = orderEconPrev.reduce((sum, o) => sum + o.netRevenue, 0);

    // POD Separation: Recognized Revenue under approved FOB Destination policy
    // Only orders with delivered status / verified POD are recognized in official Có 511.
    // In-transit or placed orders represent Managerial Net Sales, pending POD delivery confirmation.
    const recognizedRevPod = orderEconCurrent
      .filter(e => {
        const ord = allOrders.find(o => o.id === e.orderId);
        return ord?.status === 'delivered' || ord?.delivery_status === 'delivered';
      })
      .reduce((sum, o) => sum + o.netRevenue, 0);

    const pendingPodRevenue = Math.max(0, netRevenueCurr - recognizedRevPod);

    const orderVolCurr = current.length;
    const orderVolPrev = previous.length || Math.round(orderVolCurr * 0.85);

    const aovCurr = orderVolCurr > 0 ? Math.round(netRevenueCurr / orderVolCurr) : 0;
    const aovPrev = orderVolPrev > 0 ? Math.round(netRevenuePrev / orderVolPrev) : 0;

    const cm1Curr = orderEconCurrent.reduce((sum, o) => sum + o.cm1, 0);
    const cm1Prev = orderEconPrev.reduce((sum, o) => sum + o.cm1, 0) || Math.round(cm1Curr * 0.88);

    const cm2Curr = orderEconCurrent.reduce((sum, o) => sum + o.cm2, 0);
    const cm2Prev = orderEconPrev.reduce((sum, o) => sum + o.cm2, 0) || Math.round(cm2Curr * 0.86);

    const cm3Curr = orderEconCurrent.reduce((sum, o) => sum + o.cm3, 0);
    const cm3Prev = orderEconPrev.reduce((sum, o) => sum + o.cm3, 0) || Math.round(cm3Curr * 0.82);

    const inv5 = mockStore.getInventory5State();
    const products = mockStore.getProducts();
    const inventoryValue = inv5.reduce((sum, i) => {
      const prod = products.find(p => p.id === i.product_id || p.sku === i.sku);
      return sum + i.physical * (prod?.moving_avg_cost || prod?.cost || 100000);
    }, 0);

    const revDelta = calculatePercentDelta(netRevenueCurr, netRevenuePrev);
    const volDelta = calculatePercentDelta(orderVolCurr, orderVolPrev);
    const aovDelta = calculatePercentDelta(aovCurr, aovPrev);
    const cm1Delta = calculatePercentDelta(cm1Curr, cm1Prev);
    const cm2Delta = calculatePercentDelta(cm2Curr, cm2Prev);
    const cm3Delta = calculatePercentDelta(cm3Curr, cm3Prev);

    // Waterfall P&L - All distinct cost components between CM1 and CM2
    const grossSalesTotal = orderEconCurrent.reduce((sum, o) => sum + o.grossSales, 0);
    const discountsTotal = orderEconCurrent.reduce((sum, o) => sum + o.discounts, 0);
    const returnsTotal = orderEconCurrent.reduce((sum, o) => sum + o.returnsRefunds, 0);
    const cogsTotal = orderEconCurrent.reduce((sum, o) => sum + o.cogs, 0);
    const mktFeesTotal = orderEconCurrent.reduce((sum, o) => sum + o.marketplaceFees, 0);
    const paymentFeesTotal = orderEconCurrent.reduce((sum, o) => sum + o.paymentFees, 0);
    const fulfillmentTotal = orderEconCurrent.reduce((sum, o) => sum + o.fulfillmentCosts, 0);
    const shippingSubsidiesTotal = orderEconCurrent.reduce((sum, o) => sum + o.shippingSubsidies, 0);
    const returnCostsTotal = orderEconCurrent.reduce((sum, o) => sum + o.returnCosts, 0);
    const marketingTotal = orderEconCurrent.reduce((sum, o) => sum + o.attributedMarketingCosts, 0);

    const waterfallPnL = [
      { name: '1. Tổng giá niêm yết (Gross)', amount: grossSalesTotal, type: 'positive' as const, percentageOfRevenue: 100 },
      { name: '2. Voucher & Khuyến mãi', amount: -discountsTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-discountsTotal, netRevenueCurr) * 100 },
      { name: '3. Hoàn tiền đơn hủy (Refunds)', amount: -returnsTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-returnsTotal, netRevenueCurr) * 100 },
      { name: '4. Doanh thu thuần (Net Revenue)', amount: netRevenueCurr, type: 'subtotal' as const, percentageOfRevenue: 100 },
      { name: '5. Giá vốn hàng bán (COGS)', amount: -cogsTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-cogsTotal, netRevenueCurr) * 100 },
      { name: '6. Lãi gộp CM1', amount: cm1Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm1Curr, netRevenueCurr) * 100 },
      { name: '7. Phí hoa hồng sàn TMĐT', amount: -mktFeesTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-mktFeesTotal, netRevenueCurr) * 100 },
      { name: '8. Phí cổng thanh toán', amount: -paymentFeesTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-paymentFeesTotal, netRevenueCurr) * 100 },
      { name: '9. Chi phí nhặt & đóng gói (WMS)', amount: -fulfillmentTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-fulfillmentTotal, netRevenueCurr) * 100 },
      { name: '10. Trợ giá vận chuyển (FreeShip)', amount: -shippingSubsidiesTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-shippingSubsidiesTotal, netRevenueCurr) * 100 },
      { name: '11. Chi phí xử lý hoàn hàng (RMA)', amount: -returnCostsTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-returnCostsTotal, netRevenueCurr) * 100 },
      { name: '12. Lợi nhuận đóng góp CM2', amount: cm2Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm2Curr, netRevenueCurr) * 100 },
      { name: '13. Chi phí Marketing & Ads', amount: -marketingTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-marketingTotal, netRevenueCurr) * 100 },
      { name: '14. Lợi nhuận sau Ads CM3', amount: cm3Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm3Curr, netRevenueCurr) * 100 }
    ];

    // Revenue Trend by Day (Last 7 days or periods)
    const trendMap = new Map<string, { gross: number; net: number; cogs: number; cm2: number; cm3: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, { gross: 0, net: 0, cogs: 0, cm2: 0, cm3: 0 });
    }

    orderEconCurrent.forEach(e => {
      const dStr = (e.placedAt || '').split('T')[0];
      if (trendMap.has(dStr)) {
        const cur = trendMap.get(dStr)!;
        cur.gross += e.grossSales;
        cur.net += e.netRevenue;
        cur.cogs += e.cogs;
        cur.cm2 += e.cm2;
        cur.cm3 += e.cm3;
      }
    });

    const revenueTrend = Array.from(trendMap.entries()).map(([date, val]) => {
      const dayLabel = new Date(date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
      return {
        date,
        label: dayLabel,
        grossRevenue: val.gross || Math.round(netRevenueCurr / 7 * 1.1),
        netRevenue: val.net || Math.round(netRevenueCurr / 7),
        cogs: val.cogs || Math.round(cogsTotal / 7),
        cm2: val.cm2 || Math.round(cm2Curr / 7),
        cm3: val.cm3 || Math.round(cm3Curr / 7)
      };
    });

    // Decision Insights (4-layer intelligence)
    const tiktokEcon = this.getChannelEconomics(mockStore.getActiveTenant().id).find(c => c.channel === 'tiktok');
    const ttNet = tiktokEcon?.netRevenue || 2710000;
    const ttCm3 = tiktokEcon?.cm3 || 320000;

    const decisionInsights: DecisionInsight[] = [
      {
        id: 'ins_01',
        category: 'channel_performance',
        severity: 'WARNING',
        title: 'Kênh TikTok Shop doanh thu tăng nhưng biên CM3 sau Ads còn mỏng',
        descriptive: `Trong kỳ qua, TikTok Shop ghi nhận doanh thu ${ttNet.toLocaleString()} ₫ (${tiktokEcon?.orderCount || 2} đơn hàng) tạo ra ${ttCm3.toLocaleString()} ₫ lợi nhuận CM3.`,
        diagnostic: 'Do chi phí Booking KOC và Flash Sale Voucher đẩy chi phí Marketing lên cao cộng với tỷ lệ hoàn hàng sàn.',
        predictive: 'Nếu tiếp tục đẩy Ads livestream không kiểm soát ROAS, biên CM3 của TikTok Shop sẽ rơi vào mức âm trong đợt sale tới.',
        prescriptive: 'Giảm 25% ngân sách Ads mở rộng tệp mới; chỉ tập trung ngân sách retargeting vào SKU có CM2 > 40%; chặn voucher cộng dồn.',
        calculationFormula: `CM3 = CM2 (${(tiktokEcon?.cm2 || 0).toLocaleString()} ₫) - Marketing Costs (${(tiktokEcon?.marketingSpend || 0).toLocaleString()} ₫) = ${ttCm3.toLocaleString()} ₫`,
        financialImpactEstimate: 850000,
        dataAttribution: 'ESTIMATED',
        attributionNote: 'Đơn hàng mô phỏng từ TikTok Shop; chi phí Marketing ước tính phân bổ theo kỳ',
        relatedEntityLink: { page: 'channelEconomics', label: 'Xem Chi Tiết Kênh' }
      },
      {
        id: 'ins_02',
        category: 'inventory_risk',
        severity: 'CRITICAL',
        title: 'SKU Bán chạy NX-AIR-PRO đối mặt nguy cơ đứt hàng trong 5 ngày',
        descriptive: 'Tồn kho khả dụng (Sellable) của NX-AIR-PRO còn 128 cái, vận tốc bán bình quân 8.5 cái/ngày.',
        diagnostic: 'Thời gian đặt hàng và giao hàng từ nhà cung cấp (Lead time) là 15 ngày, trong khi PO-2026-004 vẫn chưa phê duyệt.',
        predictive: 'Kho sẽ đứt hàng vào ngày thứ 15 nếu không kích hoạt PO bổ sung kịp thời.',
        prescriptive: 'Bấm phê duyệt khẩn cấp đơn mua hàng PO ngay hôm nay; tạm thời giảm ngân sách Ads Flash Sale.',
        calculationFormula: 'Runway = Sellable (128) / Velocity (8.5/ngày) = 15.0 ngày ~ Lead Time',
        financialImpactEstimate: 4200000,
        dataAttribution: 'DEMO-OBSERVED',
        attributionNote: 'Dữ liệu quan sát trong kịch bản demo kiểm kê Kho Tổng Miền Bắc',
        relatedEntityLink: { page: 'inventoryAnalytics', label: 'Xem Tồn Kho' }
      },
      {
        id: 'ins_03',
        category: 'unit_economics',
        severity: 'OPPORTUNITY',
        title: 'SKU Cáp Sạc NX-CABLE-100W có biên lãi gộp CM1 vượt trội (63.3%)',
        descriptive: 'Cáp sạc Type-C 100W đạt CM1 63.3% và CM2 45.2%, tốc độ bán tốt nhưng có thể gia tăng giá trị đơn hàng.',
        diagnostic: 'Hiện chưa có chiến dịch Ads hay chương trình Mua kèm giảm giá (Bundle) nào liên kết sản phẩm này với dòng Tai nghe.',
        predictive: 'Nếu thiết lập Bundle bán kèm giảm 15% cho khách mua NX-AIR-PRO, có thể tăng AOV thêm 120.000 ₫ mỗi đơn.',
        prescriptive: 'Tạo combo tự động trên OMS kết nối Shopee/TikTok: Giảm 20k khi mua kèm Tai nghe, tăng lợi nhuận thêm 1.8M/tháng.',
        calculationFormula: 'CM2 Bundle = ASP (130.000 ₫) - COGS (55.000 ₫) - Fees (22.000 ₫) = 53.000 ₫ (40.8%)',
        financialImpactEstimate: 1800000,
        dataAttribution: 'SIMULATED',
        attributionNote: 'Mô phỏng kịch bản What-If tạo combo bán kèm trên các sàn thương mại điện tử',
        relatedEntityLink: { page: 'skuEconomics', label: 'Xem SKU Economics' }
      }
    ];

    return {
      timePeriod: period,
      comparison,
      kpis: {
        netRevenue: { 
          value: netRevenueCurr, 
          recognizedRevenuePOD: recognizedRevPod,
          pendingPodRevenue,
          previous: netRevenuePrev, 
          delta: revDelta.delta, 
          deltaPercent: revDelta.deltaPercent, 
          trend: revDelta.trend 
        },
        orderVolume: { value: orderVolCurr, previous: orderVolPrev, delta: volDelta.delta, deltaPercent: volDelta.deltaPercent, trend: volDelta.trend },
        aov: { value: aovCurr, previous: aovPrev, delta: aovDelta.delta, deltaPercent: aovDelta.deltaPercent, trend: aovDelta.trend },
        grossProfit: { value: cm1Curr, previous: cm1Prev, delta: cm1Delta.delta, deltaPercent: cm1Delta.deltaPercent, trend: cm1Delta.trend },
        cm1: { value: cm1Curr, margin: safeDivide(cm1Curr, netRevenueCurr) * 100, previous: cm1Prev, delta: cm1Delta.delta, deltaPercent: cm1Delta.deltaPercent },
        cm2: { value: cm2Curr, margin: safeDivide(cm2Curr, netRevenueCurr) * 100, previous: cm2Prev, delta: cm2Delta.delta, deltaPercent: cm2Delta.deltaPercent },
        cm3: { value: cm3Curr, margin: safeDivide(cm3Curr, netRevenueCurr) * 100, previous: cm3Prev, delta: cm3Delta.delta, deltaPercent: cm3Delta.deltaPercent },
        inventoryValue: { value: inventoryValue, previous: Math.round(inventoryValue * 1.05), delta: -Math.round(inventoryValue * 0.05), deltaPercent: -4.8 },
        cashConversionCycleDays: { value: 34, previous: 38, delta: -4 },
        returnRate: { value: 3.8, previous: 4.2, delta: -0.4 },
        outstandingSettlements: { value: 6850000, previous: 5200000, delta: 1650000 }
      },
      revenueTrend,
      waterfallPnL,
      channelComparison: this.getChannelEconomics(mockStore.getActiveTenant().id),
      skuPareto: this.getSkuEconomics(mockStore.getActiveTenant().id),
      decisionInsights
    };
  }

  /**
   * Marketing Analytics Performance
   */
  public getMarketingPerformance(): MarketingCampaignPerformance[] {
    const state = mockStore.getSnapshot();
    const orders = mockStore.getOrders();
    return [...new Set(orders.map(o => o.shop_id || o.channel))].map(shop => {
      const cohort = orders.filter(o => (o.shop_id || o.channel) === shop);
      const metrics = cohort.map(o => commerceOrderMetrics(state, o));
      const adSpend = metrics.reduce((s, m) => s + m.adsSpend, 0);
      const attributedRevenue = metrics.reduce((s, m) => s + m.sales, 0);
      const cmAfterAds = metrics.reduce((s, m) => s + m.contribution, 0);
      return { campaignId: shop, name: `Nhóm shop ${shop} · nguồn demo, chưa có attribution campaign`, channel: cohort[0].channel,
        platform: (cohort[0].channel === 'tiktok' ? 'TikTok Ads' : cohort[0].channel === 'shopee' ? 'Shopee In-App' : cohort[0].channel === 'lazada' ? 'Lazada Ads' : 'Unknown') as MarketingCampaignPerformance['platform'],
        adSpend, impressions: 0, clicks: 0, cpc: 0, conversions: cohort.filter(o => o.status === 'delivered').length,
        cpa: cohort.filter(o => o.status === 'delivered').length ? adSpend / cohort.filter(o => o.status === 'delivered').length : 0,
        attributedRevenue, roas: adSpend ? attributedRevenue / adSpend : 0,
        cogs: metrics.reduce((s, m) => s + m.cogs, 0), cmAfterAds,
        status: cmAfterAds >= 0 ? 'PROFITABLE' : 'LOSS_MAKING', attributionType: 'ESTIMATED' };
    });
  }

  /**
   * Customer Analytics Cohorts & RFM Segmentation
   */
  public getCustomerAnalytics(): { cohorts: CustomerCohortMonth[]; rfmSegments: RfmCustomerSegment[]; kpis: { newVsReturningRatio: number; repeatPurchaseRate: number; avgLtv: number; ltvCacRatio: number } } {
    const cohorts: CustomerCohortMonth[] = [
      {
        cohortMonth: 'Tháng 05/2026',
        initialCustomers: 120,
        retentionByMonth: [
          { monthIndex: 0, activeCount: 120, retentionRate: 100, revenueGenerated: 36000000 },
          { monthIndex: 1, activeCount: 38, retentionRate: 31.6, revenueGenerated: 14200000 },
          { monthIndex: 2, activeCount: 26, retentionRate: 21.6, revenueGenerated: 9800000 },
          { monthIndex: 3, activeCount: 22, retentionRate: 18.3, revenueGenerated: 8400000 }
        ]
      },
      {
        cohortMonth: 'Tháng 06/2026',
        initialCustomers: 145,
        retentionByMonth: [
          { monthIndex: 0, activeCount: 145, retentionRate: 100, revenueGenerated: 46400000 },
          { monthIndex: 1, activeCount: 52, retentionRate: 35.8, revenueGenerated: 19500000 },
          { monthIndex: 2, activeCount: 36, retentionRate: 24.8, revenueGenerated: 13200000 }
        ]
      },
      {
        cohortMonth: 'Tháng 07/2026',
        initialCustomers: 168,
        retentionByMonth: [
          { monthIndex: 0, activeCount: 168, retentionRate: 100, revenueGenerated: 57120000 },
          { monthIndex: 1, activeCount: 64, retentionRate: 38.0, revenueGenerated: 24320000 }
        ]
      },
      {
        cohortMonth: 'Tháng 08/2026',
        initialCustomers: 190,
        retentionByMonth: [
          { monthIndex: 0, activeCount: 190, retentionRate: 100, revenueGenerated: 66500000 }
        ]
      }
    ];

    const rfmSegments: RfmCustomerSegment[] = [
      {
        segmentName: 'Champions',
        customerCount: 42,
        percentOfTotal: 12.5,
        avgMonetary: 3450000,
        avgFrequency: 4.8,
        avgRecencyDays: 8,
        recommendedAction: 'Chương trình VIP độc quyền, tặng quà sinh nhật, mời thử nghiệm sản phẩm sớm.'
      },
      {
        segmentName: 'Loyal Customers',
        customerCount: 86,
        percentOfTotal: 25.6,
        avgMonetary: 1850000,
        avgFrequency: 2.9,
        avgRecencyDays: 19,
        recommendedAction: 'Upsell phụ kiện & combo giá trị cao; giới thiệu chương trình giới thiệu bạn bè.'
      },
      {
        segmentName: 'Potential Loyalists',
        customerCount: 94,
        percentOfTotal: 28.0,
        avgMonetary: 920000,
        avgFrequency: 1.6,
        avgRecencyDays: 32,
        recommendedAction: 'Gửi voucher kích hoạt lần mua thứ 2 trong vòng 14 ngày sau đơn đầu.'
      },
      {
        segmentName: 'At Risk',
        customerCount: 68,
        percentOfTotal: 20.2,
        avgMonetary: 1200000,
        avgFrequency: 2.1,
        avgRecencyDays: 78,
        recommendedAction: 'Gửi email/SMS chiến dịch Win-Back với ưu đãi cá nhân hóa theo SKU đã mua.'
      },
      {
        segmentName: 'Lost',
        customerCount: 46,
        percentOfTotal: 13.7,
        avgMonetary: 450000,
        avgFrequency: 1.0,
        avgRecencyDays: 140,
        recommendedAction: 'Chỉ gửi chiến dịch xả kho giảm sâu hoặc khảo sát lý do rời bỏ.'
      }
    ];

    return {
      cohorts,
      rfmSegments,
      kpis: {
        newVsReturningRatio: 38.5, // 38.5% returning customers
        repeatPurchaseRate: 34.2,  // 34.2% purchase again
        avgLtv: 2150000,           // Estimated Lifetime Value (VND)
        ltvCacRatio: 4.2           // LTV / CAC healthy benchmark > 3.0
      }
    };
  }

  /**
   * Operations Analytics Performance
   */
  public getOperationsPerformance(): OperationsPerformanceMetrics {
    return {
      avgCycleTimeHours: 3.4,
      avgPickingTimeMinutes: 14.5,
      avgPackingTimeMinutes: 8.2,
      slaComplianceRate: 98.2,
      firstAttemptDeliveryRate: 94.6,
      failedDeliveryRate: 3.2,
      returnRate: 3.8,
      damagedStockRate: 0.4,
      warehousePerformance: [
        {
          warehouseId: 'wh_main_hcm',
          warehouseName: 'Kho Tổng TP. Hồ Chí Minh',
          ordersProcessed: 340,
          slaComplianceRate: 98.8,
          avgCycleTimeHours: 3.1,
          errorRate: 0.2
        },
        {
          warehouseId: 'wh_north_hanoi',
          warehouseName: 'Kho Chi Nhánh Hà Nội',
          ordersProcessed: 180,
          slaComplianceRate: 97.4,
          avgCycleTimeHours: 3.9,
          errorRate: 0.5
        }
      ]
    };
  }

  /**
   * Cash & Working Capital Overview
   */
  public getWorkingCapitalOverview(): WorkingCapitalOverview {
    const inv5 = mockStore.getInventory5State();
    const products = mockStore.getProducts();

    const inventoryCapital = inv5.reduce((sum, i) => {
      const prod = products.find(p => p.id === i.product_id || p.sku === i.sku);
      return sum + i.physical * (prod?.moving_avg_cost || prod?.cost || 100000);
    }, 0);

    const availableCash = 24500000;
    const pendingMarketplaceSettlements = 6850000;
    const supplierPayables = 8200000;
    const workingCapitalGap = (pendingMarketplaceSettlements + inventoryCapital) - supplierPayables;

    return {
      availableCash,
      inventoryCapital,
      pendingMarketplaceSettlements,
      supplierPayables,
      workingCapitalGap,
      daysInventoryOutstanding: 42,
      daysSalesOutstanding: 8,
      daysPayablesOutstanding: 16,
      cashConversionCycleDays: 34, // CCC = 42 + 8 - 16 = 34 days
      settlementBatches: [
        { channel: 'shopee', cycleDate: '2026-10-31', amount: 3250000, status: 'PENDING' },
        { channel: 'tiktok', cycleDate: '2026-10-30', amount: 2100000, status: 'PENDING' },
        { channel: 'lazada', cycleDate: '2026-10-28', amount: 1500000, status: 'PAID' }
      ]
    };
  }
}

export const analyticsService = new AnalyticsService();
