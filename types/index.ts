// /types/index.ts

// ==================== USER & AUTH ====================
export interface User {
  id: number;
  username: string;
  role: 'karyawan' | 'gudang' | 'owner';
  outlet_id?: number | null;
  outlet?: Outlet;
}

export interface LoginResponse {
  access_token: string;
  token?: string;        // Agar error di login.tsx hilang
  token_type: string;
  user: User;
  message?: string;
}

// ==================== OUTLET ====================
export interface Outlet {
  id: number;
  nama: string;
  alamat: string;
  is_active: boolean;
  users_count?: number;
}

// ==================== BAHAN & PRODUK ====================
export interface Bahan {
  id: number;
  nama: string;
  satuan: string;
  stok_minimum_gudang: number;
  stok_minimum_outlet: number;
}

export interface Komposisi {
  id?: number;
  produk_id?: number;
  bahan_id: number;
  quantity: number;
  bahan?: Bahan;
}

export interface Product {
  id: number;
  nama: string;
  harga: number;
  gambar?: string | null;
  is_available?: boolean;
  category?: string; // Agar error di transaksi.tsx hilang
  komposisi?: Komposisi[];
}

// ==================== TRANSAKSI & CART ====================

export interface OrderItem {
  id: string; // Menggunakan string karena pakai Date.now() di frontend
  produk_id: number;
  quantity: number;
  subtotal: number;
  notes?: string;
}

export interface TransaksiItemPayload {
  produk_id: number;
  quantity: number;
}

export interface TransaksiItem {
  id?: number;
  transaksi_id?: number;
  produk_id: number;
  quantity: number;
  subtotal?: number;
  produk?: Product;
}

export interface Transaksi {
  id: number;
  outlet_id: number;
  karyawan_id: number;
  tanggal: string;
  total: number;
  metode_bayar: 'tunai' | 'qris';
  bukti_qris?: string | null;
  items?: TransaksiItem[];
}

// ==================== GUDANG (WAREHOUSE) ====================

export interface StokGudang {
  bahan_id: number;
  stok: number;
  bahan?: Bahan;
}

export interface BarangMasuk {
  id: number;
  bahan_id: number;
  jumlah: number;
  tanggal: string;
  supplier: string;
  bahan?: Bahan;
}

export interface BarangKeluar {
  id: number;
  permintaan_id?: number;
  gudang_id?: number;
  outlet_id?: number;
  tanggal_keluar: string;
  // REVISI: 'received' wajib ada untuk mendukung Endpoint 32 (Konfirmasi Terima)
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  bukti_foto?: string | null;
  jumlah?: number;
  bahan?: Bahan;
}

export interface PermintaanStok {
  id: number;
  outlet_id: number;
  bahan_id: number;
  jumlah: number;
  // REVISI: Status disesuaikan dengan alur di database (approved & cancelled)
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  bahan?: Bahan;
  outlet?: Outlet;
}

// ==================== LAPORAN & DASHBOARD ====================

export interface LaporanPendapatan {
  tanggal: string;
  total_pendapatan: number;
  jumlah_transaksi: number;
}

export interface DashboardData {
  total_outlet: number;
  total_karyawan: number;
  pendapatan_hari_ini: number;
  stok_kritis_gudang: number;
}