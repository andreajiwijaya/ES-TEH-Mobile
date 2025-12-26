// /types/index.ts

export type Nullable<T> = T | null | undefined;

export interface FileAsset {
  uri: string;
  name?: string;
  fileName?: string;
  type?: string;
}

// ==================== USER & AUTH ====================
export interface User {
  id: number;
  username: string;
  role: 'karyawan' | 'gudang' | 'owner' | 'supervisor';
  outlet_id?: number | null;
  outlet?: Outlet | null;
}

export interface LoginResponse {
  message?: string;
  access_token?: string;
  token?: string;
  token_type?: string;
  user?: User;
}

// ==================== OUTLET ====================
export interface Outlet {
  id: number;
  nama: string;
  alamat: string;
  is_active?: boolean | number;
  stok_minimum_gudang?: number;
  isi_per_satuan?: number;
  berat_per_isi?: number;
  users_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

// ==================== KATEGORI ====================
export interface Kategori {
  id: number;
  nama: string;
  created_at?: string | null;
  updated_at?: string | null;
}

// ==================== BAHAN & PRODUK ====================
export interface Bahan {
  id: number;
  nama: string;
  satuan: string;
  isi_per_satuan?: number;
  berat_per_isi?: number;
  stok_minimum_gudang: number;
  stok_minimum_outlet: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BahanGudang {
  id: number;
  nama: string;
  satuan: string;
  isi_per_satuan?: number;
  berat_per_isi?: number;
  stok?: number;
  kategori_id?: number | null;
  kategori?: Kategori | null;
}

export interface Komposisi {
  id?: number;
  produk_id?: number;
  bahan_id: number;
  quantity: number;
  bahan?: Bahan | null;
}

export interface Product {
  id: number;
  nama: string;
  harga: number;
  gambar?: string | FileAsset | null;
  is_available?: boolean;
  category?: string | null;
  kategori_id?: number | null;
  kategori?: Kategori | null;
  komposisi?: Komposisi[] | null;
}

// ==================== STOK OUTLET ====================
export interface StokOutletItem {
  id: number;
  outlet_id?: number | null;
  bahan_id: number;
  stok: number;
  status?: 'Aman' | 'Kritis' | string;
  bahan?: Bahan | null;
}

// ==================== TRANSAKSI ====================
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
  produk?: Product | null;
}

export interface Transaksi {
  id: number;
  outlet_id: number;
  karyawan_id: number;
  tanggal: string;
  total: number;
  metode_bayar: 'tunai' | 'qris';
  bukti_qris?: string | null;
  items?: TransaksiItem[] | null;
}

// ==================== GUDANG (WAREHOUSE) ====================
export interface StokGudang {
  bahan_id: number;
  stok: number;
  bahan?: Bahan | null;
}

export interface BarangMasuk {
  id: number;
  bahan_id: number;
  jumlah: number;
  tanggal: string;
  supplier: string;
  bahan?: Bahan | null;
}

export type PermintaanStokStatus = 'diajukan' | 'disetujui' | 'ditolak' | 'dikirim' | 'diterima' | string;

export interface BarangKeluar {
  id: number;
  permintaan_id?: number | null;
  outlet_id?: number | null;
  jumlah?: number | null;
  tanggal_keluar?: string | null;
  status?: PermintaanStokStatus;
  bukti_foto?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  bahan?: Bahan | null;
  outlet?: Outlet | null;
}

export interface PermintaanStok {
  id: number;
  outlet_id: number;
  bahan_id: number;
  jumlah: number;
  status: PermintaanStokStatus;
  bahan?: Bahan | null;
  outlet?: Outlet | null;
  created_at?: string;
  updated_at?: string;
}

// ==================== LAPORAN & DASHBOARD ====================
export interface LaporanItem {
  tanggal: string;
  total_pemasukan?: number;
}

export interface LaporanResponse {
  message?: string;
  total_pendapatan?: number;
  detail_per_hari?: LaporanItem[];
}

export interface DashboardData {
  permintaan_pending: number;
  jumlah_stok_kritis: number;
  pendapatan_hari_ini: number;
  stok_gudang?: any[];
}

// ==================== API PAYLOAD TYPES ====================
export interface CreateOutletPayload {
  nama: string;
  alamat: string;
  is_active: boolean;
}

export interface UpdateOutletPayload {
  nama?: string;
  alamat?: string;
  is_active?: boolean;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: 'karyawan' | 'gudang' | 'owner' | 'supervisor';
  outlet_id?: number;
}

export interface UpdateUserPayload {
  username?: string;
  password?: string;
  role?: 'karyawan' | 'gudang' | 'owner' | 'supervisor';
  outlet_id?: number | null;
}

export interface CreateBahanPayload {
  nama: string;
  satuan: string;
  isi_per_satuan: number;
  berat_per_isi: number;
  stok_minimum_gudang: number;
  stok_minimum_outlet: number;
}

export interface UpdateBahanPayload {
  nama?: string;
  satuan?: string;
  isi_per_satuan?: number;
  berat_per_isi?: number;
  stok_minimum_gudang?: number;
  stok_minimum_outlet?: number;
}

export interface CreateBarangMasukPayload {
  bahan_id: number;
  jumlah: number;
  supplier: string;
}

export interface UpdateBarangMasukPayload {
  bahan_id?: number;
  jumlah?: number;
  supplier?: string;
}

export interface CreateKategoriPayload {
  nama: string;
}

export interface UpdateKategoriPayload {
  nama: string;
}

export interface UpdatePermintaanStokPayload {
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'dikirim' | 'diterima';
}

export interface CreateProductPayload {
  nama: string;
  harga: number;
  gambar?: FileAsset | null;
  category?: string;
  kategori_id: number;
  komposisi: { bahan_id: number; quantity: number }[];
}

export interface UpdateProductPayload {
  nama?: string;
  harga?: number;
  gambar?: FileAsset | null;
  category?: string;
  kategori_id?: number;
  komposisi?: { bahan_id: number; quantity: number }[];
}

export interface CreatePermintaanStokPayload {
  bahan_id: number;
  jumlah: number;
}

export interface UpdatePermintaanStokKaryawanPayload {
  bahan_id?: number;
  jumlah?: number;
}

export interface CreateTransaksiPayload {
  tanggal: string;
  metode_bayar: 'tunai' | 'qris';
  bukti_qris?: FileAsset | null;
  items: TransaksiItemPayload[] | string;
}

export interface UpdateTransaksiPayload {
  tanggal?: string;
  metode_bayar?: 'tunai' | 'qris';
  bukti_qris?: FileAsset | null;
  items?: TransaksiItemPayload[] | string;
}

export interface TerimaBarangKeluarResponse {
  message: string;
  data: BarangKeluar;
}