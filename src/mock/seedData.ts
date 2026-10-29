import type { MockDatabaseSnapshot } from './types';

export const INITIAL_MOCK_DATABASE: MockDatabaseSnapshot = {
  schemaVersion: 2,
  lastUpdated: new Date().toISOString(),
  activeTenantId: 'tenant_flagship',
  activeRole: 'owner',

  // ============ Tenants ============
  tenants: [
    {
      id: 'tenant_flagship',
      slug: 'nexus-flagship',
      name: 'Nexus Flagship Store (Chính thức)',
      status: 'active',
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'tenant_logistics_3pl',
      slug: 'nexus-logistics-3pl',
      name: 'Nexus Logistics Hub 3PL',
      status: 'active',
      created_at: '2026-02-15T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'tenant_retail_hanoi',
      slug: 'nexus-retail-hanoi',
      name: 'Nexus Retail Chi Nhánh Hà Nội',
      status: 'active',
      created_at: '2026-03-01T08:30:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Memberships ============
  memberships: [
    {
      id: 'mship_owner',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_owner_01',
      role: 'owner',
      status: 'active',
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_admin',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_admin_01',
      role: 'admin',
      status: 'active',
      created_at: '2026-01-12T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_manager',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_manager_01',
      role: 'manager',
      status: 'active',
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_warehouse',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_warehouse_01',
      role: 'warehouse',
      status: 'active',
      created_at: '2026-02-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_finance',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_finance_01',
      role: 'finance',
      status: 'active',
      created_at: '2026-02-05T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_viewer',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_viewer_01',
      role: 'viewer',
      status: 'active',
      created_at: '2026-03-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Profiles ============
  profiles: [
    {
      id: 'usr_owner_01',
      email: 'owner@nexusoms.io',
      full_name: 'Nguyễn Thanh Bình (Chủ Sở Hữu)',
      role: 'admin',
      is_active: true,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_admin_01',
      email: 'admin@nexusoms.io',
      full_name: 'Trần Quản Trị (Admin Hệ Thống)',
      role: 'admin',
      is_active: true,
      created_at: '2026-01-12T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_manager_01',
      email: 'manager@nexusoms.io',
      full_name: 'Lê Vận Hành (Trưởng Phòng OMS)',
      role: 'manager',
      is_active: true,
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_warehouse_01',
      email: 'kho@nexusoms.io',
      full_name: 'Phạm Thủ Kho (Trưởng Kho)',
      role: 'warehouse',
      is_active: true,
      created_at: '2026-02-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_finance_01',
      email: 'ketoan@nexusoms.io',
      full_name: 'Vũ Kế Toán (Chuyên Viên Sổ Kép)',
      role: 'admin',
      is_active: true,
      created_at: '2026-02-05T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_viewer_01',
      email: 'viewer@nexusoms.io',
      full_name: 'Hoàng Quan Sát (Kiểm Toán Viên)',
      role: 'manager',
      is_active: true,
      created_at: '2026-03-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Warehouses ============
  warehouses: [
    {
      id: 'wh_north_01',
      tenant_id: 'tenant_flagship',
      code: 'WH-NORTH',
      name: 'Kho Tổng Miền Bắc (Hà Nội)',
      address: 'Khu Công Nghiệp Đài Tư, Q. Long Biên, Hà Nội',
      latitude: 21.033,
      longitude: 105.892,
      priority: 1,
      is_active: true,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'wh_south_01',
      tenant_id: 'tenant_flagship',
      code: 'WH-SOUTH',
      name: 'Kho Tổng Miền Nam (Bình Dương)',
      address: 'KCN VSIP 1, Thuận An, Bình Dương',
      latitude: 10.932,
      longitude: 106.702,
      priority: 2,
      is_active: true,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'wh_danang_01',
      tenant_id: 'tenant_flagship',
      code: 'WH-DANANG',
      name: 'Kho Trung Chuyển Đà Nẵng',
      address: 'KCN Hòa Khánh, Q. Liên Chiểu, Đà Nẵng',
      latitude: 16.074,
      longitude: 108.152,
      priority: 3,
      is_active: true,
      created_at: '2026-02-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Products ============
  products: [
    {
      id: 'prod_air_pro',
      tenant_id: 'tenant_flagship',
      name: 'Tai nghe Bluetooth ANC Nexus Pro',
      sku: 'NX-AIR-PRO',
      category: 'Âm Thanh & Phụ Kiện',
      price: 1250000,
      cost_price: 680000,
      stock: 180,
      reorder_level: 30,
      safety_stock: 20,
      sku_type: 'physical',
      barcode: '8938501239014',
      status: 'active',
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_titan_1l',
      tenant_id: 'tenant_flagship',
      name: 'Bình Giữ Nhiệt Titan 1000ml Nexus Hydro',
      sku: 'NX-TITAN-1L',
      category: 'Gia Dụng & Đời Sống',
      price: 390000,
      cost_price: 195000,
      stock: 95,
      reorder_level: 25,
      safety_stock: 15,
      sku_type: 'physical',
      barcode: '8938501239021',
      status: 'active',
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_kb_wave',
      tenant_id: 'tenant_flagship',
      name: 'Bàn phím cơ không dây Silent Wave 75%',
      sku: 'NX-KB-WAVE',
      category: 'Gaming & Công Nghệ',
      price: 1890000,
      cost_price: 1050000,
      stock: 60,
      reorder_level: 20,
      safety_stock: 10,
      sku_type: 'physical',
      barcode: '8938501239038',
      status: 'active',
      created_at: '2026-01-18T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_mouse_pro',
      tenant_id: 'tenant_flagship',
      name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
      sku: 'NX-MOUSE-PRO',
      category: 'Gaming & Công Nghệ',
      price: 850000,
      cost_price: 420000,
      stock: 120,
      reorder_level: 25,
      safety_stock: 15,
      sku_type: 'physical',
      barcode: '8938501239045',
      status: 'active',
      created_at: '2026-01-20T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_cable_100w',
      tenant_id: 'tenant_flagship',
      name: 'Cáp sạc nhanh Type-C Bọc Dù 100W E-Marker',
      sku: 'NX-CABLE-100W',
      category: 'Phụ Kiện Điện Thoại',
      price: 150000,
      cost_price: 55000,
      stock: 450,
      reorder_level: 80,
      safety_stock: 50,
      sku_type: 'physical',
      barcode: '8938501239052',
      status: 'active',
      created_at: '2026-01-22T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_hub_8in1',
      tenant_id: 'tenant_flagship',
      name: 'Hub Chuyển Đổi USB-C Đa Năng 8 trong 1 4K@60Hz',
      sku: 'NX-HUB-8IN1',
      category: 'Gaming & Công Nghệ',
      price: 680000,
      cost_price: 340000,
      stock: 75,
      reorder_level: 20,
      safety_stock: 10,
      sku_type: 'physical',
      barcode: '8938501239069',
      status: 'active',
      created_at: '2026-01-25T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ 5-State Inventory ============
  inventory5State: [
    {
      sku: 'NX-AIR-PRO',
      product_id: 'prod_air_pro',
      name: 'Tai nghe Bluetooth ANC Nexus Pro',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 180,
      reserved: 45,
      available: 135,
      damaged: 2,
      inbound: 100,
      safety_stock: 20,
      reorder_level: 30,
      sales_velocity: 8.5,
      runway_days: 16,
      status: 'Healthy'
    },
    {
      sku: 'NX-TITAN-1L',
      product_id: 'prod_titan_1l',
      name: 'Bình Giữ Nhiệt Titan 1000ml Nexus Hydro',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 95,
      reserved: 25,
      available: 70,
      damaged: 0,
      inbound: 50,
      safety_stock: 15,
      reorder_level: 25,
      sales_velocity: 6.2,
      runway_days: 11,
      status: 'Healthy'
    },
    {
      sku: 'NX-KB-WAVE',
      product_id: 'prod_kb_wave',
      name: 'Bàn phím cơ không dây Silent Wave 75%',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 60,
      reserved: 18,
      available: 42,
      damaged: 1,
      inbound: 40,
      safety_stock: 10,
      reorder_level: 20,
      sales_velocity: 4.8,
      runway_days: 8,
      status: 'Warning'
    },
    {
      sku: 'NX-MOUSE-PRO',
      product_id: 'prod_mouse_pro',
      name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 120,
      reserved: 30,
      available: 90,
      damaged: 3,
      inbound: 60,
      safety_stock: 15,
      reorder_level: 25,
      sales_velocity: 7.1,
      runway_days: 12,
      status: 'Healthy'
    },
    {
      sku: 'NX-CABLE-100W',
      product_id: 'prod_cable_100w',
      name: 'Cáp sạc nhanh Type-C Bọc Dù 100W E-Marker',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 450,
      reserved: 120,
      available: 330,
      damaged: 0,
      inbound: 200,
      safety_stock: 50,
      reorder_level: 80,
      sales_velocity: 24.0,
      runway_days: 14,
      status: 'Healthy'
    },
    {
      sku: 'NX-HUB-8IN1',
      product_id: 'prod_hub_8in1',
      name: 'Hub Chuyển Đổi USB-C Đa Năng 8 trong 1 4K@60Hz',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 75,
      reserved: 15,
      available: 60,
      damaged: 2,
      inbound: 30,
      safety_stock: 10,
      reorder_level: 20,
      sales_velocity: 3.5,
      runway_days: 17,
      status: 'Healthy'
    }
  ],

  // ============ Customers ============
  customers: [
    {
      id: 'cust_01',
      tenant_id: 'tenant_flagship',
      name: 'Hoàng Minh Tâm',
      email: 'minhtam.hoang@gmail.com',
      phone: '0912345678',
      company: 'Công Ty TNHH Truyền Thông Tâm An',
      address: 'Số 45 Lê Duẩn, Hoàn Kiếm, Hà Nội',
      status: 'active',
      tier: 'gold',
      created_at: '2026-02-10T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'cust_02',
      tenant_id: 'tenant_flagship',
      name: 'Lê Thu Hà',
      email: 'thuha.le@outlook.com',
      phone: '0987654321',
      company: 'Cửa hàng Bán lẻ Phụ kiện Hà Nội',
      address: 'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
      status: 'active',
      tier: 'silver',
      created_at: '2026-02-14T11:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'cust_03',
      tenant_id: 'tenant_flagship',
      name: 'Nguyễn Văn Bình',
      email: 'binh.nguyen@vietcorp.vn',
      phone: '0903456789',
      company: 'VietCorp Technology Group',
      address: 'Tòa nhà Bitexco, Q.1, TP. Hồ Chí Minh',
      status: 'active',
      tier: 'platinum',
      created_at: '2026-02-18T14:30:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'cust_04',
      tenant_id: 'tenant_flagship',
      name: 'Trần Mai Linh',
      email: 'mailinh.tran@studio8.vn',
      phone: '0933221100',
      company: 'Studio 8 Thiết Kế',
      address: 'Số 88 Nguyễn Thị Minh Khai, Q.3, TP. Hồ Chí Minh',
      status: 'active',
      tier: 'standard',
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Suppliers ============
  suppliers: [
    {
      id: 'supp_foxconn',
      tenant_id: 'tenant_flagship',
      code: 'SUPP-FOXCONN',
      name: 'Foxconn Acoustic Technology VN',
      contact_person: 'Trương Quốc Bảo',
      email: 'bao.truong@foxconn-vn.com',
      phone: '0241-3892019',
      address: 'KCN Quế Võ, Bắc Ninh',
      payment_terms: 'Net 30',
      lead_time_days: 7,
      rating: 4.8,
      created_at: '2026-01-10T08:00:00Z'
    },
    {
      id: 'supp_titan',
      tenant_id: 'tenant_flagship',
      code: 'SUPP-TITAN',
      name: 'Titan Hardware Manufacturing Co.',
      contact_person: 'Vũ Đình Cường',
      email: 'sales@titan-hardware.vn',
      phone: '0274-3782910',
      address: 'KCN Sóng Thần, Dĩ An, Bình Dương',
      payment_terms: 'Net 45',
      lead_time_days: 5,
      rating: 4.9,
      created_at: '2026-01-15T08:00:00Z'
    },
    {
      id: 'supp_silent_wave',
      tenant_id: 'tenant_flagship',
      code: 'SUPP-KEYCHRON',
      name: 'KeyPrecision Tech Co., Ltd',
      contact_person: 'Lý Gia Hưng',
      email: 'hung.ly@keyprecision.io',
      phone: '0908819201',
      address: 'Khu Công Nghệ Cao Q.9, TP. Thủ Đức',
      payment_terms: 'COD',
      lead_time_days: 10,
      rating: 4.7,
      created_at: '2026-02-01T08:00:00Z'
    }
  ],

  // ============ Orders ============
  orders: [
    {
      id: 'ord_90214',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-90214',
      customer_id: 'cust_01',
      status: 'processing',
      subtotal: 1250000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 1250000,
      total_amount: 1250000,
      channel: 'shopee',
      channel_order_sn: '261028SHP90214',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
      notes: 'Đơn Shopee Flash Sale — Giao hỏa tốc trước 17h',
      placed_at: '2026-10-28T09:15:00Z',
      created_at: '2026-10-28T09:15:00Z',
      updated_at: '2026-10-28T09:20:00Z',
      assigned_warehouse_id: 'wh_north_01',
      fulfillment_wave_id: 'wave_410'
    },
    {
      id: 'ord_44812',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-44812',
      customer_id: 'cust_02',
      status: 'pending',
      subtotal: 780000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 780000,
      total_amount: 780000,
      channel: 'tiktok',
      channel_order_sn: 'TTK-2026-44812',
      payment_status: 'unpaid',
      payment_method: 'cash',
      shipping_address: '12 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP.HCM',
      notes: 'Đơn TikTok Shop — Đang chờ gom sóng Wave #W-410',
      placed_at: '2026-10-28T10:30:00Z',
      created_at: '2026-10-28T10:30:00Z',
      updated_at: '2026-10-28T10:30:00Z',
      assigned_warehouse_id: 'wh_north_01',
      fulfillment_wave_id: 'wave_410'
    },
    {
      id: 'ord_10924',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-10924',
      customer_id: 'cust_03',
      status: 'shipped',
      subtotal: 1890000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 1890000,
      total_amount: 1890000,
      channel: 'lazada',
      channel_order_sn: 'LZD-VN-10924',
      payment_status: 'paid',
      payment_method: 'credit_card',
      shipping_address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
      notes: 'Đơn Lazada Mall — Đã bàn giao SPX Express',
      placed_at: '2026-10-28T07:45:00Z',
      shipped_at: '2026-10-28T11:00:00Z',
      created_at: '2026-10-28T07:45:00Z',
      updated_at: '2026-10-28T11:00:00Z',
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_88201',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-88201',
      customer_id: 'cust_04',
      status: 'delivered',
      subtotal: 2190000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 2190000,
      total_amount: 2190000,
      channel: 'direct',
      channel_order_sn: 'WEB-88201',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Khu công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội',
      notes: 'Đơn Website Direct — Khách đã nhận hàng và ký nhận',
      placed_at: '2026-10-27T14:20:00Z',
      shipped_at: '2026-10-27T16:00:00Z',
      delivered_at: '2026-10-28T08:10:00Z',
      created_at: '2026-10-27T14:20:00Z',
      updated_at: '2026-10-28T08:10:00Z',
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_77190',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-77190',
      customer_id: 'cust_01',
      status: 'cancelled',
      subtotal: 390000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 390000,
      total_amount: 390000,
      channel: 'shopee',
      channel_order_sn: '261027SHP77190',
      payment_status: 'refunded',
      payment_method: 'bank_transfer',
      shipping_address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, TP.HCM',
      notes: 'Khách đổi ý muốn lấy size lớn hơn — Tồn đã giải phóng tự động',
      placed_at: '2026-10-27T16:00:00Z',
      created_at: '2026-10-27T16:00:00Z',
      updated_at: '2026-10-27T16:30:00Z',
      assigned_warehouse_id: 'wh_north_01'
    }
  ],

  // ============ Order Items ============
  orderItems: [
    {
      id: 'item_90214_1',
      order_id: 'ord_90214',
      product_id: 'prod_air_pro',
      product_name: 'Tai nghe Bluetooth Nexus Air Pro',
      product_sku: 'NX-AIR-PRO',
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      total_price: 1250000,
      unit_cost_mac_snapshot: 650000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: '2026-10-28T09:15:00Z'
    },
    {
      id: 'item_44812_1',
      order_id: 'ord_44812',
      product_id: 'prod_titan_1l',
      product_name: 'Bình giữ nhiệt Titan 1L',
      product_sku: 'NX-TITAN-1L',
      quantity: 2,
      unit_price: 390000,
      line_total: 780000,
      total_price: 780000,
      unit_cost_mac_snapshot: 180000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: '2026-10-28T10:30:00Z'
    },
    {
      id: 'item_10924_1',
      order_id: 'ord_10924',
      product_id: 'prod_kb_wave',
      product_name: 'Bàn phím cơ Wave 75 Pro',
      product_sku: 'NX-KB-WAVE',
      quantity: 1,
      unit_price: 1890000,
      line_total: 1890000,
      total_price: 1890000,
      unit_cost_mac_snapshot: 950000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: '2026-10-28T07:45:00Z'
    },
    {
      id: 'item_88201_1',
      order_id: 'ord_88201',
      product_id: 'prod_air_pro',
      product_name: 'Tai nghe Bluetooth Nexus Air Pro',
      product_sku: 'NX-AIR-PRO',
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      total_price: 1250000,
      unit_cost_mac_snapshot: 650000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: '2026-10-27T14:20:00Z'
    },
    {
      id: 'item_88201_2',
      order_id: 'ord_88201',
      product_id: 'prod_mouse_pro',
      product_name: 'Chuột không dây Silent Click M1',
      product_sku: 'NX-MOUSE-PRO',
      quantity: 1,
      unit_price: 850000,
      line_total: 850000,
      total_price: 850000,
      unit_cost_mac_snapshot: 420000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: '2026-10-27T14:20:00Z'
    },
    {
      id: 'item_88201_3',
      order_id: 'ord_88201',
      product_id: 'prod_cable_100w',
      product_name: 'Cáp sạc nhanh 100W C-to-C bọc dù',
      product_sku: 'NX-CABLE-100W',
      quantity: 1,
      unit_price: 90000,
      line_total: 90000,
      total_price: 90000,
      unit_cost_mac_snapshot: 35000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: '2026-10-27T14:20:00Z'
    },
    {
      id: 'item_77190_1',
      order_id: 'ord_77190',
      product_id: 'prod_titan_1l',
      product_name: 'Bình giữ nhiệt Titan 1L',
      product_sku: 'NX-TITAN-1L',
      quantity: 1,
      unit_price: 390000,
      line_total: 390000,
      total_price: 390000,
      unit_cost_mac_snapshot: 180000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: '2026-10-27T16:00:00Z'
    }
  ],

  // ============ Picking Waves ============
  pickingWaves: [
    {
      id: 'wave_410',
      tenant_id: 'tenant_flagship',
      wave_number: 'WAVE-W410',
      warehouse_id: 'wh_north_01',
      status: 'picking',
      total_orders: 40,
      total_items: 68,
      picked_items: 58,
      assigned_to: 'usr_warehouse_01',
      created_at: '2026-10-28T09:00:00Z',
      completed_at: null
    }
  ],

  // ============ Returns & RMA ============
  returns: [
    {
      id: 'ret_001',
      tenant_id: 'tenant_flagship',
      return_number: 'RMA-2026-009',
      order_id: 'ord_88201',
      customer_id: 'cust_04',
      reason: 'Khách muốn đổi sang bản màu Trắng Bạc',
      status: 'quality_check',
      return_type: 'customer_rma',
      created_at: '2026-10-28T11:00:00Z',
      updated_at: '2026-10-28T11:20:00Z'
    }
  ],

  returnItems: [
    {
      id: 'reti_001',
      return_id: 'ret_001',
      product_id: 'prod_mouse_pro',
      quantity: 1,
      reason: 'Đổi màu',
      condition: 'sealed',
      disposition: 'restock',
      created_at: '2026-10-28T11:00:00Z'
    }
  ],

  // ============ Batches ============
  batches: [
    {
      id: 'batch_01',
      tenant_id: 'tenant_flagship',
      product_id: 'prod_air_pro',
      batch_number: 'LOT-2026-ANC-01',
      expiry_date: '2028-06-30',
      initial_quantity: 200,
      remaining_quantity: 180,
      status: 'active',
      created_at: '2026-01-15T08:00:00Z'
    }
  ],

  // ============ Serials & Warranty ============
  serials: [
    {
      id: 'ser_01',
      tenant_id: 'tenant_flagship',
      serial_number: 'NX-PRO-8921401',
      sku: 'NX-AIR-PRO',
      product_name: 'Tai nghe Bluetooth ANC Nexus Pro',
      status: 'sold',
      warehouse_id: 'wh_north_01',
      order_id: 'ord_90214',
      customer_name: 'Hoàng Minh Tâm',
      warranty_start: '2026-10-28',
      warranty_months: 12,
      warranty_end: '2027-10-28',
      rma_history: []
    },
    {
      id: 'ser_02',
      tenant_id: 'tenant_flagship',
      serial_number: 'NX-WAVE-1092401',
      sku: 'NX-KB-WAVE',
      product_name: 'Bàn phím cơ không dây Silent Wave 75%',
      status: 'in_stock',
      warehouse_id: 'wh_north_01',
      warranty_months: 24,
      rma_history: []
    }
  ],

  // ============ Stock Ledger ============
  stockLedger: [
    {
      id: 'sl_001',
      tenant_id: 'tenant_flagship',
      product_id: 'prod_air_pro',
      warehouse_id: 'wh_north_01',
      transaction_type: 'reservation',
      quantity: 1,
      reference_type: 'order',
      reference_id: 'ord_90214',
      notes: 'Khóa 1x NX-AIR-PRO cho đơn #ORD-90214 (Shopee)',
      balance_after: 135,
      created_at: '2026-10-28T09:15:00Z'
    },
    {
      id: 'sl_002',
      tenant_id: 'tenant_flagship',
      product_id: 'prod_titan_1l',
      warehouse_id: 'wh_north_01',
      transaction_type: 'release',
      quantity: 1,
      reference_type: 'order',
      reference_id: 'ord_77190',
      notes: 'Giải phóng giữ tồn do hủy đơn #ORD-77190',
      balance_after: 70,
      created_at: '2026-10-27T16:30:00Z'
    }
  ],

  // ============ Double-Entry Journal Entries ============
  journalEntries: [
    {
      id: 'je_89021',
      tenant_id: 'tenant_flagship',
      entry_number: 'JE-2026-89021',
      reference_type: 'order',
      reference_id: 'ord_90214',
      description: 'Hạch toán doanh thu bán Shopee #ORD-90214',
      posted_at: '2026-10-28T09:20:00Z',
      posted_by: 'usr_finance_01',
      status: 'posted',
      created_at: '2026-10-28T09:20:00Z'
    }
  ],

  journalLines: [
    {
      id: 'jl_01',
      entry_id: 'je_89021',
      account_id: 'acc_131_shopee',
      account_code: '131_SHOPEE',
      debit: 1150000,
      credit: 0,
      description: 'Phải thu sàn Shopee'
    },
    {
      id: 'jl_02',
      entry_id: 'je_89021',
      account_id: 'acc_641_fee',
      account_code: '641_FEE',
      debit: 100000,
      credit: 0,
      description: 'Chi phí hoa hồng & dịch vụ thanh toán Shopee'
    },
    {
      id: 'jl_03',
      entry_id: 'je_89021',
      account_id: 'acc_511_sales',
      account_code: '511_REVENUE',
      debit: 0,
      credit: 1250000,
      description: 'Doanh thu bán lẻ sản phẩm'
    }
  ],

  // ============ Reconciliations ============
  reconciliations: [
    {
      id: 'rec_shopee_oct_w4',
      tenant_id: 'tenant_flagship',
      settlement_id: 'SETTLE-SPX-2026-W43',
      channel: 'shopee',
      period_start: '2026-10-21',
      period_end: '2026-10-27',
      order_count: 148,
      gross_sales: 185000000,
      platform_fees: 14800000,
      commission: 9250000,
      shipping_subsidies: 1850000,
      net_payout: 162800000,
      system_calculated_payout: 162800000,
      discrepancy: 0,
      status: 'matched',
      settled_at: '2026-10-28T08:00:00Z'
    },
    {
      id: 'rec_tiktok_oct_w4',
      tenant_id: 'tenant_flagship',
      settlement_id: 'SETTLE-TT-2026-W43',
      channel: 'tiktok',
      period_start: '2026-10-21',
      period_end: '2026-10-27',
      order_count: 92,
      gross_sales: 71760000,
      platform_fees: 5740800,
      commission: 3588000,
      shipping_subsidies: 920000,
      net_payout: 63351200,
      system_calculated_payout: 63351200,
      discrepancy: 0,
      status: 'matched',
      settled_at: '2026-10-28T08:30:00Z'
    }
  ],

  // ============ Audit Logs ============
  auditLogs: [
    {
      id: 'audit_01',
      action: 'ORDER_ATOMIC_RESERVATION',
      entity: 'orders',
      entity_id: 'ord_90214',
      actor: 'system_atomic_rpc',
      details: { sku: 'NX-AIR-PRO', quantity: 1, available_before: 136, available_after: 135 },
      created_at: '2026-10-28T09:15:00Z'
    },
    {
      id: 'audit_02',
      action: 'DOUBLE_ENTRY_BALANCED_POST',
      entity: 'journal_entries',
      entity_id: 'je_89021',
      actor: 'usr_finance_01',
      details: { debit_sum: 1250000, credit_sum: 1250000, balanced: true },
      created_at: '2026-10-28T09:20:00Z'
    }
  ]
};
