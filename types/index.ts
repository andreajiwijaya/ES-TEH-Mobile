// User Types
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'karyawan' | 'gudang' | 'owner';
  outlet_id?: string;
}

// Product Types
export interface Product {
  id: string;
  outlet_id: string;
  nama: string;
  harga: number;
  gambar?: string;
  is_available: boolean;
  category: string;
}

export interface OrderItem {
  id: string;
  transaksi_id?: string;
  produk_id: string;
  quantity: number;
  subtotal: number;
  notes?: string;
}

// Stock Types
export interface Bahan {
  id: string;
  nama: string;
  satuan: string;
  stok_minimum_gudang: number;
  stok_minimum_outlet: number;
}

export interface StokOutlet {
  outlet_id: string;
  bahan_id: string;
  stok: number;
}

export interface StokGudang {
  bahan_id: string;
  stok: number;
}

// Transaction Types
export interface Transaksi {
  id: string;
  outlet_id: string;
  karyawan_id: string;
  tanggal: Date;
  total: number;
  metode_bayar: 'tunai' | 'qris';
  bukti_bayar?: string;
}

// Outlet Types
export interface Outlet {
  id: string;
  nama: string;
  alamat: string;
  telepon: string;
  is_active: boolean;
}

// Stock Request Types
export interface PermintaanStok {
  id: string;
  outlet_id: string;
  bahan_id: string;
  jumlah: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

// Goods Movement Types
export interface BarangMasuk {
  id: string;
  gudang_id: string;
  bahan_id: string;
  jumlah: number;
  tanggal: Date;
  suplier: string;
}

export interface BarangKeluar {
  id: string;
  gudang_id: string;
  outlet_id: string;
  tanggal_keluar: Date;
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
}

export interface DetailBarangKeluar {
  barang_keluar_id: string;
  bahan_id: string;
  quantity: number;
}

export interface BuktiPenerimaan {
  id: string;
  barang_keluar_id: string;
  outlet_id: string;
  karyawan_id: string;
  foto?: string;
  tanggal_terima: Date;
}

// Daily Revenue/Expense Types
export interface PemasukanHarian {
  outlet_id: string;
  tanggal: Date;
  total_pemasukan: number;
}

export interface PengeluaranHarian {
  id: string;
  outlet_id: string;
  tanggal: Date;
  deskripsi: string;
  jumlah: number;
}

// Report Types
export interface Laporan {
  id: string;
  jenis: 'penjualan' | 'stok' | 'keuangan' | 'gudang';
  tanggal_dibuat: Date;
  data: string;
}

