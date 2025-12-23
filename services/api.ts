// /services/api.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  LoginResponse,
  FileAsset,
  CreateOutletPayload,
  UpdateOutletPayload,
  CreateUserPayload,
  UpdateUserPayload,
  CreateBahanPayload,
  UpdateBahanPayload,
  CreateBarangMasukPayload,
  UpdateBarangMasukPayload,
  CreateBarangKeluarPayload,
  UpdateBarangKeluarPayload,
  UpdatePermintaanStokPayload,
  CreateProductPayload,
  UpdateProductPayload,
  CreateTransaksiPayload,
  UpdateTransaksiPayload,
  CreatePermintaanStokPayload,
  UpdatePermintaanStokKaryawanPayload,
  TerimaBarangKeluarResponse,
  Outlet,
  User,
  Bahan,
  BahanGudang, 
  BarangMasuk,
  BarangKeluar,
  PermintaanStok,
  Product,
  Transaksi,
  StokOutletItem,
  DashboardData,
  LaporanResponse,
} from '../types';

// Base URL
const BASE_URL = 'https://esteh-backend-production.up.railway.app/api';

// Storage keys
const TOKEN_KEY = '@auth_token';
const USER_KEY = '@user_data';

// --- TYPES INTERNAL API ---
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// --- HELPER FUNCTIONS ---

const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

const saveToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

const prepareImageFile = (imageAsset: FileAsset | null | undefined) => {
  if (!imageAsset) return null;

  const uri = imageAsset.uri;
  let name = (imageAsset as any).fileName || imageAsset.name;
  if (!name) {
    const parts = uri.split('/');
    name = parts[parts.length - 1];
  }

  let type = imageAsset.type;
  if (!type) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'png') type = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
    else type = 'image/jpeg';
  }

  return {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
    name,
    type,
  } as any;
};

const makeRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;

    console.log(`[API] ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, { ...options, headers });

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Invalid JSON response:', parseError);
      return { error: `Server Error: Respon tidak valid (${response.status})` };
    }

    if (!response.ok) {
      console.log('API Error Data:', data);
      if (response.status === 401) {
        await removeToken(); 
        return { error: 'Sesi habis, silakan login kembali.' };
      }
      const msg = data.message || data.error || `Error ${response.status}`;
      return { error: msg };
    }

    return { data: data };
  } catch (error: any) {
    console.error('Network Error Detail:', error);
    return { error: 'Gagal terhubung ke server. Periksa koneksi internet.' };
  }
};

const makeFormDataRequest = async <T = any>(
  endpoint: string,
  formData: FormData,
  method: string = 'POST'
): Promise<ApiResponse<T>> => {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;

    console.log(`[FormData] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: formData,
    });

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Invalid JSON (FormData):', parseError);
      return { error: 'Server Error: Invalid JSON response' };
    }

    if (!response.ok) {
      console.log('FormData Error:', data);
      if (response.status === 401) {
        await removeToken();
        return { error: 'Sesi habis, silakan login kembali.' };
      }
      const msg = data.message || data.error || `Upload Gagal (${response.status})`;
      return { error: msg };
    }

    return { data: data };
  } catch (error: any) {
    console.error('FormData Network Error Detail:', error);
    return { error: 'Gagal upload data. Periksa koneksi internet.' };
  }
};

// ==================== AUTHENTICATION ====================

export const authAPI = {
  login: async (username: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    const res = await makeRequest<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res.data) {
      const data = res.data as any;
      const token = data.access_token || data.token;
      if (token) await saveToken(token);
      if (data.user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
    }
    return res;
  },

  getMe: async (): Promise<ApiResponse<any>> => makeRequest('/me'),

  logout: async (): Promise<void> => {
    await makeRequest('/logout', { method: 'POST' });
    await removeToken();
  },
};

// ==================== OWNER APIs ====================

