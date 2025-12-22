// /services/api.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { LoginResponse } from '../types';

// Base URL
const BASE_URL = 'https://esteh-backend-production.up.railway.app/api';

// Storage keys
const TOKEN_KEY = '@auth_token';
const USER_KEY = '@user_data';

// --- TYPES INTERNAL API ---
interface ApiResponse<T> {
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

// Helper: Ubah object image picker ke format file yang valid untuk FormData React Native
const prepareImageFile = (imageAsset: any) => {
  if (!imageAsset) return null;
  
  // Ambil URI
  const uri = imageAsset.uri;
  
  // Ambil Nama File (Fallback ke timestamp jika tidak ada)
  let name = imageAsset.fileName || imageAsset.name;
  if (!name) {
      const parts = uri.split('/');
      name = parts[parts.length - 1];
  }
  
  // Ambil Tipe Mime (Fallback berdasarkan ekstensi)
  let type = imageAsset.type;
  if (!type) {
      const ext = name.split('.').pop()?.toLowerCase();
      if (ext === 'png') type = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
      else type = 'image/jpeg'; // Default aman
  }

  return {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), // Fix uri path untuk iOS
    name,
    type,
  } as any;
};

// Helper: Request Biasa (JSON)
const makeRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;
    
    console.log(`[API] ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, { ...options, headers });
    
    // Handle Text Response first (untuk debug error HTML dari server)
    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      // FIX ESLint: Mencetak parseError agar variabel terpakai
      console.error('Invalid JSON response:', parseError);
      console.error('Raw Response Text:', responseText); 
      return { error: `Server Error: Respon tidak valid (${response.status})` };
    }

    if (!response.ok) {
        console.log('API Error Data:', data);
        if (response.status === 401) {
            await removeToken(); // Auto logout
            return { error: 'Sesi habis, silakan login kembali.' };
        }
        // Ambil pesan error yang paling relevan
        const msg = data.message || data.error || `Error ${response.status}`;
        return { error: msg };
    }

    return { data: data };
  } catch (error: any) {
    // FIX ESLint: Mencetak error agar variabel terpakai
    console.error('Network Error Detail:', error);
    return { error: 'Gagal terhubung ke server. Periksa koneksi internet.' };
  }
};

// Helper: Request FormData (Upload File)
const makeFormDataRequest = async <T>(
  endpoint: string,
  formData: FormData,
  method: string = 'POST'
): Promise<ApiResponse<T>> => {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      // PENTING: Jangan set 'Content-Type' manual! Biarkan fetch yang mengaturnya
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
      // FIX ESLint: Mencetak parseError agar variabel terpakai
      console.error('Invalid JSON (FormData):', parseError);
      return { error: 'Server Error: Invalid JSON response' };
    }

    if (!response.ok) {
      console.log('FormData Error:', data);
      const msg = data.message || data.error || `Upload Gagal (${response.status})`;
      return { error: msg };
    }

    return { data: data };
  } catch (error: any) {
    // FIX ESLint: Mencetak error agar variabel terpakai
    console.error('FormData Network Error Detail:', error);
    return { error: 'Gagal upload data. Periksa koneksi internet.' };
  }
};

// ==================== AUTHENTICATION ====================

export const authAPI = {
  // 1. POST /login
  login: async (username: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    const res = await makeRequest<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res.data && res.data.access_token) {
      await saveToken(res.data.access_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }
    return res;
  },

  // 2. GET /me
  getMe: async (): Promise<ApiResponse<any>> => makeRequest('/me'),

  // 3. POST /logout
  logout: async (): Promise<void> => {
    await makeRequest('/logout', { method: 'POST' });
    await removeToken();
  },
};

// ==================== OWNER APIs ====================

export const ownerAPI = {
  getOutlets: async () => makeRequest('/outlets'),
  getOutlet: async (id: number) => makeRequest(`/outlets/${id}`),
  createOutlet: async (data: { nama: string; alamat: string; is_active: boolean }) => 
    makeRequest('/outlets', { method: 'POST', body: JSON.stringify(data) }),
  updateOutlet: async (id: number, data: any) => 
    makeRequest(`/outlets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOutlet: async (id: number) => makeRequest(`/outlets/${id}`, { method: 'DELETE' }),

  getUsers: async () => makeRequest('/users'),
  getUser: async (id: number) => makeRequest(`/users/${id}`),
  createUser: async (data: any) => 
    makeRequest('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: async (id: number, data: any) => 
    makeRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: async (id: number) => makeRequest(`/users/${id}`, { method: 'DELETE' }),

  getLaporanPendapatan: async (startDate: string, endDate: string) => 
    makeRequest(`/laporan/pendapatan?start_date=${startDate}&end_date=${endDate}`),
  exportLaporan: async (startDate: string, endDate: string) => 
    makeRequest(`/laporan/export?start_date=${startDate}&end_date=${endDate}`),
  getDashboard: async () => makeRequest('/dashboard'),
};

// ==================== GUDANG APIs ====================

export const gudangAPI = {
  getBahan: async () => makeRequest('/gudang/bahan'),
  getBahanById: async (id: number) => makeRequest(`/gudang/bahan/${id}`),
  createBahan: async (data: any) => 
    makeRequest('/gudang/bahan', { method: 'POST', body: JSON.stringify(data) }),
  updateBahan: async (id: number, data: any) => 
    makeRequest(`/gudang/bahan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBahan: async (id: number) => makeRequest(`/gudang/bahan/${id}`, { method: 'DELETE' }),

  getBarangMasuk: async () => makeRequest('/gudang/barang-masuk'),
  getBarangMasukById: async (id: number) => makeRequest(`/gudang/barang-masuk/${id}`),
  createBarangMasuk: async (data: any) => 
    makeRequest('/gudang/barang-masuk', { method: 'POST', body: JSON.stringify(data) }),
  updateBarangMasuk: async (id: number, data: any) => 
    makeRequest(`/gudang/barang-masuk/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBarangMasuk: async (id: number) => makeRequest(`/gudang/barang-masuk/${id}`, { method: 'DELETE' }),

  getBarangKeluar: async () => makeRequest('/gudang/barang-keluar'),
  getBarangKeluarById: async (id: number) => makeRequest(`/gudang/barang-keluar/${id}`),
  createBarangKeluar: async (data: { permintaan_id: number }) => 
    makeRequest('/gudang/barang-keluar', { method: 'POST', body: JSON.stringify(data) }),

  updateBarangKeluar: async (id: number, data: { jumlah?: number; bukti_foto?: any }) => {
    if (data.bukti_foto) {
      const formData = new FormData();
      if (data.jumlah) formData.append('jumlah', data.jumlah.toString());
      
      const file = prepareImageFile(data.bukti_foto);
      if (file) formData.append('bukti_foto', file);
      
      formData.append('_method', 'PUT'); // Trick Laravel agar bisa baca FormData di method PUT
      return makeFormDataRequest(`/gudang/barang-keluar/${id}`, formData, 'POST');
    }
    return makeRequest(`/gudang/barang-keluar/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify({ jumlah: data.jumlah }) 
    });
  },

  deleteBarangKeluar: async (id: number) => makeRequest(`/gudang/barang-keluar/${id}`, { method: 'DELETE' }),

  getStok: async () => makeRequest('/gudang/stok'),
  getPermintaanStok: async () => makeRequest('/gudang/permintaan-stok'),
  getPermintaanStokById: async (id: number) => makeRequest(`/gudang/permintaan-stok/${id}`),
  
  // FIX: Mengubah agar menerima object data (status) agar sinkron dengan permintaan.tsx Gudang
  updatePermintaanStok: async (id: number, data: { status: string }) => 
    makeRequest(`/gudang/permintaan-stok/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ==================== KARYAWAN APIs ====================

export const karyawanAPI = {
  getProduk: async () => makeRequest('/produk'),
  getProdukById: async (id: number) => makeRequest(`/produk/${id}`),

  // 39. POST /produk (Create)
  createProduk: async (data: { nama: string; harga: number; gambar?: any; category?: string; komposisi: any[] }) => {
    const formData = new FormData();
    formData.append('nama', data.nama);
    formData.append('harga', data.harga.toString());
    formData.append('category', data.category || 'Minuman');
    
    // REVISI UNTUK ERROR "komposisi must be an array"
    // Laravel seringkali bingung jika kita kirim string JSON. 
    // Jika array kosong, kita pastikan kirim string '[]' atau loop append.
    const komposisiArray = Array.isArray(data.komposisi) ? data.komposisi : [];
    formData.append('komposisi', JSON.stringify(komposisiArray));

    if (data.gambar) {
      const file = prepareImageFile(data.gambar);
      if (file) formData.append('gambar', file);
    }

    return makeFormDataRequest('/produk', formData, 'POST');
  },

  // 40. PUT /produk/{id} (Update)
  updateProduk: async (id: number, data: { nama: string; harga: number; gambar?: any; category?: string; komposisi: any[] }) => {
    const formData = new FormData();
    formData.append('nama', data.nama);
    formData.append('harga', data.harga.toString());
    formData.append('category', data.category || 'Minuman');
    
    // REVISI UNTUK ERROR "komposisi must be an array"
    const komposisiArray = Array.isArray(data.komposisi) ? data.komposisi : [];
    formData.append('komposisi', JSON.stringify(komposisiArray));
    
    if (data.gambar) {
      const file = prepareImageFile(data.gambar);
      if (file) formData.append('gambar', file);
    }

    formData.append('_method', 'PUT'); // Trick Laravel
    return makeFormDataRequest(`/produk/${id}`, formData, 'POST');
  },

  deleteProduk: async (id: number) => makeRequest(`/produk/${id}`, { method: 'DELETE' }),

  getTransaksi: async () => makeRequest('/transaksi'),
  getTransaksiById: async (id: number) => makeRequest(`/transaksi/${id}`),

  // 44. POST /transaksi
  createTransaksi: async (data: { tanggal: string; metode_bayar: string; bukti_qris?: any; items: any }) => {
    const formData = new FormData();
    formData.append('tanggal', data.tanggal);
    formData.append('metode_bayar', data.metode_bayar);
    
    // Stringify array items agar terbaca backend
    formData.append('items', typeof data.items === 'string' ? data.items : JSON.stringify(data.items));

    if (data.bukti_qris) {
      const file = prepareImageFile(data.bukti_qris);
      if (file) formData.append('bukti_qris', file);
    }

    return makeFormDataRequest('/transaksi', formData, 'POST');
  },

  // 45. PUT /transaksi/{id}
  updateTransaksi: async (id: number, data: any) => {
    const formData = new FormData();
    if(data.tanggal) formData.append('tanggal', data.tanggal);
    if(data.metode_bayar) formData.append('metode_bayar', data.metode_bayar);
    if(data.items) formData.append('items', typeof data.items === 'string' ? data.items : JSON.stringify(data.items));
    
    if (data.bukti_qris) {
       const file = prepareImageFile(data.bukti_qris);
       if (file) formData.append('bukti_qris', file);
    }
    
    formData.append('_method', 'PUT');
    return makeFormDataRequest(`/transaksi/${id}`, formData, 'POST');
  },

  deleteTransaksi: async (id: number) => makeRequest(`/transaksi/${id}`, { method: 'DELETE' }),

  getPermintaanStok: async () => makeRequest('/permintaan-stok'),
  getPermintaanStokById: async (id: number) => makeRequest(`/permintaan-stok/${id}`),
  createPermintaanStok: async (data: any) => makeRequest('/permintaan-stok', { method: 'POST', body: JSON.stringify(data) }),
  updatePermintaanStok: async (id: number, data: any) => makeRequest(`/permintaan-stok/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePermintaanStok: async (id: number) => makeRequest(`/permintaan-stok/${id}`, { method: 'DELETE' }),

  getStokOutlet: async () => makeRequest('/stok/outlet'),

  // FIX: Menambahkan fungsi yang sempat hilang agar tab Penerimaan di stok.tsx Karyawan tidak error
  terimaBarangKeluar: async (id: number) => 
    makeRequest(`/gudang/barang-keluar/${id}/terima`, { method: 'POST' }),
};

export default {
  auth: authAPI,
  owner: ownerAPI,
  gudang: gudangAPI,
  karyawan: karyawanAPI,
  getToken,
  removeToken,
};