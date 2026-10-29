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

    let daysCount = 30;
    if (period === 'today') daysCount = 1;
    else if (period === 'yesterday') daysCount = 1;
    else if (period === 'last_7_days') daysCount = 7;
    else if (period === 'last_30_days') daysCount = 30;
    else if (period === 'this_month') daysCount = 30;
    else if (period === 'last_month') daysCount = 30;

    const currentStart = new Date(now.getTime() - daysCount * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - daysCount * 2 * 24 * 60 * 60 * 1000);

    const current = orders.filter(o => {
      const d = parseDate(o.created_at || o.placed_at);
      return d >= currentStart && d <= now;
    });

    const previous = orders.filter(o => {
      const d = parseDate(o.created_at || o.placed_at);
      return d >= previousStart && d < currentStart;
    });

    return { current: current.length ? current : orders, previous };
  }

  /**
   * Get Order Economics for all or filtered orders
   */
  public getOrderEconomics(tenantId?: string): OrderUnitEconomics[] {
    const orders = mockStore.getOrders(tenantId);
    const products = mockStore.getProducts();

    return orders.map(order => {
      const orderItems = mockStore.getOrderWithCustomer(order.id)?.items || [];
      
      // Calculate COGS from products
      let totalCogs = 0;
      orderItems.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        const unitCost = prod?.moving_avg_cost ?? prod?.cost ?? 0;
        totalCogs += unitCost * (item.quantity || 1);
      });

      // If order items were empty, fallback to estimated 50% COGS
      if (totalCogs === 0 && order.total > 0) {
        totalCogs = Math.round(order.total * 0.48);
      }

      const grossSales = order.subtotal || order.total || 0;
      const discounts = order.discount || 0;
      const returnsRefunds = order.payment_status === 'refunded' ? order.total : order.payment_status === 'partially_paid' ? 0 : 0;

      // Estimated marketing allocation per order (~8% for ecommerce)
      const attributedMarketing = Math.round(grossSales * 0.08);

      const contrib = calculateOrderContribution({
        grossSales,
        discounts,
        returnsRefunds,
        cogs: totalCogs,
        channel: order.channel || 'website',
        attributedMarketing
      });

      const fixedOverheadEstimate = Math.round(contrib.netRevenue * 0.05); // 5% rent & tech SaaS

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        channel: order.channel || 'website',
        placedAt: order.placed_at || order.created_at,
        orderStatus: order.order_status || order.status,
        grossSales,
        discounts,
        returnsRefunds,
        netRevenue: contrib.netRevenue,
        cogs: contrib.cogs,
        cm1: contrib.cm1,
        cm1Margin: contrib.cm1Margin,
        marketplaceFees: contrib.marketplaceFees,
        paymentFees: contrib.paymentFees,
        fulfillmentCosts: contrib.fulfillmentCosts,
        shippingSubsidies: order.shipping > 0 ? 0 : 15000,
        returnCosts: returnsRefunds > 0 ? 25000 : 0,
        cm2: contrib.cm2,
        cm2Margin: contrib.cm2Margin,
        attributedMarketingCosts: contrib.attributedMarketingCosts,
        cm3: contrib.cm3,
        cm3Margin: contrib.cm3Margin,
        fixedOverheadEstimate,
        netProfitEstimate: contrib.cm3 - fixedOverheadEstimate,
        attributionType: 'ACTUAL'
      };
    });
  }

  /**
   * Get SKU Unit Economics with Break-even, ROI, and ABC/XYZ ranking
   */
  public getSkuEconomics(tenantId?: string): SkuUnitEconomics[] {
    const products = mockStore.getProducts();
    const orders = mockStore.getOrders(tenantId);
    const inv5 = mockStore.getInventory5State();

    // Map sales by product
    const salesMap = new Map<string, { unitsSold: number; totalGross: number; totalDiscounts: number; totalCogs: number }>();
    
    orders.forEach(o => {
      const items = mockStore.getOrderWithCustomer(o.id)?.items || [];
      items.forEach(it => {
        const prodId = it.product_id;
        const cur = salesMap.get(prodId) || { unitsSold: 0, totalGross: 0, totalDiscounts: 0, totalCogs: 0 };
        const prod = products.find(p => p.id === prodId);
        const cost = prod?.moving_avg_cost ?? prod?.cost ?? 0;
        cur.unitsSold += it.quantity || 1;
        cur.totalGross += (it.unit_price || 0) * (it.quantity || 1);
        cur.totalCogs += cost * (it.quantity || 1);
        salesMap.set(prodId, cur);
      });
    });

    const skus: SkuUnitEconomics[] = products.map(p => {
      const sales = salesMap.get(p.id) || {
        unitsSold: Math.max(2, Math.round(p.stock * 0.15)),
        totalGross: (p.price || 500000) * Math.max(2, Math.round(p.stock * 0.15)),
        totalDiscounts: 0,
        totalCogs: (p.cost || 250000) * Math.max(2, Math.round(p.stock * 0.15))
      };

      const asp = p.price || 0;
      const cogs = p.moving_avg_cost || p.cost || 0;
      const avgFees = Math.round(asp * 0.095); // Blended marketplace fee ~9.5%
      const avgFulfillment = 18000;
      const cmPerUnit = asp - cogs - avgFees - avgFulfillment;
      const cmPercent = safeDivide(cmPerUnit, asp) * 100;

      const inv = inv5.find(i => i.product_id === p.id || i.sku === p.sku);
      const physicalStock = inv?.physical ?? p.stock ?? 0;
      const stockValue = physicalStock * cogs;
      const totalContribution = sales.unitsSold * cmPerUnit;
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
   * Channel Economics across Shopee, TikTok Shop, Lazada, Website, Manual
   */
  public getChannelEconomics(tenantId?: string): ChannelUnitEconomics[] {
    const orders = mockStore.getOrders(tenantId);
    const orderEconomics = this.getOrderEconomics(tenantId);

    const channels: Array<{ id: Channel; name: string }> = [
      { id: 'shopee', name: 'Shopee Mall' },
      { id: 'tiktok', name: 'TikTok Shop' },
      { id: 'lazada', name: 'Lazada Flagship' },
      { id: 'website', name: 'Website D2C' },
      { id: 'manual', name: 'POS & Bán Trực Tiếp' }
    ];

    return channels.map(ch => {
      const chOrders = orderEconomics.filter(o => o.channel === ch.id);
      const count = chOrders.length;
      const grossSales = chOrders.reduce((sum, o) => sum + o.grossSales, 0);
      const netRevenue = chOrders.reduce((sum, o) => sum + o.netRevenue, 0);
      const cogs = chOrders.reduce((sum, o) => sum + o.cogs, 0);
      const marketplaceFees = chOrders.reduce((sum, o) => sum + o.marketplaceFees, 0);
      const fulfillmentCosts = chOrders.reduce((sum, o) => sum + o.fulfillmentCosts, 0);
      const marketingSpend = chOrders.reduce((sum, o) => sum + o.attributedMarketingCosts, 0);
      const cm1 = netRevenue - cogs;
      const cm2 = cm1 - marketplaceFees - fulfillmentCosts;
      const cm3 = cm2 - marketingSpend;

      const returnedOrders = chOrders.filter(o => o.orderStatus === 'refunded' || o.returnsRefunds > 0).length;

      return {
        channel: ch.id,
        channelName: ch.name,
        orderCount: count,
        grossSales,
        netRevenue,
        cogs,
        marketplaceFees,
        takeRate: Number((safeDivide(marketplaceFees, grossSales) * 100).toFixed(1)),
        fulfillmentCosts,
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
    const netRevenuePrev = orderEconPrev.reduce((sum, o) => sum + o.netRevenue, 0) || Math.round(netRevenueCurr * 0.88);

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

    // Waterfall P&L
    const grossSalesTotal = orderEconCurrent.reduce((sum, o) => sum + o.grossSales, 0);
    const discountsTotal = orderEconCurrent.reduce((sum, o) => sum + o.discounts, 0);
    const returnsTotal = orderEconCurrent.reduce((sum, o) => sum + o.returnsRefunds, 0);
    const cogsTotal = orderEconCurrent.reduce((sum, o) => sum + o.cogs, 0);
    const platformFeesTotal = orderEconCurrent.reduce((sum, o) => sum + o.marketplaceFees + o.paymentFees, 0);
    const fulfillmentTotal = orderEconCurrent.reduce((sum, o) => sum + o.fulfillmentCosts, 0);
    const marketingTotal = orderEconCurrent.reduce((sum, o) => sum + o.attributedMarketingCosts, 0);

    const waterfallPnL = [
      { name: '1. Tổng giá niêm yết (Gross)', amount: grossSalesTotal, type: 'positive' as const, percentageOfRevenue: 100 },
      { name: '2. Voucher & Khuyến mãi', amount: -discountsTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-discountsTotal, netRevenueCurr) * 100 },
      { name: '3. Hoàn hàng & Hủy đơn', amount: -returnsTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-returnsTotal, netRevenueCurr) * 100 },
      { name: '4. Doanh thu thuần (Net Revenue)', amount: netRevenueCurr, type: 'subtotal' as const, percentageOfRevenue: 100 },
      { name: '5. Giá vốn hàng bán (COGS)', amount: -cogsTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-cogsTotal, netRevenueCurr) * 100 },
      { name: '6. Lãi gộp CM1', amount: cm1Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm1Curr, netRevenueCurr) * 100 },
      { name: '7. Phí sàn TMĐT & Cổng thanh toán', amount: -platformFeesTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-platformFeesTotal, netRevenueCurr) * 100 },
      { name: '8. Chi phí nhặt đóng gói (WMS)', amount: -fulfillmentTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-fulfillmentTotal, netRevenueCurr) * 100 },
      { name: '9. Lợi nhuận đóng góp CM2', amount: cm2Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm2Curr, netRevenueCurr) * 100 },
      { name: '10. Chi phí Marketing & Ads', amount: -marketingTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(-marketingTotal, netRevenueCurr) * 100 },
      { name: '11. Lợi nhuận sau Ads CM3', amount: cm3Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm3Curr, netRevenueCurr) * 100 }
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
    const decisionInsights: DecisionInsight[] = [
      {
        id: 'ins_01',
        category: 'channel_performance',
        severity: 'WARNING',
        title: 'Kênh TikTok Shop doanh thu tăng mạnh nhưng CM3 sau Ads mỏng (6.2%)',
        descriptive: 'Trong 30 ngày qua, TikTok Shop chiếm 34% tổng doanh thu (7.980.000 ₫) nhưng chỉ tạo ra 495.000 ₫ lợi nhuận CM3.',
        diagnostic: 'Do chi phí Booking KOC và Flash Sale Voucher đẩy chi phí Marketing lên 18.5% doanh thu, cộng với tỷ lệ hoàn hàng cao (7.0%).',
        predictive: 'Nếu tiếp tục đẩy Ads livestream không kiểm soát ROAS, biên CM3 của TikTok Shop sẽ rơi vào mức âm trong đợt sale tới.',
        prescriptive: 'Giảm 25% ngân sách Ads mở rộng tệp mới; chỉ tập trung ngân sách retargeting vào 3 SKU có CM2 > 40%; chặn voucher cộng dồn.',
        calculationFormula: 'CM3 = CM2 (1.980.000 ₫) - Marketing Costs (1.485.000 ₫) = 495.000 ₫ (6.2%)',
        financialImpactEstimate: 850000,
        confidenceScore: 92,
        dataAttribution: 'ACTUAL',
        relatedEntityLink: { page: 'channelEconomics', label: 'Xem Chi Tiết Kênh' }
      },
      {
        id: 'ins_02',
        category: 'inventory_risk',
        severity: 'CRITICAL',
        title: 'SKU Bán chạy NEXUS-PRO-01 đối mặt nguy cơ đứt hàng trong 5 ngày',
        descriptive: 'Tồn kho khả dụng (Sellable) của NEXUS-PRO-01 còn 28 cái, vận tốc bán bình quân 5.6 cái/ngày.',
        diagnostic: 'Thời gian đặt hàng và giao hàng từ nhà cung cấp (Lead time) là 7 ngày, trong khi đơn PO-2026-004 vẫn chưa được phê duyệt đặt hàng.',
        predictive: 'Kho sẽ đứt hàng vào ngày thứ 5, ước tính thiệt hại mất doanh thu cơ hội khoảng 4.200.000 ₫ và tụt hạng thuật toán sàn.',
        prescriptive: 'Bấm phê duyệt khẩn cấp đơn mua hàng PO-2026-004 ngay hôm nay; tạm thời tắt chiến dịch Flash Sale cho SKU này để kéo dài runway.',
        calculationFormula: 'Runway = Sellable (28) / Velocity (5.6/ngày) = 5.0 ngày < Lead Time (7 ngày)',
        financialImpactEstimate: 4200000,
        confidenceScore: 98,
        dataAttribution: 'ACTUAL',
        relatedEntityLink: { page: 'inventoryAnalytics', label: 'Xem Tồn Kho' }
      },
      {
        id: 'ins_03',
        category: 'unit_economics',
        severity: 'OPPORTUNITY',
        title: 'SKU NEXUS-ACC-02 có biên lãi gộp CM1 vượt trội (68.4%) nhưng ít được đẩy Marketing',
        descriptive: 'Phụ kiện Tai Nghe Type-C đạt CM1 68.4% và CM2 48.2%, nhưng chỉ bán được 12 đơn do thiếu traffic.',
        diagnostic: 'Hiện chưa có chiến dịch Ads hay chương trình Mua kèm giảm giá (Bundle) nào liên kết sản phẩm này với dòng Flagship.',
        predictive: 'Nếu thiết lập Bundle bán kèm giảm 15% cho khách mua Điện thoại Flagship, có thể tăng AOV thêm 220.000 ₫ mỗi đơn.',
        prescriptive: 'Tạo combo tự động trên OMS kết nối Shopee/TikTok: Tặng voucher giảm 30k khi mua kèm Flagship, tăng lợi nhuận gộp thêm 1.8M/tháng.',
        calculationFormula: 'CM2 Bundle = ASP (280.000 ₫) - COGS (90.000 ₫) - Fees (42.000 ₫) = 148.000 ₫ (52.8%)',
        financialImpactEstimate: 1800000,
        confidenceScore: 88,
        dataAttribution: 'ACTUAL',
        relatedEntityLink: { page: 'skuEconomics', label: 'Xem SKU Economics' }
      }
    ];

    return {
      timePeriod: period,
      comparison,
      kpis: {
        netRevenue: { value: netRevenueCurr, previous: netRevenuePrev, delta: revDelta.delta, deltaPercent: revDelta.deltaPercent, trend: revDelta.trend },
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
    return [
      {
        campaignId: 'camp_01',
        name: 'Chiến dịch Meta Flash Sale Đầu Tháng',
        channel: 'website',
        platform: 'Facebook/Meta',
        adSpend: 2400000,
        impressions: 48000,
        clicks: 1920,
        cpc: 1250,
        conversions: 32,
        cpa: 75000,
        attributedRevenue: 14400000,
        roas: 6.0,
        cogs: 6800000,
        cmAfterAds: 3800000,
        status: 'PROFITABLE',
        attributionType: 'ACTUAL'
      },
      {
        campaignId: 'camp_02',
        name: 'TikTok Video KOC Review Công Nghệ',
        channel: 'tiktok',
        platform: 'TikTok Ads',
        adSpend: 3500000,
        impressions: 120000,
        clicks: 4800,
        cpc: 729,
        conversions: 45,
        cpa: 77777,
        attributedRevenue: 11250000,
        roas: 3.21,
        cogs: 5900000,
        cmAfterAds: 450000,
        status: 'OPTIMIZING',
        attributionType: 'ESTIMATED'
      },
      {
        campaignId: 'camp_03',
        name: 'Shopee In-App Search Ads Khóa Tồn',
        channel: 'shopee',
        platform: 'Shopee In-App',
        adSpend: 1800000,
        impressions: 34000,
        clicks: 1360,
        cpc: 1323,
        conversions: 28,
        cpa: 64285,
        attributedRevenue: 8960000,
        roas: 4.97,
        cogs: 4200000,
        cmAfterAds: 1960000,
        status: 'PROFITABLE',
        attributionType: 'ACTUAL'
      },
      {
        campaignId: 'camp_04',
        name: 'KOC Booking Livestream Mega Sale',
        channel: 'tiktok',
        platform: 'KOC Booking',
        adSpend: 2000000,
        impressions: 65000,
        clicks: 2200,
        cpc: 909,
        conversions: 14,
        cpa: 142857,
        attributedRevenue: 3500000,
        roas: 1.75,
        cogs: 2100000,
        cmAfterAds: -980000,
        status: 'LOSS_MAKING',
        attributionType: 'ESTIMATED'
      }
    ];
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
