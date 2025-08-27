import React, { useState, useEffect, useMemo } from 'react';
import TabBar from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import './AnalyticsDashboard.scss';

// ───────────────────────────── Helpers ─────────────────────────────
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount) || amount < 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};



// 🔥 LOGIC LẤY THÔNG TIN KHÁCH HÀNG GIỐNG CUSTOMERMANAGEMENT.JSX  
const getCustomerAddress = (customer) => {
  if (customer.address_detail && customer.address_detail.full_address) {
    return customer.address_detail.full_address;
  }
  
  if (customer.address_detail) {
    const { street, ward, district, city } = customer.address_detail;
    const parts = [street, ward, district, city].filter(part => part && part.trim() !== '');
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }
  
  return 'Chưa cập nhật địa chỉ';
};

const getCustomerOrderCount = (customer) => {
  return customer.total_orders || 0;
};

const getCustomerTotalSpent = (customer) => {
  return customer.total_spent || 0;
};

// ───────────────────────────── Component ─────────────────────────────
const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rawData, setRawData] = useState({
    bills: [],
    users: [], // 🔥 SỬ DỤNG ENDPOINT /users/with-accounts
    products: [],
    shippers: [], // 🔥 THÊM SHIPPERS DATA
    billDetails: {}, // 🔥 THÊM CACHE CHO BILL DETAILS
  });
  const [timeFilter, setTimeFilter] = useState('month');

  const getEmptyAnalytics = () => ({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    cancellationRate: 0,
    topCustomers: [],
    topProducts: [],
    dailyRevenue: {},
    dailyOrders: {},
    customerRetention: 0,
    bestSellingHour: '12',
    ordersByStatus: {},
    totalProductsSold: 0,
    avgCustomerValue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    pendingOrders: 0,
    completedRevenue: 0,
    detailedStats: {
      totalBillsInRange: 0,
      completionRate: 0,
    },
  });

  // ── Fetch Data 🔥 SỬ DỤNG ĐÚNG API ENDPOINTS VÀ LẤY CHI TIẾT SẢN PHẨM
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [billsRes, usersRes, productsRes, shippersRes] = await Promise.all([
        api.get('/bills/enhanced?enrich=true'), // 🔥 SỬ DỤNG ENHANCED API GIỐNG BILLMANAGEMENT
        api.get('/users/with-accounts', { params: { limit: 1000 } }), // 🔥 SỬ DỤNG API GIỐNG CUSTOMERMANAGEMENT
        api.get('/products'),
        api.get('/shippers').catch(() => ({ data: { data: [] } })) // 🔥 THÊM API SHIPPERS VỚI FALLBACK
      ]);

      console.log('🔍 Bills response:', billsRes?.data?.data?.length || 0);
      console.log('🔍 Users response:', usersRes?.data?.data?.customers?.length || 0);
      console.log('🔍 Products response:', productsRes?.data?.data?.length || 0);
      console.log('🔍 Shippers response:', shippersRes?.data?.data?.length || 0);

      // 🔥 KIỂM TRA CẤU TRÚC BILL THỰC TẾ
      const bills = billsRes?.data?.data ?? [];
      if (bills.length > 0) {
        console.log('🔍 Full bill structure sample:', bills[0]);
        console.log('🔍 Bill fields:', Object.keys(bills[0]));
        
        // 🔥 THỬ LẤY CHI TIẾT CỦA 1 BILL ĐỂ KIỂM TRA
        if (bills[0]._id) {
          try {
            const billDetailRes = await api.get(`/bills/${bills[0]._id}`);
            console.log('🔍 Single bill detail:', billDetailRes?.data);
            console.log('🔍 Single bill fields:', Object.keys(billDetailRes?.data || {}));
          } catch (error) {
            console.log('🔍 Cannot fetch single bill detail:', error.message);
          }
        }
      }

      // 🔥 LẤY CHI TIẾT BILL NGAY LẬP TỨC
      console.log('🔍 Fetching bill details immediately...');
      
      // Lọc bill done trong 30 ngày gần nhất
      const recentDoneBills = bills.filter(bill => {
        if (bill.status?.toLowerCase() !== 'done') return false;
        
        const billDate = new Date(bill.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return billDate >= thirtyDaysAgo;
      }).slice(0, 10); // Lấy 10 bill để đảm bảo có đủ data
      
      console.log('🔍 Fetching details for', recentDoneBills.length, 'recent done bills');
      
      const billDetailsCache = {};
      
      // Fetch từng bill detail để lấy items
      for (const bill of recentDoneBills) {
        try {
          const billDetailRes = await api.get(`/bills/${bill._id}`);
          const billDetail = billDetailRes?.data?.data || billDetailRes?.data;
          
          if (billDetail && billDetail.items) {
            billDetailsCache[bill._id] = billDetail;
            console.log(`✅ Fetched bill ${bill._id}: ${billDetail.items?.length || 0} items`);
            
            // Debug first item
            if (billDetail.items && billDetail.items.length > 0) {
              console.log(`🔍 Sample item:`, {
                product_id: billDetail.items[0].product_id,
                productName: billDetail.items[0].productName,
                quantity: billDetail.items[0].quantity
              });
            }
          }
        } catch (error) {
          console.log(`❌ Failed to fetch bill detail ${bill._id}:`, error.message);
        }
      }
      
      console.log('🔍 Successfully fetched details for', Object.keys(billDetailsCache).length, 'bills');

      // 🔥 DEBUG: CHECK PRODUCTS DATA STRUCTURE
      const productsData = productsRes?.data?.data ?? [];
      if (productsData.length > 0) {
        console.log('🔍 Sample product structure:', productsData[0]);
        console.log('🔍 Product fields:', Object.keys(productsData[0]));
        console.log('🔍 Products with images:', productsData.filter(p => p.image).length);
        productsData.slice(0, 3).forEach(p => {
          console.log(`🔍 Product ${p._id}:`, {
            name: p.name,
            image: p.image,
            image_url: p.image_url,
            category_id: p.category_id
          });
        });
      }

      setRawData({
        bills: bills,
        users: usersRes?.data?.data?.customers ?? [],
        products: productsData,
        shippers: shippersRes?.data?.data ?? [], // 🔥 THÊM SHIPPERS DATA
        billDetails: billDetailsCache, // 🔥 SET CACHE ĐÃ FETCH
      });
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setRawData({ 
        bills: [], 
        users: [], 
        products: [],
        shippers: [], // 🔥 THÊM SHIPPERS EMPTY
        billDetails: {},
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ───────────────────────────── Analytics Calculation ─────────────────────────────
  const analytics = useMemo(() => {
    const { bills, users, products, shippers, billDetails } = rawData;

    if (!Array.isArray(bills) || bills.length === 0) return getEmptyAnalytics();

    const from = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate(), 0, 0, 0, 0);
    const to = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59, 999);

    // Filter bills by date range
    const filteredBills = bills.filter(b => {
      if (!b || !b.created_at) return false;
      const d = new Date(b.created_at);
      return !isNaN(d) && d >= from && d <= to;
    });

    console.log('🔍 Filtered bills count:', filteredBills.length);
    console.log('🔍 Sample filtered bills:', filteredBills.slice(0, 3).map(b => ({
      id: b._id,
      status: b.status,
      user_id: b.user_id,
      Account_id: b.Account_id,
      total: b.total,
      created_at: b.created_at
    })));

    // Group by status - CẬP NHẬT TẤT CẢ TRẠNG THÁI THEO BILLMANAGEMENT
    const byStatus = {
      done: [],
      cancelled: [],
      failed: [],
      pending: [],
      confirmed: [],
      ready: [],
      shipping: [],
      returned: [],        // 🆕 THÊM
      refund_pending: [],  // 🆕 THÊM
      refunded: [],        // 🆕 THÊM
      other: [] // Các trạng thái không xác định
    };

    for (const b of filteredBills) {
      const st = (typeof b.status === 'string' ? b.status.toLowerCase() : 'unknown');
      if (st === 'done') byStatus.done.push(b);
      else if (st === 'cancelled') byStatus.cancelled.push(b);
      else if (st === 'failed') byStatus.failed.push(b);
      else if (['pending','confirmed','ready','shipping'].includes(st)) byStatus[st].push(b);
      else if (['returned','refund_pending','refunded'].includes(st)) byStatus[st].push(b); // 🆕 THÊM
      else {
        byStatus.other.push(b);
        console.log('⚠️ Unknown status found:', st, 'Bill ID:', b._id);
      }
    }

    // Debug tổng số đơn - CẬP NHẬT TÍNH TOÁN
    const totalByStatus = byStatus.done.length + byStatus.cancelled.length + byStatus.failed.length + 
                         byStatus.pending.length + byStatus.confirmed.length + byStatus.ready.length + 
                         byStatus.shipping.length + byStatus.returned.length + byStatus.refund_pending.length + 
                         byStatus.refunded.length + byStatus.other.length;
    
    console.log('🔍 Status breakdown debug:');
    console.log('- Total filtered bills:', filteredBills.length);
    console.log('- Done:', byStatus.done.length);
    console.log('- Cancelled:', byStatus.cancelled.length);
    console.log('- Failed:', byStatus.failed.length);
    console.log('- Pending:', byStatus.pending.length);
    console.log('- Confirmed:', byStatus.confirmed.length);
    console.log('- Ready:', byStatus.ready.length);
    console.log('- Shipping:', byStatus.shipping.length);
    console.log('- Returned:', byStatus.returned.length);
    console.log('- Refund Pending:', byStatus.refund_pending.length);
    console.log('- Refunded:', byStatus.refunded.length);
    console.log('- Other/Unknown:', byStatus.other.length);
    console.log('- Sum of all status:', totalByStatus);
    console.log('- Difference:', filteredBills.length - totalByStatus);
    
    // Thêm thông báo xác nhận phép tính
    const displayTotal = byStatus.done.length + byStatus.cancelled.length + byStatus.failed.length + 
                        byStatus.pending.length + byStatus.confirmed.length + byStatus.ready.length + 
                        byStatus.shipping.length + byStatus.returned.length + byStatus.refund_pending.length + 
                        byStatus.refunded.length + byStatus.other.length;
    console.log('📊 FINAL STATUS CHECK: Total=' + filteredBills.length + ', Display Sum=' + displayTotal + ', Match=' + (filteredBills.length === displayTotal));

    console.log('🔍 Bills by status:', {
      done: byStatus.done.length,
      cancelled: byStatus.cancelled.length,
      failed: byStatus.failed.length,
      pending: byStatus.pending.length,
      confirmed: byStatus.confirmed.length,
      ready: byStatus.ready.length,
      shipping: byStatus.shipping.length,
      returned: byStatus.returned.length,
      refund_pending: byStatus.refund_pending.length,
      refunded: byStatus.refunded.length,
      other: byStatus.other.length
    });

    const completedBills = byStatus.done;
    const cancelledCount = byStatus.cancelled.length + byStatus.failed.length;
    const pendingCount = byStatus.pending.length + byStatus.confirmed.length + byStatus.ready.length + byStatus.shipping.length;
    const totalInRange = filteredBills.length;

    console.log('🔍 Completed bills count:', completedBills.length);
    console.log('🔍 Sample completed bills:', completedBills.slice(0, 2).map(b => ({
      id: b._id,
      user_id: b.user_id,
      Account_id: b.Account_id,
      total: b.total,
      status: b.status
    })));

    // Revenue calculation (only from completed orders)
    const completedRevenue = completedBills.reduce((sum, b) => {
      const val = parseFloat(b?.total) || 0;
      return sum + (val > 0 ? val : 0);
    }, 0);

    const totalOrders = completedBills.length;

    // 🔥 TOP CUSTOMERS - VỪa GIỮ THÔNG TIN KHÁCH HÀNG VỪA CHỈ TÍNH ĐƠN DONE
    console.log('🔍 Processing customers: showing all but only counting done orders...');
    
    // Bước 1: Nhóm đơn done theo user_id
    const customerStatsFromDoneBills = {};
    
    for (const bill of completedBills) {
      const userId = String(bill.user_id || bill.Account_id || '').trim();
      if (!userId || userId === '' || userId === 'undefined' || userId === 'null') continue;
      
      const billTotal = parseFloat(bill?.total) || 0;
      if (billTotal <= 0) continue;
      
      if (!customerStatsFromDoneBills[userId]) {
        customerStatsFromDoneBills[userId] = {
          orderCount: 0,
          totalSpent: 0,
          orders: []
        };
      }
      
      customerStatsFromDoneBills[userId].orderCount += 1;
      customerStatsFromDoneBills[userId].totalSpent += billTotal;
      customerStatsFromDoneBills[userId].orders.push(bill);
    }
    
    console.log('🔍 Customer stats from done bills:', Object.keys(customerStatsFromDoneBills).length);
    console.log('🔍 Sample customer stats:', Object.entries(customerStatsFromDoneBills).slice(0, 2));
    console.log('🔍 Sample users from API:', users.slice(0, 2).map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: typeof u.phone === 'string' ? u.phone : '[OBJECT]',
      total_orders: u.total_orders,
      total_spent: u.total_spent
    })));
    
    // Bước 2: Lấy TẤT CẢ khách hàng từ users array, nhưng chỉ tính đơn done
    let topCustomers = users
      .map(user => {
        // 🔥 TÌM KIẾM THEO CẢ _id VÀ ACCOUNT_ID
        const userId = String(user._id);
        const accountId = String(user.account_id || ''); // Nếu có field account_id
        
        // Tìm stats theo cả 2 cách
        const doneStats = customerStatsFromDoneBills[userId] || 
                         customerStatsFromDoneBills[accountId] || 
                         {
                           orderCount: 0,
                           totalSpent: 0,
                           orders: []
                         };
        
        return {
          _id: user._id,
          name: user.name || 'Khách hàng không rõ',
          email: user.email || 'Email chưa cập nhật', 
          phone: typeof user.phone === 'string' ? user.phone : 
                 (user.phone && typeof user.phone === 'object' && user.phone.phone) ? user.phone.phone :
                 'SĐT chưa cập nhật',
          orderCount: doneStats.orderCount, // CHỈ đơn done
          totalSpent: doneStats.totalSpent, // CHỈ từ đơn done  
          avgOrderValue: doneStats.orderCount > 0 ? doneStats.totalSpent / doneStats.orderCount : 0,
          address: getCustomerAddress(user),
          lastOrderDate: doneStats.orders.length > 0 ? 
            new Date(Math.max(...doneStats.orders.map(o => new Date(o.created_at).getTime()))) : null,
          // Thêm thông tin tổng từ API gốc để tham khảo
          totalOrdersAllTime: getCustomerOrderCount(user), // Tất cả đơn
          totalSpentAllTime: getCustomerTotalSpent(user)    // Tất cả đơn
        };
      });
    
    // 🔥 CHỈ LẤY KHÁCH HÀNG THẬT CÓ TRONG DATABASE
    
    // Filter và sort - CHỈ hiển thị khách hàng có đơn done
    topCustomers = topCustomers
      .filter(customer => customer.orderCount > 0) // CHỈ khách có đơn done
      .sort((a, b) => {
        // Ưu tiên theo số đơn done, sau đó theo chi tiêu done
        if (a.orderCount !== b.orderCount) {
          return b.orderCount - a.orderCount;
        }
        return b.totalSpent - a.totalSpent;
      })
      .slice(0, 20);

    console.log('🔍 Top customers with done orders only:', topCustomers.length);

    // 🔥 TOP PRODUCTS - CHỈ TÍNH TỪ COMPLETED BILLS (DONE STATUS)
    console.log('🔍 Processing top products using COMPLETED BILLS ONLY...');
    console.log('🔍 Bill details cache size:', Object.keys(billDetails).length);
    console.log('🔍 Completed bills count:', completedBills.length);
    
    const productSalesStats = {}; // CHỈ lưu sản phẩm từ đơn hoàn thành
    let foundRealItems = 0;
    
    // 🔥 CHỈ SỬ DỤNG COMPLETED BILLS (DONE STATUS)
    const completedBillIds = new Set(completedBills.map(b => b._id));
    for (const [billId, billDetail] of Object.entries(billDetails)) {
      if (!billDetail || !completedBillIds.has(billId)) continue; // CHỈ bills hoàn thành
      
      console.log(`🔍 Processing completed bill ${billId}:`, {
        hasItems: !!billDetail.items,
        hasDetails: !!billDetail.details,
        hasBillDetails: !!billDetail.bill_details
      });
      
      const billItems = billDetail.items || 
                       billDetail.details || 
                       billDetail.bill_details || 
                       [];
      
      if (Array.isArray(billItems) && billItems.length > 0) {
        for (const item of billItems) {
          const productId = String(item.product_id || item.productId || item._id || '').trim();
          const quantity = parseInt(item.quantity || item.qty || 1);
          
          if (!productId || productId === '' || quantity <= 0) continue;
          
          if (!productSalesStats[productId]) {
            productSalesStats[productId] = {
              totalQuantitySold: 0,
              orderCount: 0,
              billsWithProduct: new Set() // Theo dõi các bill khác nhau
            };
          }
          
          productSalesStats[productId].totalQuantitySold += quantity;
          productSalesStats[productId].billsWithProduct.add(billId);
          foundRealItems++;
          
          if (foundRealItems <= 10) {
            console.log(`🔍 Found real product sale from cache: ${productId}, qty=${quantity}, billId=${billId}`);
          }
        }
      }
    }
    
    // 🔥 NẾU KHÔNG CÓ DỮ LIỆU TỪ CACHE, THỬ LẤY TỪ BILLS TRỰC TIẾP
    if (foundRealItems === 0) {
      console.log('🔍 No items from cache, trying bills directly...');
      for (const bill of completedBills) {
        const billItems = bill.details || 
                         bill.items || 
                         bill.bill_details || 
                         bill.BillDetails || 
                         bill.products || 
                         [];
        
        if (!Array.isArray(billItems) || billItems.length === 0) continue;
        
        for (const item of billItems) {
          const productId = String(item.product_id || item.productId || item._id || '').trim();
          const quantity = parseInt(item.quantity || item.qty || 1);
          
          if (!productId || productId === '' || quantity <= 0) continue;
          
          if (!productSalesStats[productId]) {
            productSalesStats[productId] = {
              totalQuantitySold: 0,
              orderCount: 0,
              billsWithProduct: new Set()
            };
          }
          
          productSalesStats[productId].totalQuantitySold += quantity;
          productSalesStats[productId].billsWithProduct.add(bill._id);
          foundRealItems++;
          
          if (foundRealItems <= 5) {
            console.log(`🔍 Found real product sale from bill: ${productId}, qty=${quantity}, billId=${bill._id}`);
          }
        }
      }
    }
    
    console.log('🔍 Real products found in bills:', Object.keys(productSalesStats).length);
    console.log('🔍 Total real items processed:', foundRealItems);
    
    // 🔥 MAPPING DANH MỤC ID THÀNH TÊN TIẾNG VIỆT
    const getCategoryName = (categoryId) => {
      const categoryMap = {
        '64b1e1e18d28e450e97d8d01': 'Bánh sinh nhật',
        '64b1e1e18d28e450e97d8d02': 'Bánh kem',
        '64b1e1e18d28e450e97d8d03': 'Bánh bông lan',
        '64b1e1e18d28e450e97d8d04': 'Bánh cookies',
        '64b1e1e18d28e450e97d8d05': 'Bánh mì',
        '64b1e1e18d28e450e97d8d06': 'Bánh ngọt',
        // Thêm các danh mục khác nếu cần
      };
      return categoryMap[categoryId] || 'Chưa phân loại';
    };
    
    // 🔥 TẠO DANH SÁCH TOP PRODUCTS VỚI THÔNG TIN ĐẦY ĐỦ
    const topProducts = Object.entries(productSalesStats)
      .map(([productId, stats]) => {
        const product = products.find(p => String(p._id) === String(productId));
        
        // 🔥 LẤY ẢNH THỰC TẾ VÀ DEBUG - SUPPORT CẢ image VÀ image_url
        let imageUrl = '';
        const imageField = product?.image || product?.image_url;
        
        if (imageField) {
          // Nếu image là array, lấy ảnh đầu tiên
          if (Array.isArray(imageField)) {
            imageUrl = imageField[0] || '';
          } else {
            imageUrl = imageField;
          }
          
          // 🔥 DEBUG: Log original image path
          console.log(`🔍 Product ${productId} original image:`, {
            image: product?.image,
            image_url: product?.image_url,
            selected: imageUrl
          });
          
          // Đảm bảo có đường dẫn đầy đủ  
          if (imageUrl && !imageUrl.startsWith('http')) {
            // Thử các pattern đường dẫn khác nhau
            if (imageUrl.startsWith('uploads/')) {
              imageUrl = `http://localhost:3000/${imageUrl}`;
            } else if (imageUrl.includes('uploads')) {
              imageUrl = `http://localhost:3000/${imageUrl}`;
            } else {
              imageUrl = `http://localhost:3000/uploads/${imageUrl}`;
            }
          }
          
          console.log(`🔍 Product ${productId} final image URL:`, imageUrl);
        } else {
          console.log(`🔍 Product ${productId} has no image field`);
        }
        
        console.log(`🔍 Product ${productId}:`, {
          name: product?.name,
          image: imageUrl,
          category: product?.category_id,
          totalSold: stats.totalQuantitySold
        });
        
        return {
          _id: productId,
          name: product?.name || `Sản phẩm #${productId.slice(-6)}`,
          image: imageUrl,
          category: getCategoryName(product?.category_id || product?.category),
          totalQuantitySold: stats.totalQuantitySold,
          // 🔥 BỎ orderCount để đơn giản hóa
          isRealData: true
        };
      })
      .filter(product => product.totalQuantitySold > 0) // CHỈ sản phẩm đã bán
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold) // Xếp theo số lượng bán
      .slice(0, 10); // Top 10

    console.log('🔍 Final top selling products:', topProducts.map(p => ({
      name: p.name,
      quantitySold: p.totalQuantitySold,
      category: p.category,
      hasImage: !!p.image
    })));
    
    // � NẾU KHÔNG TÌM THẤY SẢN PHẨM THỰC TẾ
    if (topProducts.length === 0) {
      console.log('🔍 No real product data found in bills');
      console.log('🔍 Trying to fetch individual bill details...');
      
      // Có thể thử lấy từng bill detail riêng ở đây nếu cần
      // Hiện tại sẽ trả về mảng rỗng
    }

    // Unique customers with completed orders (từ bills thực tế)
    const uniqueCustomerIds = Array.from(new Set(
      completedBills
        .map(b => String(b.user_id || b.Account_id || '').trim())
        .filter(id => id && id !== '' && id !== 'undefined' && id !== 'null')
    ));
    const totalCustomers = uniqueCustomerIds.length;

    const avgOrderValue = totalOrders > 0 ? (completedRevenue / totalOrders) : 0;

    // Daily revenue and orders
    const dailyRevenue = completedBills.reduce((acc, b) => {
      const key = new Date(b.created_at).toISOString().slice(0,10);
      acc[key] = (acc[key] || 0) + (parseFloat(b.total) || 0);
      return acc;
    }, {});
    
    const dailyOrders = completedBills.reduce((acc, b) => {
      const key = new Date(b.created_at).toISOString().slice(0,10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Best selling hour
    const hourlyOrders = completedBills.reduce((acc, b) => {
      const h = new Date(b.created_at).getHours();
      acc[h] = (acc[h] || 0) + 1;
      return acc;
    }, {});
    const bestSellingHour = Object.entries(hourlyOrders).sort((a,b)=>b[1]-a[1])[0]?.[0] || '12';

    // Customer retention
    const customerStats = {};
    for (const b of completedBills) {
      const uid = String(b.user_id || b.Account_id || '');
      if (!uid) continue;
      customerStats[uid] = (customerStats[uid] || 0) + 1;
    }
    
    const repeatCustomers = Object.values(customerStats).filter(count => count > 1).length;
    const customerRetention = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;

    const cancellationRate = totalInRange ? (cancelledCount / totalInRange) * 100 : 0;

    const totalProductsSold = topProducts.reduce((sum, p) => sum + p.totalQuantitySold, 0);

    // 🔥 TÍNH TOÁN CHI PHÍ SHIPPER VÀ LỢI NHUẬN
    console.log('🔍 Calculating shipper costs and profit...');
    console.log('🔍 Shippers count:', Array.isArray(shippers) ? shippers.length : 0);
    
    // Helper function để lấy tên shipper
    const getShipperName = (shipperId) => {
      if (!shipperId || shipperId === 'unknown') return 'Chưa xác định';
      if (!Array.isArray(shippers)) return `Shipper #${shipperId}`;
      const shipper = shippers.find(s => String(s._id) === String(shipperId));
      return shipper ? (shipper.name || shipper.full_name || shipper.fullName || `Shipper #${shipperId}`) : `Shipper #${shipperId}`;
    };
    
    // 1. Tính tổng chi phí shipper từ đơn hoàn thành
    let totalShipperCost = 0;
    const shipperStats = {}; // Thống kê theo từng shipper
    
    for (const bill of completedBills) {
      const shippingFee = parseFloat(bill.shipping_fee || bill.shippingFee || 0);
      
      // 🔥 SAFE EXTRACTION OF SHIPPER ID 
      let shipperId = 'unknown';
      if (bill.shipper_id) {
        if (typeof bill.shipper_id === 'string') {
          shipperId = bill.shipper_id;
        } else if (typeof bill.shipper_id === 'object' && bill.shipper_id._id) {
          shipperId = bill.shipper_id._id;
        }
      } else if (bill.shipperId) {
        shipperId = typeof bill.shipperId === 'string' ? bill.shipperId : 
                   (bill.shipperId._id || 'unknown');
      }
      
      if (shippingFee > 0) {
        // Shipper nhận 50% phí ship
        const shipperEarning = shippingFee * 0.5;
        totalShipperCost += shipperEarning;
        
        // Thống kê theo shipper
        if (!shipperStats[shipperId]) {
          shipperStats[shipperId] = {
            shipperId: shipperId,
            shipperName: getShipperName(shipperId),
            completedOrders: 0,
            totalEarnings: 0,
            bonus: 0
          };
        }
        
        shipperStats[shipperId].completedOrders += 1;
        shipperStats[shipperId].totalEarnings += shipperEarning;
        
        console.log(`🔍 Bill ${bill._id}: shipping_fee=${shippingFee}, shipper_earning=${shipperEarning}, shipper=${shipperId}`);
      }
    }
    
    // 2. Tính thưởng shipper (2 triệu cho shipper đạt 50 đơn/tháng)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    for (const [shipperId, stats] of Object.entries(shipperStats)) {
      // Đếm đơn hoàn thành trong tháng hiện tại của shipper này
      const ordersThisMonth = completedBills.filter(bill => {
        const billDate = new Date(bill.created_at);
        const billShipperId = String(bill.shipper_id || bill.shipperId || 'unknown');
        return billDate.getMonth() === currentMonth && 
               billDate.getFullYear() === currentYear &&
               billShipperId === String(shipperId);
      }).length;
      
      console.log(`🔍 Shipper ${shipperId} (${stats.shipperName}): ${ordersThisMonth} orders this month, total completed: ${stats.completedOrders}`);
      
      if (ordersThisMonth >= 50) {
        stats.bonus = 2000000; // 2 triệu bonus
        totalShipperCost += stats.bonus;
        console.log(`🎉 Shipper ${shipperId} gets bonus: ${stats.bonus}`);
      } else {
        console.log(`� Shipper ${shipperId} needs ${50 - ordersThisMonth} more orders for bonus`);
      }
    }
    
    // 3. Tính giá nhập hàng (cost of goods sold)
    let totalCostPrice = 0;
    let itemsWithCostFound = 0;
    let totalItemsProcessed = 0;
    
    console.log('🔍 Starting cost price calculation...');
    
    // Duyệt qua từng bill để tính giá nhập
    for (const bill of completedBills) {
      const billId = bill._id;
      const billDetail = billDetails[billId];
      
      if (billDetail) {
        const billItems = billDetail.items || billDetail.details || billDetail.bill_details || [];
        
        console.log(`🔍 Processing bill ${billId}: ${billItems.length} items`);
        
        for (const item of billItems) {
          totalItemsProcessed++;
          const quantity = Number(item.quantity || item.Quantity || 0);
          
          // 🔥 TÌM KIẾM NHIỀU TRƯỜNG GIÁ NHẬP KHÁC NHAU
          const costFields = [
            'cost_price', 'costPrice', 'import_price', 'importPrice', 
            'wholesale_price', 'wholesalePrice', 'purchase_price', 'purchasePrice',
            'buy_price', 'buyPrice', 'supplier_price', 'supplierPrice'
          ];
          
          let costPrice = 0;
          let foundField = null;
          
          for (const field of costFields) {
            if (item[field] && Number(item[field]) > 0) {
              costPrice = Number(item[field]);
              foundField = field;
              break;
            }
          }
          
          if (quantity > 0 && costPrice > 0) {
            const itemCost = quantity * costPrice;
            totalCostPrice += itemCost;
            itemsWithCostFound++;
            
            console.log(`✅ Found cost: ${item.name || 'Unknown'} - Qty: ${quantity}, Cost: ${costPrice} (${foundField}), Total: ${itemCost}`);
          } else {
            console.log(`⏩ No cost in bill details for: ${item.name || 'Unknown'} - Will check products table`);
          }
        }
      } else {
        console.log(`⚠️ No bill details found for bill ${billId}`);
      }
    }
    
    // 🔥 FALLBACK: TÌM GIÁ NHẬP TRONG PRODUCTS TABLE CHO TẤT CẢ ITEMS CHƯA CÓ GIÁ
    console.log('🔍 Checking products table for missing cost data...');
      
      for (const bill of completedBills) {
        const billId = bill._id;
        const billDetail = billDetails[billId];
        
        if (billDetail) {
          const billItems = billDetail.items || billDetail.details || billDetail.bill_details || [];
          
          for (const item of billItems) {
            const quantity = Number(item.quantity || item.Quantity || 0);
            const productId = item.product_id || item.productId || item._id;
            
            if (quantity > 0 && productId) {
              // Tìm sản phẩm trong products array
              const product = products.find(p => String(p._id) === String(productId));
              
              if (product) {
                const costFields = [
                  'cost_price', 'costPrice', 'import_price', 'importPrice', 
                  'wholesale_price', 'wholesalePrice', 'purchase_price', 'purchasePrice',
                  'buy_price', 'buyPrice', 'supplier_price', 'supplierPrice'
                ];
                
                let productCostPrice = 0;
                let foundField = null;
                
                for (const field of costFields) {
                  if (product[field] && Number(product[field]) > 0) {
                    productCostPrice = Number(product[field]);
                    foundField = field;
                    break;
                  }
                }
                
                if (productCostPrice > 0) {
                  const itemCost = quantity * productCostPrice;
                  totalCostPrice += itemCost;
                  itemsWithCostFound++;
                  
                  console.log(`✅ Found cost in products: ${product.name} - Qty: ${quantity}, Cost: ${productCostPrice} (${foundField}), Total: ${itemCost}`);
                }
              }
            }
          }
        }
      }
      
      console.log('🔍 After checking products table:', {
        totalCostPrice: totalCostPrice,
        itemsWithCostFound: itemsWithCostFound
      });
    
    console.log('🔍 Final cost calculation summary:', {
      totalCostPrice: totalCostPrice,
      itemsWithCostFound: itemsWithCostFound,
      totalItemsProcessed: totalItemsProcessed,
      completedBillsWithDetails: Object.keys(billDetails).length,
      completedBillsTotal: completedBills.length,
      productsCount: products.length
    });
    
    console.log('💰 COST CALCULATION SUCCESS: Found ₫' + totalCostPrice.toLocaleString() + ' total cost from ' + itemsWithCostFound + ' items using products table fallback');
    
    // 4. Tính lợi nhuận thực tế = Doanh thu - Chi phí shipper - Giá nhập hàng
    const actualProfit = completedRevenue - totalShipperCost - totalCostPrice;
    
    console.log('🔍 Financial Summary:', {
      totalRevenue: completedRevenue,
      totalShipperCost: totalShipperCost,
      totalCostPrice: totalCostPrice,
      actualProfit: actualProfit,
      profitMargin: completedRevenue > 0 ? ((actualProfit / completedRevenue) * 100).toFixed(2) + '%' : '0%',
      numberOfShippers: Object.keys(shipperStats).length,
      currentMonth: currentMonth,
      currentYear: currentYear,
      completedBillsCount: completedBills.length,
      shipperStatsDetails: Object.values(shipperStats)
    });

    return {
      totalRevenue: completedRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      cancellationRate,
      topCustomers,
      topProducts,
      dailyRevenue,
      dailyOrders,
      customerRetention,
      bestSellingHour,
      ordersByStatus: {
        done: completedBills.length,
        cancelled: byStatus.cancelled.length,
        failed: byStatus.failed.length,
        pending: byStatus.pending.length,
        confirmed: byStatus.confirmed.length,
        ready: byStatus.ready.length,
        shipping: byStatus.shipping.length,
        returned: byStatus.returned.length,
        refund_pending: byStatus.refund_pending.length,
        refunded: byStatus.refunded.length,
        other: byStatus.other.length,
        total: totalInRange
      },
      totalProductsSold,
      avgCustomerValue: totalCustomers ? completedRevenue / totalCustomers : 0,
      completedOrders: completedBills.length,
      cancelledOrders: cancelledCount,
      pendingOrders: pendingCount,
      completedRevenue: completedRevenue,
      actualProfit: actualProfit,
      totalShipperCost: totalShipperCost,
      totalCostPrice: totalCostPrice,
      shipperStats: Object.values(shipperStats),
      detailedStats: {
        totalBillsInRange: totalInRange,
        completedBills: completedBills.length,
        cancelledBills: byStatus.cancelled.length,
        failedBills: byStatus.failed.length,
        pendingBills: byStatus.pending.length,
        confirmedBills: byStatus.confirmed.length,
        readyBills: byStatus.ready.length,
        shippingBills: byStatus.shipping.length,
        returnedBills: byStatus.returned.length,
        refundPendingBills: byStatus.refund_pending.length,
        refundedBills: byStatus.refunded.length,
        otherBills: byStatus.other.length,
        completedRevenue: completedRevenue,
        averageCompletedOrderValue: avgOrderValue,
        totalCustomersWithCompletedOrders: totalCustomers,
        totalProductsSoldCompleted: totalProductsSold,
        cancellationRate,
        completionRate: totalInRange ? (completedBills.length / totalInRange) * 100 : 0
      }
    };
  }, [rawData, dateRange]);

  // ── Export Excel Functions  
  const exportToExcel = async () => {
    try {
      // 🔥 CHỈ DÙNG EXCELJS, KHÔNG DÙNG FILE-SAVER
      const ExcelJS = (await import('exceljs')).default;
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Analytics Dashboard - Báo cáo chi tiết';
      workbook.created = new Date();
      
      // 📊 Sheet 1: Báo cáo tổng quan (giống như UI)
      const summarySheet = workbook.addWorksheet('Báo cáo tổng quan');
      
      // Header thông tin thời gian
      summarySheet.addRow(['THỐNG KÊ TOÀN DIỆN - BÁO CÁO CHI TIẾT']);
      summarySheet.addRow([`Từ ngày: ${dateRange.from.toLocaleDateString('vi-VN')} đến ${dateRange.to.toLocaleDateString('vi-VN')}`]);
      summarySheet.addRow([`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`]);
      summarySheet.addRow(['']); // Empty row
      
      // KPI chính
      summarySheet.addRow(['CHỈ SỐ KINH DOANH CHÍNH']);
      summarySheet.addRow(['Chỉ số', 'Giá trị', 'Ghi chú']);
      summarySheet.addRow(['Tổng đơn trong khoảng', analytics.detailedStats?.totalBillsInRange || 0, 'Tất cả đơn hàng']);
      summarySheet.addRow(['Đơn hoàn thành', analytics.completedOrders, 'Chỉ đơn status = done']);
      summarySheet.addRow(['Tỷ lệ hoàn thành', `${(analytics.detailedStats?.completionRate || 0).toFixed(1)}%`, 'Hoàn thành/Tổng đơn']);
      summarySheet.addRow(['Tỷ lệ hủy đơn', `${analytics.cancellationRate.toFixed(1)}%`, 'Bao gồm cancelled + failed']);
      summarySheet.addRow(['Tổng doanh thu', formatCurrency(analytics.totalRevenue), 'Chỉ từ đơn hoàn thành']);
      summarySheet.addRow(['Giá trị TB/đơn', formatCurrency(analytics.avgOrderValue), 'Doanh thu/Số đơn done']);
      summarySheet.addRow(['Khách hàng mua thành công', analytics.totalCustomers, 'Có ít nhất 1 đơn done']);
      summarySheet.addRow(['Khách trung thành', analytics.topCustomers.filter(c => c.orderCount > 1).length, 'Có >1 đơn done']);
      summarySheet.addRow(['Tỷ lệ quay lại', `${analytics.customerRetention.toFixed(1)}%`, 'Khách mua lại/Tổng khách']);
      summarySheet.addRow(['Sản phẩm đã bán', analytics.totalProductsSold, 'Tổng số lượng sản phẩm']);
      summarySheet.addRow(['Loại sản phẩm khác nhau', analytics.topProducts.length, 'Số SKU đã bán']);
      summarySheet.addRow(['Users có data', rawData.users.length, 'Khách hàng trong hệ thống']);
      summarySheet.addRow(['Chi phí shipper', formatCurrency(analytics.totalShipperCost || 0), '50% phí ship + thưởng']);
      summarySheet.addRow(['Lợi nhuận ước tính', formatCurrency(analytics.estimatedProfit || 0), 'Sau trừ chi phí shipper']);
      summarySheet.addRow(['']); // Empty row

      // Chi tiết theo trạng thái
      summarySheet.addRow(['CHI TIẾT THEO TRẠNG THÁI ĐỚN HÀNG']);
      summarySheet.addRow(['Trạng thái', 'Số lượng', 'Tỷ lệ']);
      const total = analytics.detailedStats?.totalBillsInRange || 1;
      summarySheet.addRow(['Done (Hoàn thành)', analytics.detailedStats?.completedBills || 0, `${((analytics.detailedStats?.completedBills || 0) / total * 100).toFixed(1)}%`]);
      summarySheet.addRow(['Cancelled (Đã hủy)', analytics.detailedStats?.cancelledBills || 0, `${((analytics.detailedStats?.cancelledBills || 0) / total * 100).toFixed(1)}%`]);
      summarySheet.addRow(['Failed (Thất bại)', analytics.detailedStats?.failedBills || 0, `${((analytics.detailedStats?.failedBills || 0) / total * 100).toFixed(1)}%`]);
      summarySheet.addRow(['Pending (Chờ xử lý)', analytics.detailedStats?.pendingBills || 0, `${((analytics.detailedStats?.pendingBills || 0) / total * 100).toFixed(1)}%`]);
      summarySheet.addRow(['Confirmed (Đã xác nhận)', analytics.detailedStats?.confirmedBills || 0, `${((analytics.detailedStats?.confirmedBills || 0) / total * 100).toFixed(1)}%`]);
      summarySheet.addRow(['Ready (Sẵn sàng)', analytics.detailedStats?.readyBills || 0, `${((analytics.detailedStats?.readyBills || 0) / total * 100).toFixed(1)}%`]);
      summarySheet.addRow(['Shipping (Đang giao)', analytics.detailedStats?.shippingBills || 0, `${((analytics.detailedStats?.shippingBills || 0) / total * 100).toFixed(1)}%`]);

      // 👥 Sheet 2: Top Customers chi tiết
      const customersSheet = workbook.addWorksheet('Khách hàng VIP');
      customersSheet.addRow(['STT', 'Tên khách hàng', 'Email', 'Số điện thoại', 'Đơn done (KPI)', 'Chi tiêu done (₫)', 'TB/đơn done (₫)', 'Tổng đơn (tham khảo)', 'Tổng chi tiêu (tham khảo)', 'Địa chỉ', 'Loại khách hàng']);
      analytics.topCustomers.forEach((customer, index) => {
        const customerType = customer.orderCount >= 5 ? 'VIP' : 
                           customer.orderCount >= 3 ? 'Thân thiết' : 
                           customer.orderCount >= 2 ? 'Trung thành' : 
                           customer.orderCount === 0 ? 'Chưa mua' : 'Mới';
        
        customersSheet.addRow([
          index + 1,
          customer.name,
          customer.email,
          customer.phone,
          customer.orderCount,
          customer.totalSpent,
          customer.avgOrderValue,
          customer.totalOrdersAllTime || 0,
          customer.totalSpentAllTime || 0,
          customer.address || 'Chưa cập nhật',
          customerType
        ]);
      });
      
      // 🧁 Sheet 3: Top Products chi tiết
      const productsSheet = workbook.addWorksheet('Sản phẩm bán chạy');
      productsSheet.addRow(['Top', 'Tên sản phẩm', 'Danh mục', 'Số lượng đã bán', 'Ranking']);
      analytics.topProducts.forEach((product, index) => {
        const ranking = index === 0 ? '🥇 Top 1' : 
                       index === 1 ? '🥈 Top 2' : 
                       index === 2 ? '🥉 Top 3' : 
                       `⭐ Top ${index + 1}`;
        
        productsSheet.addRow([
          index + 1,
          product.name,
          product.category,
          product.totalQuantitySold,
          ranking
        ]);
      });
      
      // � Sheet 4: Thống kê Shipper
      const shipperSheet = workbook.addWorksheet('Thống kê Shipper');
      shipperSheet.addRow(['THỐNG KÊ SHIPPER & CHI PHÍ GIAO HÀNG']);
      shipperSheet.addRow(['']); // Empty row
      shipperSheet.addRow(['Tổng chi phí shipper', formatCurrency(analytics.totalShipperCost || 0)]);
      shipperSheet.addRow(['Tổng giá nhập hàng', formatCurrency(analytics.totalCostPrice || 0)]);
      shipperSheet.addRow(['Số shipper hoạt động', analytics.shipperStats?.length || 0]);
      shipperSheet.addRow(['Lợi nhuận thực tế', formatCurrency(analytics.actualProfit || 0)]);
      shipperSheet.addRow(['']); // Empty row
      
      shipperSheet.addRow(['CHI TIẾT THU NHẬP SHIPPER']);
      shipperSheet.addRow(['Tên Shipper', 'Shipper ID', 'Đơn hoàn thành', 'Thu nhập cơ bản (₫)', 'Thưởng (₫)', 'Tổng thu nhập (₫)']);
      if (analytics.shipperStats && analytics.shipperStats.length > 0) {
        analytics.shipperStats
          .sort((a, b) => (b.totalEarnings + b.bonus) - (a.totalEarnings + a.bonus))
          .forEach((shipper) => {
            shipperSheet.addRow([
              shipper.shipperName || 'Chưa xác định',
              shipper.shipperId === 'unknown' ? 'Chưa xác định' : shipper.shipperId,
              shipper.completedOrders,
              shipper.totalEarnings,
              shipper.bonus,
              shipper.totalEarnings + shipper.bonus
            ]);
          });
      }
      
      shipperSheet.addRow(['']); // Empty row
      shipperSheet.addRow(['GHI CHÚ:']);
      shipperSheet.addRow(['- Shipper nhận 50% phí giao hàng cho mỗi đơn hoàn thành']);
      shipperSheet.addRow(['- Thưởng 2,000,000₫ cho shipper đạt ≥50 đơn hoàn thành/tháng']);
      shipperSheet.addRow(['- Lợi nhuận = Doanh thu - Chi phí shipper (chưa tính giá nhập)']);
      
      // �📅 Sheet 5: Doanh thu theo ngày
      const dailySheet = workbook.addWorksheet('Doanh thu theo ngày');
      dailySheet.addRow(['Ngày', 'Doanh thu (₫)', 'Số đơn hoàn thành', 'Giá trị TB/đơn (₫)']);
      Object.entries(analytics.dailyRevenue)
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .forEach(([date, revenue]) => {
          const orders = analytics.dailyOrders[date] || 0;
          const avgValue = orders > 0 ? revenue / orders : 0;
          dailySheet.addRow([
            new Date(date).toLocaleDateString('vi-VN'),
            revenue,
            orders,
            avgValue
          ]);
        });
      
      // 📊 Sheet 6: Phân tích chuyên sâu
      const analysisSheet = workbook.addWorksheet('Phân tích chuyên sâu');
      analysisSheet.addRow(['PHÂN TÍCH CHUYÊN SÂU']);
      analysisSheet.addRow(['']); // Empty row
      
      analysisSheet.addRow(['THÔNG TIN THỜI GIAN & DATA']);
      analysisSheet.addRow(['Khoảng thời gian phân tích', `${dateRange.from.toLocaleDateString('vi-VN')} - ${dateRange.to.toLocaleDateString('vi-VN')}`]);
      analysisSheet.addRow(['Tổng số ngày', Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24))]);
      analysisSheet.addRow(['Giờ bán chạy nhất', `${analytics.bestSellingHour}:00`]);
      analysisSheet.addRow(['Bills được phân tích', rawData.bills.length]);
      analysisSheet.addRow(['Bill details đã cache', Object.keys(rawData.billDetails).length]);
      analysisSheet.addRow(['']); // Empty row
      
      analysisSheet.addRow(['HIỆU SUẤT KINH DOANH']);
      analysisSheet.addRow(['Doanh thu TB/ngày', formatCurrency(analytics.totalRevenue / Math.max(1, Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24))))]);
      analysisSheet.addRow(['Đơn hàng TB/ngày', (analytics.totalOrders / Math.max(1, Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)))).toFixed(1)]);
      analysisSheet.addRow(['Giá trị TB/khách hàng', formatCurrency(analytics.avgCustomerValue)]);
      analysisSheet.addRow(['Sản phẩm TB/đơn', (analytics.totalProductsSold / Math.max(1, analytics.totalOrders)).toFixed(1)]);
      
      // Style tất cả sheets
      [summarySheet, customersSheet, productsSheet, shipperSheet, dailySheet, analysisSheet].forEach(sheet => {
        // Style header rows
        for (let i = 1; i <= sheet.rowCount; i++) {
          const row = sheet.getRow(i);
          if (row.getCell(1).value && typeof row.getCell(1).value === 'string' && 
              (row.getCell(1).value.includes('STT') || 
               row.getCell(1).value.includes('Top') || 
               row.getCell(1).value.includes('Ngày') || 
               row.getCell(1).value.includes('Chỉ số') ||
               row.getCell(1).value.includes('Trạng thái'))) {
            row.font = { bold: true };
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE0E0E0' }
            };
          }
          
          // Style title rows
          if (row.getCell(1).value && typeof row.getCell(1).value === 'string' && 
              (row.getCell(1).value.includes('THỐNG KÊ') || 
               row.getCell(1).value.includes('CHỈ SỐ') ||
               row.getCell(1).value.includes('CHI TIẾT') ||
               row.getCell(1).value.includes('PHÂN TÍCH') ||
               row.getCell(1).value.includes('THÔNG TIN') ||
               row.getCell(1).value.includes('HIỆU SUẤT'))) {
            row.font = { bold: true, size: 14 };
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF4472C4' }
            };
            row.getCell(1).font = { ...row.getCell(1).font, color: { argb: 'FFFFFFFF' } };
          }
        }
        
        // Auto-fit columns
        sheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: false }, cell => {
            const length = cell.value ? cell.value.toString().length : 0;
            if (length > maxLength) {
              maxLength = length;
            }
          });
          column.width = Math.min(50, Math.max(10, maxLength + 2));
        });
      });
      
      // Export file với tên có timestamp - DÙNG DOWNLOAD LINK
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const timestamp = new Date().toISOString().slice(0,16).replace(/[:-]/g, '');
      const filename = `BaoCaoThongKe_${dateRange.from.toISOString().slice(0,10)}_den_${dateRange.to.toISOString().slice(0,10)}_${timestamp}.xlsx`;
      
      // 🔥 TẠO DOWNLOAD LINK MANUAL - KHÔNG CẦN FILE-SAVER
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('✅ Xuất Excel thành công! File đã được lưu với đầy đủ thông tin báo cáo.');
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert(`⚠️ Lỗi khi xuất Excel: ${error.message}. Vui lòng kiểm tra và thử lại.`);
    }
  };

  // ── UI helpers
  const handleQuickFilter = (filterType) => {
    const now = new Date();
    let from = new Date();
    switch (filterType) {
      case 'today':
        from = new Date();
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        from.setDate(now.getDate() - 90);
        break;
      default:
        break;
    }
    setDateRange({ from, to: now });
    setTimeFilter(filterType);
  };

  const handleDateChange = (type, event) => {
    const date = new Date(event.target.value);
    setDateRange(prev => ({
      ...prev,
      [type]: date
    }));
  };

  const tabs = [
    { id: 'overview', name: 'Tổng quan', icon: '📊', description: 'Tổng quan kinh doanh' },
    { id: 'revenue', name: 'Doanh thu', icon: '💰', description: 'Phân tích doanh thu chi tiết' },
    { id: 'customers', name: 'Khách hàng', icon: '👥', description: 'Phân tích khách hàng' },
    { id: 'products', name: 'Sản phẩm', icon: '🧁', description: 'Hiệu suất sản phẩm' },
    { id: 'reports', name: 'Báo cáo', icon: '📈', description: 'Báo cáo chuyên sâu' },
  ];

  if (isLoading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-container">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <TabBar />

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🧁 Thống kê toàn diện</h1>
          <p>Thống kê kinh doanh toàn diện - Dữ liệu khách hàng và sản phẩm đã được sửa</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-container">
        <div className="date-filter">
          <label>📅 Khoảng thời gian:</label>
          <input
            type="date"
            value={dateRange.from.toISOString().slice(0, 10)}
            onChange={(e) => handleDateChange('from', e)}
            className="date-picker"
          />
          <span>→</span>
          <input
            type="date"
            value={dateRange.to.toISOString().slice(0, 10)}
            onChange={(e) => handleDateChange('to', e)}
            className="date-picker"
          />
        </div>

        <div className="quick-filters">
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: 'week', label: '7 ngày' },
            { key: 'month', label: '30 ngày' },
            { key: 'quarter', label: '3 tháng' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => handleQuickFilter(f.key)}
              className={`filter-btn ${timeFilter === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={exportToExcel}
          disabled={!analytics.detailedStats?.totalBillsInRange}
          className="export-btn"
        >
          📊 Xuất Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <div>
              <div>{tab.name}</div>
              <small>{tab.description}</small>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="kpi-grid">
            {[
              {
                title: 'Tổng doanh thu (đơn hoàn thành)',
                value: formatCurrency(analytics.totalRevenue),
                icon: '💰',
                color: 'green',
              },
              {
                title: 'Số đơn hoàn thành (hoàn thành)',
                value: analytics.totalOrders,
                icon: '📦',
                color: 'blue',
              },
              {
                title: 'Khách hàng (đã mua thành công)',
                value: analytics.totalCustomers,
                icon: '👥',
                color: 'purple',
              },
              {
                title: 'Giá trị trung bình/đơn (hoàn thành)',
                value: formatCurrency(analytics.avgOrderValue),
                icon: '📊',
                color: 'orange',
              },
            ].map((kpi, i) => (
              <div key={i} className="kpi-card">
                <h3>{kpi.title}</h3>
                <div className="value">{kpi.value}</div>
                <div className="subtitle">
                  {kpi.title.includes('doanh thu') && analytics.totalOrders > 0 ? 
                    `${analytics.totalOrders} đơn hoàn thành` : 
                    kpi.title.includes('khách hàng') ? 
                    `${analytics.customerRetention.toFixed(1)}% quay lại` :
                    'Dữ liệu cập nhật'}
                </div>
              </div>
            ))}
          </div>

          {/* Thêm section thống kê shipper */}
          {analytics.shipperStats && analytics.shipperStats.length > 0 && (
            <div className="shipper-stats-section">
              <h3>🚚 Thống kê Shipper & Chi phí giao hàng</h3>
              <div className="shipper-summary">
                <div className="summary-cards">
                  <div className="summary-card">
                    <h4>💰 Tổng chi phí shipper</h4>
                    <p className="big-number">{formatCurrency(analytics.totalShipperCost || 0)}</p>
                    <small>50% phí ship + thưởng</small>
                  </div>
                  <div className="summary-card">
                    <h4>🚛 Số shipper hoạt động</h4>
                    <p className="big-number">{analytics.shipperStats.length}</p>
                    <small>Có đơn hoàn thành</small>
                  </div>
                </div>
              </div>
              
              <div className="shipper-details">
                <h4>📋 Chi tiết thu nhập shipper</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Tên Shipper</th>
                        <th>Đơn hoàn thành</th>
                        <th>Thu nhập cơ bản</th>
                        <th>Thưởng (≥50 đơn/tháng)</th>
                        <th>Tổng thu nhập</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.shipperStats
                        .sort((a, b) => (b.totalEarnings + b.bonus) - (a.totalEarnings + a.bonus))
                        .map((shipper, index) => (
                        <tr key={shipper.shipperId || index}>
                          <td>
                            <strong>{shipper.shipperName || 'Chưa xác định'}</strong>
                            <small style={{display: 'block', color: '#666'}}>ID: {shipper.shipperId}</small>
                          </td>
                          <td className="orders">{shipper.completedOrders} đơn</td>
                          <td className="earnings">{formatCurrency(shipper.totalEarnings)}</td>
                          <td className="bonus">
                            {shipper.bonus > 0 ? (
                              <span className="bonus-badge">🎉 {formatCurrency(shipper.bonus)}</span>
                            ) : (
                              <span className="no-bonus">-</span>
                            )}
                          </td>
                          <td className="total">
                            <strong>{formatCurrency(shipper.totalEarnings + shipper.bonus)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="shipper-notes">
                  <div className="note-item">
                    <span className="note-icon">ℹ️</span>
                    <span>Shipper nhận 50% phí giao hàng cho mỗi đơn hoàn thành</span>
                  </div>
                  <div className="note-item">
                    <span className="note-icon">🎁</span>
                    <span>Thưởng 2 triệu đồng cho shipper đạt ≥50 đơn hoàn thành/tháng</span>
                  </div>
                  <div className="note-item">
                    <span className="note-icon">📊</span>
                    <span>Lợi nhuận = Doanh thu - Chi phí shipper (chưa tính giá nhập)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="revenue-section">
          <div className="section-header">
            <h3>💰 Phân tích doanh thu chi tiết</h3>
            <div className="stats-summary">
              Tổng doanh thu: {formatCurrency(analytics.totalRevenue)} • Từ {analytics.totalOrders} đơn hoàn thành
            </div>
          </div>

          <div className="revenue-grid">
            <div className="revenue-summary">
              <h4>📈 Tổng quan doanh thu</h4>
              <div className="summary-stats">
                <div className="stat-item">
                  <label>Doanh thu hoàn thành:</label>
                  <span className="value green">{formatCurrency(analytics.completedRevenue)}</span>
                </div>
                <div className="stat-item">
                  <label>Giá nhập hàng:</label>
                  <span className="value orange">{formatCurrency(analytics.totalCostPrice || 0)}</span>
                </div>
                <div className="stat-item">
                  <label>Chi phí shipper:</label>
                  <span className="value red">{formatCurrency(analytics.totalShipperCost || 0)}</span>
                </div>
                <div className="stat-item">
                  <label>Lợi nhuận thực tế:</label>
                  <span className="value success">{formatCurrency(analytics.actualProfit || 0)}</span>
                </div>
                <div className="stat-item">
                  <label>Giờ bán chạy nhất:</label>
                  <span className="value orange">{analytics.bestSellingHour}:00</span>
                </div>
              </div>
            </div>

            <div className="daily-breakdown">
              <h4>📅 Doanh thu theo ngày</h4>
              {Object.keys(analytics.dailyRevenue).length === 0 ? (
                <div className="no-data">
                  <p>📊 Chưa có dữ liệu trong khoảng thời gian này</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Doanh thu</th>
                        <th>Đơn hàng</th>
                        <th>TB/đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analytics.dailyRevenue)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .map(([date, revenue]) => {
                          const orders = analytics.dailyOrders[date] || 0;
                          const avgValue = orders > 0 ? revenue / orders : 0;
                          return (
                            <tr key={date}>
                              <td>{new Date(date).toLocaleDateString('vi-VN')}</td>
                              <td className="revenue">{formatCurrency(revenue)}</td>
                              <td className="orders">{orders}</td>
                              <td className="avg">{formatCurrency(avgValue)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="customers-section">
          <div className="section-header">
            <h3>🏆 Khách hàng VIP (thông tin đầy đủ + chỉ tính đơn hoàn thành)</h3>
            <div className="stats-summary">
              Tổng: {analytics.topCustomers.length} khách hàng • Tỷ lệ quay lại: {analytics.customerRetention.toFixed(1)}% • Chỉ tính doanh thu từ đơn hoàn thành
            </div>
          </div>
          
          {analytics.topCustomers.length === 0 ? (
            <div className="no-data">
              <p>👥 Chưa có dữ liệu khách hàng</p>
              <div className="help-text">
                <p>🔧 Hiển thị tất cả khách hàng + chỉ tính doanh thu từ đơn done</p>
                <p>🔍 Debug: Kiểm tra dữ liệu trong console</p>
                <ul>
                  <li>Completed bills: {analytics.completedOrders}</li>
                  <li>Users fetched: {rawData.users.length}</li>
                  <li>Date range: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Liên hệ</th>
                    <th>Đơn done 🎯</th>
                    <th>Chi tiêu done 💰</th>
                    <th>TB/đơn done</th>
                    <th>Tổng đơn 📊</th>
                    <th>Loại khách</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topCustomers.map((customer, i) => (
                    <tr key={customer._id || i}>
                      <td className="customer-name">
                        <span className="rank">#{i + 1}</span>
                        {customer.name}
                      </td>
                      <td>
                        <div className="email">{customer.email}</div>
                        <div className="phone">{typeof customer.phone === 'string' ? customer.phone : 'SĐT chưa cập nhật'}</div>
                      </td>
                      <td className="orders" title="Chỉ đơn hoàn thành trong khoảng thời gian">
                        {customer.orderCount} đơn
                      </td>
                      <td className="spent" title="Chỉ doanh thu từ đơn hoàn thành">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td title="Giá trị trung bình đơn hoàn thành">
                        {formatCurrency(customer.avgOrderValue)}
                      </td>
                      <td className="total-info" title="Tổng tất cả đơn hàng (tham khảo)">
                        <div>{customer.totalOrdersAllTime || 0} đơn</div>
                        <small>{formatCurrency(customer.totalSpentAllTime || 0)}</small>
                      </td>
                      <td>
                        <span className={`badge ${customer.orderCount >= 5 ? 'vip' : customer.orderCount >= 2 ? 'regular' : 'new'}`}>
                          {customer.orderCount >= 5 ? '👑 VIP' : customer.orderCount >= 3 ? '⭐ Thân thiết' : customer.orderCount >= 2 ? '💎 Trung thành' : customer.orderCount === 0 ? '😴 Chưa mua' : '🆕 Mới'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="products-section">
          <div className="section-header">
            <h3>🧁 Top sản phẩm bán chạy (chỉ sản phẩm đã bán)</h3>
            <div className="stats-summary">
              {analytics.topProducts.length > 0 ? 
                `${analytics.topProducts.length} sản phẩm đã bán • Tổng: ${analytics.totalProductsSold} sản phẩm` :
                'Chưa có sản phẩm nào được bán trong khoảng thời gian này'
              }
            </div>
          </div>
          
          {analytics.topProducts.length === 0 ? (
            <div className="no-data">
              <p>🧁 Chưa có sản phẩm nào được bán</p>
              <div className="help-text">
                <p>🔧 Không tìm thấy chi tiết sản phẩm trong bills</p>
                <p>🔍 Thống kê dựa trên đơn hàng hoàn thành (done)</p>
                <ul>
                  <li>Đơn hoàn thành: {analytics.completedOrders}</li>
                  <li>Sản phẩm trong DB: {rawData.products.length}</li>
                  <li>Khoảng thời gian: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}</li>
                </ul>
                <p><strong>💡 Gợi ý:</strong> Kiểm tra xem API có trả về chi tiết sản phẩm trong bill không</p>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{width: '60px', textAlign: 'center'}}>#</th>
                    <th style={{width: '140px', textAlign: 'center'}}>Top bán chạy</th>
                    <th style={{width: '200px', textAlign: 'left'}}>Sản phẩm</th>
                    <th style={{width: '80px', textAlign: 'center'}}>Hình ảnh</th>
                    <th style={{width: '120px', textAlign: 'center'}}>Danh mục</th>
                    <th style={{width: '140px', textAlign: 'center'}}>Số lượng đã bán</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((product, index) => (
                    <tr key={product._id || index}>
                      <td className="rank" style={{textAlign: 'center', verticalAlign: 'middle'}}>
                        <span className="rank-badge">#{index + 1}</span>
                      </td>
                      <td className="top-rank" style={{textAlign: 'center', verticalAlign: 'middle'}}>
                        {index === 0 && <span className="medal gold">🥇 Top 1</span>}
                        {index === 1 && <span className="medal silver">🥈 Top 2</span>}
                        {index === 2 && <span className="medal bronze">🥉 Top 3</span>}
                        {index > 2 && <span className="medal normal">⭐ Top {index + 1}</span>}
                      </td>
                      <td className="product-name" style={{textAlign: 'left', verticalAlign: 'middle', paddingLeft: '12px'}}>
                        <strong>{product.name}</strong>
                      </td>
                      <td className="product-image" style={{textAlign: 'center', verticalAlign: 'middle', padding: '8px'}}>
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e0e0e0' }}
                            onError={(e) => {
                              console.log('🔍 Image failed to load:', product.image);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                            onLoad={() => {
                              console.log('✅ Image loaded successfully:', product.image);
                            }}
                          />
                        ) : null}
                        <div style={{ 
                          width: '50px', 
                          height: '50px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '8px', 
                          display: product.image ? 'none' : 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          border: '1px solid #e0e0e0',
                          margin: '0 auto'
                        }}>
                          <span style={{ fontSize: '24px' }}>🧁</span>
                        </div>
                      </td>
                      <td style={{textAlign: 'center', verticalAlign: 'middle'}}>{product.category}</td>
                      <td className="quantity-sold" style={{textAlign: 'center', verticalAlign: 'middle'}}>
                        <strong style={{color: '#007bff'}}>{product.totalQuantitySold}</strong> 
                        <span style={{color: '#666', marginLeft: '4px'}}>sản phẩm</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {analytics.topProducts.some(p => p.isFallback || p.isEstimated) && (
            <div className="data-notes" style={{display: 'none'}}>
              <div className="note-item">
                <span className="badge estimated">�</span>
                <span>Dữ liệu ước tính từ tổng doanh thu và danh sách sản phẩm</span>
              </div>
              {analytics.topProducts.some(p => p.isFallback) && (
                <div className="note-item" style={{display: 'none'}}>
                  <span className="badge fallback">📊</span>
                  <span>Dữ liệu tổng hợp từ đơn hàng</span>
                </div>
              )}
            </div>
          )}
          
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="reports-section">
          <div className="section-header">
            <h3>📈 Báo cáo chi tiết</h3>
          </div>

          <div className="report-summary">
            <div className="summary-grid">
              {[
                { 
                  label: 'Tổng đơn trong khoảng', 
                  value: analytics.detailedStats?.totalBillsInRange || 0,
                  description: `Từ ${dateRange.from.toLocaleDateString('vi-VN')} đến ${dateRange.to.toLocaleDateString('vi-VN')}`
                },
                { 
                  label: 'Tỷ lệ hoàn thành', 
                  value: `${(analytics.detailedStats?.completionRate || 0).toFixed(1)}%`,
                  description: `${analytics.detailedStats?.completedBills || 0} đơn done / ${analytics.detailedStats?.totalBillsInRange || 0} tổng đơn`
                },
                { 
                  label: 'Tỷ lệ hủy đơn', 
                  value: `${analytics.cancellationRate.toFixed(1)}%`,
                  description: `${(analytics.detailedStats?.cancelledBills || 0) + (analytics.detailedStats?.failedBills || 0)} đơn hủy/thất bại`
                },
                { 
                  label: 'Khách trung thành', 
                  value: analytics.topCustomers.filter(c => c.orderCount > 1).length,
                  description: `Có >1 đơn hoàn thành trong khoảng thời gian`
                },
              ].map((item, i) => (
                <div key={i} className="summary-item">
                  <h4>{item.label}</h4>
                  <p className="summary-value">{item.value}</p>
                  <small className="summary-description">{item.description}</small>
                </div>
              ))}
            </div>
            
            {/* Thêm thông tin chi tiết theo trạng thái */}
            <div className="status-breakdown">
              <h4>📊 Chi tiết theo trạng thái đơn hàng</h4>
              <div className="status-grid">
                <div className="status-item done">
                  <span className="status-label">✅ Hoàn thành</span>
                  <span className="status-count">{analytics.detailedStats?.completedBills || 0}</span>
                  <span className="status-percent">{((analytics.detailedStats?.completedBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="status-item cancelled">
                  <span className="status-label">❌ Đã hủy</span>
                  <span className="status-count">{analytics.detailedStats?.cancelledBills || 0}</span>
                  <span className="status-percent">{((analytics.detailedStats?.cancelledBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="status-item failed">
                  <span className="status-label">⚠️ Giao thất bại</span>
                  <span className="status-count">{analytics.detailedStats?.failedBills || 0}</span>
                  <span className="status-percent">{((analytics.detailedStats?.failedBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="status-item pending">
                  <span className="status-label">⏳ Chờ xác nhận</span>
                  <span className="status-count">{analytics.detailedStats?.pendingBills || 0}</span>
                  <span className="status-percent">{((analytics.detailedStats?.pendingBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="status-item confirmed">
                  <span className="status-label">✔️ Đã xác nhận</span>
                  <span className="status-count">{analytics.detailedStats?.confirmedBills || 0}</span>
                  <span className="status-percent">{((analytics.detailedStats?.confirmedBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="status-item ready">
                  <span className="status-label">📦 Sẵn sàng giao</span>
                  <span className="status-count">{analytics.detailedStats?.readyBills || 0}</span>
                  <span className="status-percent">{((analytics.detailedStats?.readyBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="status-item shipping">
                  <span className="status-label">🚚 Đang giao hàng</span>
                  <span className="status-count">{analytics.detailedStats?.shippingBills || 0}</span>
                  <span className="status-percent">{((analytics.detailedStats?.shippingBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                </div>
                {analytics.detailedStats?.returnedBills > 0 && (
                  <div className="status-item returned">
                    <span className="status-label">📦 Đã hoàn trả</span>
                    <span className="status-count">{analytics.detailedStats?.returnedBills || 0}</span>
                    <span className="status-percent">{((analytics.detailedStats?.returnedBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                  </div>
                )}
                {analytics.detailedStats?.refundPendingBills > 0 && (
                  <div className="status-item refund-pending">
                    <span className="status-label">⏳ Chờ hoàn tiền</span>
                    <span className="status-count">{analytics.detailedStats?.refundPendingBills || 0}</span>
                    <span className="status-percent">{((analytics.detailedStats?.refundPendingBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                  </div>
                )}
                {analytics.detailedStats?.refundedBills > 0 && (
                  <div className="status-item refunded">
                    <span className="status-label">💰 Đã hoàn tiền</span>
                    <span className="status-count">{analytics.detailedStats?.refundedBills || 0}</span>
                    <span className="status-percent">{((analytics.detailedStats?.refundedBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                  </div>
                )}
                {analytics.detailedStats?.otherBills > 0 && (
                  <div className="status-item other">
                    <span className="status-label">❓ Khác</span>
                    <span className="status-count">{analytics.detailedStats?.otherBills || 0}</span>
                    <span className="status-percent">{((analytics.detailedStats?.otherBills || 0) / (analytics.detailedStats?.totalBillsInRange || 1) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Thêm insights kinh doanh */}
            <div className="business-insights">
              <h4>💡 Insights kinh doanh</h4>
              <div className="insights-grid">
                <div className="insight-item">
                  <span className="insight-label">💰 Doanh thu TB/ngày</span>
                  <span className="insight-value">{formatCurrency(analytics.totalRevenue / Math.max(1, Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24))))}</span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">📦 Đơn hàng TB/ngày</span>
                  <span className="insight-value">{(analytics.totalOrders / Math.max(1, Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)))).toFixed(1)} đơn</span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">🧁 Sản phẩm TB/đơn</span>
                  <span className="insight-value">{(analytics.totalProductsSold / Math.max(1, analytics.totalOrders)).toFixed(1)} SP</span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">⏰ Giờ bán chạy</span>
                  <span className="insight-value">{analytics.bestSellingHour}:00</span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">💎 Giá trị TB/khách</span>
                  <span className="insight-value">{formatCurrency(analytics.avgCustomerValue)}</span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">🔄 Tỷ lệ quay lại</span>
                  <span className="insight-value">{analytics.customerRetention.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="export-options">
            <div className="export-card">
              <h4>📊 Báo cáo tổng quan chi tiết</h4>
              <p>Xuất toàn bộ dữ liệu thống kê ra Excel với đầy đủ thông tin khách hàng và sản phẩm</p>
              <button
                onClick={exportToExcel}
                disabled={analytics.detailedStats?.totalBillsInRange === 0}
                className="export-btn"
              >
                📊 Xuất Excel
              </button>
            </div>
          </div>

          {analytics.detailedStats?.totalBillsInRange === 0 && (
            <div className="no-data">
              <p>📊 Chưa có dữ liệu trong khoảng thời gian đã chọn</p>
              <p>Hãy thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu đơn hàng</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;

// 🎨 CSS STYLES CHO PRODUCTS TABLE
const productStyles = `
.products-section .table-container table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.products-section .table-container th,
.products-section .table-container td {
  border: 1px solid #e5e7eb;
  padding: 12px 8px;
  vertical-align: middle;
}

.products-section .table-container th {
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.rank-badge {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.medal {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  display: inline-block;
  white-space: nowrap;
}

.medal.gold {
  background: linear-gradient(135deg, #ffd700, #ffb000);
  color: #8b4513;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.medal.silver {
  background: linear-gradient(135deg, #e5e7eb, #9ca3af);
  color: #374151;
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
}

.medal.bronze {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: white;
  box-shadow: 0 2px 8px rgba(205, 127, 50, 0.3);
}

.medal.normal {
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.quantity-sold {
  color: #059669;
  font-weight: 600;
}

.badge.real {
  background: #dcfce7;
  color: #16a34a;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge.estimated {
  background: #dbeafe;
  color: #1e40af;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.top-rank {
  text-align: center;
  min-width: 100px;
}

.ranking-info {
  margin-top: 16px;
  padding: 12px;
  background-color: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
}

/* Styles cho báo cáo chi tiết */
.summary-item {
  text-align: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e40af;
  margin: 8px 0 4px 0;
}

.summary-description {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.status-breakdown {
  margin-top: 24px;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.status-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.status-item.done { background: #dcfce7; border-color: #16a34a; }
.status-item.cancelled { background: #fecaca; border-color: #dc2626; }
.status-item.failed { background: #fed7aa; border-color: #ea580c; }
.status-item.pending { background: #fef3c7; border-color: #d97706; }
.status-item.confirmed { background: #dbeafe; border-color: #2563eb; }
.status-item.ready { background: #e0e7ff; border-color: #7c3aed; }
.status-item.shipping { background: #cffafe; border-color: #06b6d4; }
.status-item.returned { background: #fed7aa; border-color: #f97316; }
.status-item.refund-pending { background: #fef3c7; border-color: #eab308; }
.status-item.refunded { background: #ecfccb; border-color: #84cc16; }
.status-item.other { background: #f1f5f9; border-color: #64748b; }

.status-label {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
}

.status-count {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
}

.status-percent {
  font-size: 11px;
  color: #64748b;
}

.business-insights {
  margin-top: 24px;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.insight-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.insight-label {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.insight-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}

/* Styles cho shipper stats */
.shipper-stats-section {
  margin-top: 32px;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.shipper-summary .summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin: 16px 0 24px 0;
}

.summary-card {
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  text-align: center;
}

.summary-card h4 {
  margin: 0 0 8px 0;
  color: #334155;
  font-size: 14px;
}

.big-number {
  font-size: 24px;
  font-weight: 700;
  color: #1e40af;
  margin: 8px 0;
}

.summary-card small {
  color: #64748b;
  font-size: 12px;
}

.shipper-details {
  margin-top: 24px;
}

.shipper-details .table-container {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.shipper-details table {
  width: 100%;
  border-collapse: collapse;
}

.shipper-details th,
.shipper-details td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.shipper-details th {
  background: #f1f5f9;
  font-weight: 600;
  color: #334155;
  font-size: 14px;
}

.orders {
  color: #2563eb;
  font-weight: 500;
}

.earnings {
  color: #059669;
  font-weight: 500;
}

.bonus-badge {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.no-bonus {
  color: #9ca3af;
  font-style: italic;
}

.total {
  color: #1e40af;
  font-weight: 600;
}

.shipper-notes {
  margin-top: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.note-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #475569;
}

.note-icon {
  margin-right: 8px;
  font-size: 14px;
}

/* Thêm CSS cho revenue section values */
.value.red {
  color: #dc2626 !important;
  font-weight: 600;
}

.value.success {
  color: #16a34a !important;
  font-weight: 700;
  font-size: 16px;
}

.value.green {
  color: #059669 !important;
  font-weight: 600;
}

.value.blue {
  color: #2563eb !important;
  font-weight: 500;
}

.value.purple {
  color: #7c3aed !important;
  font-weight: 500;
}

.value.orange {
  color: #ea580c !important;
  font-weight: 500;
}
`;

// Inject styles vào document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = productStyles;
  document.head.appendChild(styleElement);
}
