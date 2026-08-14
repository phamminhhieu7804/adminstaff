/**
 * API Helper - Gọi Web API Gateway (apiadmindstaff)
 * 
 * Thay vì frontend truy cập Firestore trực tiếp,
 * tất cả thao tác thanh toán đi qua API Gateway.
 */

// Base URL của Web API Gateway
// Trên production (Vercel): dùng domain thực tế
// Trên development: có thể override bằng VITE_API_BASE_URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://apiadminstaff.vercel.app';

/**
 * GET /api/packages
 * Lấy danh sách gói cước từ server
 * @returns {Promise<Array>} Danh sách packages
 */
export async function fetchPackages() {
  const res = await fetch(`${API_BASE_URL}/api/packages`);
  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Lỗi khi lấy danh sách gói cước');
  }
  
  return data.packages;
}

/**
 * POST /api/create-order
 * Tạo đơn hàng mới và nhận mã QR thanh toán
 * @param {string} storeId - ID cửa hàng
 * @param {string} packageId - ID gói cước
 * @returns {Promise<Object>} { orderCode, qrUrl, amount, packageName, ... }
 */
export async function createOrder(storeId, packageId) {
  const res = await fetch(`${API_BASE_URL}/api/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, packageId }),
  });
  
  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Lỗi khi tạo đơn hàng');
  }
  
  return data;
}