export const ownerAPI = {
  getOutlets: async () => makeRequest<Outlet[]>('/outlets'),
  getOutlet: async (id: number) => makeRequest<Outlet>(`/outlets/${id}`),
  createOutlet: async (data: CreateOutletPayload) =>
    makeRequest<Outlet>('/outlets', { method: 'POST', body: JSON.stringify(data) }),
  updateOutlet: async (id: number, data: UpdateOutletPayload) =>
    makeRequest<Outlet>(`/outlets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOutlet: async (id: number) => makeRequest(`/outlets/${id}`, { method: 'DELETE' }),

  getUsers: async () => makeRequest<User[]>('/users'),
  getUser: async (id: number) => makeRequest<User>(`/users/${id}`),
  createUser: async (data: CreateUserPayload) =>
    makeRequest<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: async (id: number, data: UpdateUserPayload) =>
    makeRequest<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: async (id: number) => makeRequest(`/users/${id}`, { method: 'DELETE' }),

  getLaporanPendapatan: async (startDate: string, endDate: string) =>
    makeRequest<LaporanResponse>(`/laporan/pendapatan?start_date=${startDate}&end_date=${endDate}`),
  exportLaporan: async (startDate: string, endDate: string) =>
    makeRequest(`/laporan/export?start_date=${startDate}&end_date=${endDate}`),
  getDashboard: async () => makeRequest<DashboardData>('/dashboard'),
};

// ==================== GUDANG APIs ====================

export const gudangAPI = {
  getBahan: async () => makeRequest<Bahan[]>('/gudang/bahan'),
  getBahanById: async (id: number) => makeRequest<Bahan>(`/gudang/bahan/${id}`),
  createBahan: async (data: CreateBahanPayload) =>
    makeRequest<Bahan>('/gudang/bahan', { method: 'POST', body: JSON.stringify(data) }),
  updateBahan: async (id: number, data: UpdateBahanPayload) =>
    makeRequest<Bahan>(`/gudang/bahan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBahan: async (id: number) => makeRequest(`/gudang/bahan/${id}`, { method: 'DELETE' }),

  getBarangMasuk: async () => makeRequest<BarangMasuk[]>('/gudang/barang-masuk'),
  getBarangMasukById: async (id: number) => makeRequest<BarangMasuk>(`/gudang/barang-masuk/${id}`),
  createBarangMasuk: async (data: CreateBarangMasukPayload) =>
    makeRequest<BarangMasuk>('/gudang/barang-masuk', { method: 'POST', body: JSON.stringify(data) }),
  updateBarangMasuk: async (id: number, data: UpdateBarangMasukPayload) =>
    makeRequest<BarangMasuk>(`/gudang/barang-masuk/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBarangMasuk: async (id: number) => makeRequest(`/gudang/barang-masuk/${id}`, { method: 'DELETE' }),

  getBarangKeluar: async () => makeRequest<BarangKeluar[]>('/gudang/barang-keluar'),
  getBarangKeluarById: async (id: number) => makeRequest<BarangKeluar>(`/gudang/barang-keluar/${id}`),
  
  createBarangKeluar: async (data: CreateBarangKeluarPayload) =>
    makeRequest<BarangKeluar>('/gudang/barang-keluar', { method: 'POST', body: JSON.stringify(data) }),

  updateBarangKeluar: async (id: number, data: UpdateBarangKeluarPayload) => {
    if (data.bukti_foto) {
      const formData = new FormData();
      if (data.jumlah !== undefined && data.jumlah !== null) formData.append('jumlah', data.jumlah.toString());
      const file = prepareImageFile(data.bukti_foto);
      if (file) formData.append('bukti_foto', file);
      formData.append('_method', 'PUT');
      return makeFormDataRequest<BarangKeluar>(`/gudang/barang-keluar/${id}`, formData, 'POST');
    }
    return makeRequest<BarangKeluar>(`/gudang/barang-keluar/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ jumlah: data.jumlah }),
    });
  },

  deleteBarangKeluar: async (id: number) => makeRequest(`/gudang/barang-keluar/${id}`, { method: 'DELETE' }),

  setBarangKeluarStatus: async (id: number, status: string) =>
    makeRequest(`/gudang/barang-keluar/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getStok: async () => makeRequest('/gudang/stok'),

  getPermintaanStok: async () => makeRequest<PermintaanStok[]>('/gudang/permintaan-stok'),
  getPermintaanStokById: async (id: number) => makeRequest<PermintaanStok>(`/gudang/permintaan-stok/${id}`),
  
  updatePermintaanStok: async (id: number, data: UpdatePermintaanStokPayload) => {
    // Mencoba status yang kemungkinan diterima backend Nopal
    const candidates = [String((data as any).status), 'disetujui', 'approved', 'rejected'];
    let lastErr: any = null;

    for (const candidate of candidates) {
      try {
        const res = await makeRequest<PermintaanStok>(`/gudang/permintaan-stok/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: candidate }),
        });
        if (!res.error) return res;
        lastErr = res.error;
      } catch (err: any) {
        lastErr = err;
      }
    }
    return { error: lastErr?.toString() || 'Gagal memperbarui status permintaan' } as ApiResponse<PermintaanStok>;
  },
};

// ==================== KARYAWAN / KASIR APIs ====================

export const karyawanAPI = {
  getProduk: async () => makeRequest<Product[]>('/produk'),
  getProdukById: async (id: number) => makeRequest<Product>(`/produk/${id}`),

  createProduk: async (data: CreateProductPayload) => {
    const formData = new FormData();
    formData.append('nama', data.nama);
    formData.append('harga', data.harga.toString());
    formData.append('category', data.category || 'Minuman');

    if (data.komposisi && data.komposisi.length > 0) {
      data.komposisi.forEach((item, index) => {
        formData.append(`komposisi[${index}][bahan_id]`, item.bahan_id.toString());
        formData.append(`komposisi[${index}][quantity]`, item.quantity.toString());
      });
    }

    const file = prepareImageFile(data.gambar);
    if (file) formData.append('gambar', file);

    return makeFormDataRequest<Product>('/produk', formData, 'POST');
  },

  updateProduk: async (id: number, data: UpdateProductPayload) => {
    const formData = new FormData();
    if (data.nama) formData.append('nama', data.nama);
    if (data.harga) formData.append('harga', data.harga.toString());
    if (data.category) formData.append('category', data.category);

    if (data.komposisi && data.komposisi.length > 0) {
      data.komposisi.forEach((item, index) => {
        formData.append(`komposisi[${index}][bahan_id]`, item.bahan_id.toString());
        formData.append(`komposisi[${index}][quantity]`, item.quantity.toString());
      });
    }

    const file = prepareImageFile(data.gambar);
    if (file) formData.append('gambar', file);

    formData.append('_method', 'PUT');
    return makeFormDataRequest<Product>(`/produk/${id}`, formData, 'POST');
  },

  deleteProduk: async (id: number) => makeRequest(`/produk/${id}`, { method: 'DELETE' }),

  getTransaksi: async () => makeRequest<Transaksi[]>('/transaksi'),
  getTransaksiById: async (id: number) => makeRequest<Transaksi>(`/transaksi/${id}`),

  createTransaksi: async (data: CreateTransaksiPayload) => {
    const formData = new FormData();
    formData.append('tanggal', data.tanggal);
    formData.append('metode_bayar', data.metode_bayar);
    formData.append('items', typeof data.items === 'string' ? data.items : JSON.stringify(data.items));

    if (data.bukti_qris) {
      const file = prepareImageFile(data.bukti_qris);
      if (file) formData.append('bukti_qris', file);
    }

    return makeFormDataRequest<Transaksi>('/transaksi', formData, 'POST');
  },

  updateTransaksi: async (id: number, data: UpdateTransaksiPayload) => {
    const formData = new FormData();
    if (data.tanggal) formData.append('tanggal', data.tanggal);
    if (data.metode_bayar) formData.append('metode_bayar', data.metode_bayar);
    if (data.items) formData.append('items', typeof data.items === 'string' ? data.items : JSON.stringify(data.items));

    if (data.bukti_qris) {
      const file = prepareImageFile(data.bukti_qris);
      if (file) formData.append('bukti_qris', file);
    }

    formData.append('_method', 'PUT');
    return makeFormDataRequest<Transaksi>(`/transaksi/${id}`, formData, 'POST');
  },

  deleteTransaksi: async (id: number) => makeRequest(`/transaksi/${id}`, { method: 'DELETE' }),

  getPermintaanStok: async () => makeRequest<PermintaanStok[]>('/permintaan-stok'),
  getPermintaanStokById: async (id: number) => makeRequest<PermintaanStok>(`/permintaan-stok/${id}`),
  createPermintaanStok: async (data: CreatePermintaanStokPayload) =>
    makeRequest<PermintaanStok>('/permintaan-stok', { method: 'POST', body: JSON.stringify(data) }),
  updatePermintaanStok: async (id: number, data: UpdatePermintaanStokKaryawanPayload) =>
    makeRequest<PermintaanStok>(`/permintaan-stok/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePermintaanStok: async (id: number) => makeRequest(`/permintaan-stok/${id}`, { method: 'DELETE' }),

  getStokOutlet: async () => makeRequest<StokOutletItem[]>('/stok/outlet'),
  getBahanGudang: async () => makeRequest<BahanGudang[]>('/bahan-gudang'),

  terimaBarangKeluar: async (id: number, bukti_foto?: FileAsset | null) => {
    if (bukti_foto) {
      const formData = new FormData();
      const file = prepareImageFile(bukti_foto);
      if (file) formData.append('bukti_foto', file);
      return makeFormDataRequest<TerimaBarangKeluarResponse>(`/barang-keluar/${id}/terima`, formData, 'POST');
    }
    return makeRequest<TerimaBarangKeluarResponse>(`/barang-keluar/${id}/terima`, { method: 'POST' });
  },

  tolakBarangKeluar: async (id: number) => {
    return gudangAPI.setBarangKeluarStatus(id, 'cancelled');
  },
};

export default {
  auth: authAPI,
  owner: ownerAPI,
  gudang: gudangAPI,
  karyawan: karyawanAPI,
  getToken,
  removeToken,
};