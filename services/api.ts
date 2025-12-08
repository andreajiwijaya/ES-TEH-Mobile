import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'web' ? '/api' : 'https://esteh-backend-production.up.railway.app/api';

// Types
interface LoginResponse {
  access_token?: string;
  token?: string;
  token_type?: string;
  user: {
    id: number;
    username: string;
    role: string;
    outlet_id?: number | null;
  };
  message?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Storage keys
const TOKEN_KEY = '@auth_token';
const USER_KEY = '@user_data';

// Helper function untuk mendapatkan token
const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Helper function untuk menyimpan token
const saveToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

// Helper function untuk menghapus token
const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Helper function untuk membuat request
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

    // Pastikan endpoint dimulai dengan /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;
    
    console.log('API Request:', options.method || 'GET', url);
    if (options.body && typeof options.body === 'string') {
      console.log('Request Body:', options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('API Response Status:', response.status, response.statusText);
    console.log('API Response URL:', response.url);

    let data;
    try {
      const responseText = await response.text();
      console.log('API Response Text:', responseText);
      
      if (!responseText) {
        return {
          error: `Server returned empty response: ${response.status} ${response.statusText}`,
        };
      }

      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('JSON Parse Error:', jsonError);
      return {
        error: `Server returned invalid JSON. Status: ${response.status} ${response.statusText}. Pastikan backend API berjalan dan dapat diakses.`,
      };
    }

    console.log('API Response Data:', data);

    if (!response.ok) {
      // Handle 404 specifically
      if (response.status === 404) {
        return {
          error: `Endpoint tidak ditemukan (404). Pastikan URL backend benar: ${BASE_URL}${cleanEndpoint}`,
        };
      }
      
      // Handle 405 Method Not Allowed
      if (response.status === 405) {
        return {
          error: `Method tidak diizinkan (405). Pastikan menggunakan method yang benar (GET/POST/PUT/DELETE).`,
        };
      }
      
      return {
        error: data.message || data.error || data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Backend langsung return data (tidak ada wrapper { data: ... })
    // Contoh: { access_token: "...", user: {...}, message: "..." }
    return { data: data };
  } catch (error: any) {
    console.error('API Network Error:', error);
    
    // Check if it's a network error
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
      return {
        error: `Tidak dapat terhubung ke server. Pastikan:\n1. Backend API berjalan di ${BASE_URL}\n2. Koneksi internet aktif\n3. URL backend benar`,
      };
    }
    
    return {
      error: error.message || 'Network error occurred',
    };
  }
};

// Helper function untuk FormData request (file upload)
const makeFormDataRequest = async <T>(
  endpoint: string,
  formData: FormData,
  method: string = 'POST'
): Promise<ApiResponse<T>> => {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;
    console.log('API FormData Request:', url, method);

    const response = await fetch(url, {
      method,
      headers,
      body: formData,
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      const text = await response.text();
      console.error('Response is not JSON:', text);
      return {
        error: `Server returned non-JSON response: ${response.status} ${response.statusText}`,
      };
    }

    console.log('API FormData Response:', response.status, data);

    if (!response.ok) {
      // Handle 405 Method Not Allowed
      if (response.status === 405) {
        return {
          error: `Method tidak diizinkan (405). Pastikan menggunakan method yang benar.`,
        };
      }
      
      return {
        error: data.message || data.error || data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Backend langsung return data (tidak ada wrapper)
    return { data: data };
  } catch (error: any) {
    console.error('API FormData Error:', error);
    return {
      error: error.message || 'Network error occurred',
    };
  }
};

// ==================== AUTHENTICATION ====================

export const authAPI = {
  // POST /login
  login: async (username: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    try {
      const url = `${BASE_URL}/login`;
      const requestBody = JSON.stringify({ username, password });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: requestBody,
      });

      console.log('=== LOGIN RESPONSE ===');
      console.log('Status:', response.status, response.statusText);

      let responseData;
      try {
        const responseText = await response.text();
        console.log('Response Text:', responseText);
        
        if (!responseText) {
          return {
            error: `Server returned empty response: ${response.status} ${response.statusText}`,
          };
        }

        responseData = JSON.parse(responseText);
        console.log('Response Data:', JSON.stringify(responseData, null, 2));
      } catch (jsonError: any) {
        console.error('JSON Parse Error:', jsonError);
        return {
          error: `Server returned invalid JSON. Status: ${response.status}. Error: ${jsonError.message}`,
        };
      }

      if (!response.ok) {
        // Handle error responses
        const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Login failed:', errorMessage);
        return {
          error: errorMessage,
        };
      }

      // Backend return format sesuai Postman: { access_token, token_type, user, message }
      const token = responseData.access_token;
      const user = responseData.user;

      if (!token) {
        console.error('Token not found in response:', responseData);
        return {
          error: 'Token not found in response. Response: ' + JSON.stringify(responseData),
        };
      }

      if (!user) {
        console.error('User not found in response:', responseData);
        return {
          error: 'User data not found in response. Response: ' + JSON.stringify(responseData),
        };
      }

      console.log('=== SAVING TOKEN ===');
      console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
      console.log('User:', JSON.stringify(user, null, 2));

      await saveToken(token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      console.log('=== TOKEN SAVED ===');

      return {
        data: {
          access_token: token,
          token: token, // Keep both for compatibility
          token_type: responseData.token_type || 'Bearer',
          user: user,
          message: responseData.message,
        },
      };
    } catch (error: any) {
      console.error('=== LOGIN EXCEPTION ===');
      console.error('Error:', error);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      
      return {
        error: error.message || 'Network error occurred. Pastikan koneksi internet aktif dan backend API dapat diakses.',
      };
    }
  },

  // GET /me
  getMe: async (): Promise<ApiResponse<any>> => {
    return makeRequest('/me');
  },

  // POST /logout
  logout: async (): Promise<void> => {
    await makeRequest('/logout', { method: 'POST' });
    await removeToken();
  },
};

// ==================== OWNER APIs ====================

export const ownerAPI = {
  // GET /outlets
  getOutlets: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/outlets');
  },

  // GET /outlets/{id}
  getOutlet: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/outlets/${id}`);
  },

  // POST /outlets
  createOutlet: async (data: { nama: string; alamat: string; is_active: boolean }): Promise<ApiResponse<any>> => {
    return makeRequest('/outlets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT /outlets/{id}
  updateOutlet: async (id: number, data: { nama: string; alamat: string; is_active: boolean }): Promise<ApiResponse<any>> => {
    return makeRequest(`/outlets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // DELETE /outlets/{id}
  deleteOutlet: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/outlets/${id}`, {
      method: 'DELETE',
    });
  },

  // GET /users
  getUsers: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/users');
  },

  // GET /users/{id}
  getUser: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/users/${id}`);
  },

  // POST /users
  createUser: async (data: { username: string; password: string; role: string; outlet_id?: number | null }): Promise<ApiResponse<any>> => {
    const requestData: any = {
      username: data.username,
      password: data.password,
      role: data.role,
    };
    
    // Only include outlet_id if it's provided and not null
    if (data.outlet_id !== undefined && data.outlet_id !== null) {
      requestData.outlet_id = data.outlet_id;
    }
    
    return makeRequest('/users', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  // PUT /users/{id}
  updateUser: async (id: number, data: { username?: string; password?: string; role?: string; outlet_id?: number }): Promise<ApiResponse<any>> => {
    return makeRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // DELETE /users/{id}
  deleteUser: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // GET /laporan/pendapatan
  getLaporanPendapatan: async (startDate: string, endDate: string): Promise<ApiResponse<any[]>> => {
    return makeRequest(`/laporan/pendapatan?start_date=${startDate}&end_date=${endDate}`);
  },

  // GET /laporan/export
  exportLaporan: async (startDate: string, endDate: string): Promise<ApiResponse<any>> => {
    return makeRequest(`/laporan/export?start_date=${startDate}&end_date=${endDate}`);
  },

  // GET /dashboard
  getDashboard: async (): Promise<ApiResponse<any>> => {
    return makeRequest('/dashboard');
  },
};

// ==================== GUDANG APIs ====================

export const gudangAPI = {
  // GET /gudang/bahan
  getBahan: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/gudang/bahan');
  },

  // GET /gudang/bahan/{id}
  getBahanById: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/bahan/${id}`);
  },

  // POST /gudang/bahan
  createBahan: async (data: { nama: string; satuan: string; stok_minimum_gudang: number; stok_minimum_outlet: number }): Promise<ApiResponse<any>> => {
    return makeRequest('/gudang/bahan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT /gudang/bahan/{id}
  updateBahan: async (id: number, data: { nama: string; satuan: string; stok_minimum_gudang: number; stok_minimum_outlet: number }): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/bahan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // DELETE /gudang/bahan/{id}
  deleteBahan: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/bahan/${id}`, {
      method: 'DELETE',
    });
  },

  // GET /gudang/barang-masuk
  getBarangMasuk: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/gudang/barang-masuk');
  },

  // GET /gudang/barang-masuk/{id}
  getBarangMasukById: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/barang-masuk/${id}`);
  },

  // POST /gudang/barang-masuk
  createBarangMasuk: async (data: { bahan_id: number; jumlah: number; supplier: string }): Promise<ApiResponse<any>> => {
    return makeRequest('/gudang/barang-masuk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT /gudang/barang-masuk/{id}
  updateBarangMasuk: async (id: number, data: { bahan_id: number; jumlah: number; supplier: string }): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/barang-masuk/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // DELETE /gudang/barang-masuk/{id}
  deleteBarangMasuk: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/barang-masuk/${id}`, {
      method: 'DELETE',
    });
  },

  // GET /gudang/barang-keluar
  getBarangKeluar: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/gudang/barang-keluar');
  },

  // GET /gudang/barang-keluar/{id}
  getBarangKeluarById: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/barang-keluar/${id}`);
  },

  // POST /gudang/barang-keluar
  createBarangKeluar: async (data: { permintaan_id: number }): Promise<ApiResponse<any>> => {
    return makeRequest('/gudang/barang-keluar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT /gudang/barang-keluar/{id}
  updateBarangKeluar: async (id: number, data: { jumlah?: number; bukti_foto?: any }): Promise<ApiResponse<any>> => {
    if (data.bukti_foto) {
      const formData = new FormData();
      if (data.jumlah) formData.append('jumlah', data.jumlah.toString());
      formData.append('bukti_foto', data.bukti_foto);
      return makeFormDataRequest(`/gudang/barang-keluar/${id}`, formData, 'PUT');
    }
    return makeRequest(`/gudang/barang-keluar/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ jumlah: data.jumlah }),
    });
  },

  // DELETE /gudang/barang-keluar/{id}
  deleteBarangKeluar: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/barang-keluar/${id}`, {
      method: 'DELETE',
    });
  },

  // POST /gudang/barang-keluar/{id}/terima
  terimaBarangKeluar: async (id: number, buktiFoto?: any): Promise<ApiResponse<any>> => {
    if (buktiFoto) {
      const formData = new FormData();
      formData.append('bukti_foto', buktiFoto);
      return makeFormDataRequest(`/gudang/barang-keluar/${id}/terima`, formData);
    }
    return makeRequest(`/gudang/barang-keluar/${id}/terima`, {
      method: 'POST',
    });
  },

  // GET /gudang/stok
  getStok: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/gudang/stok');
  },

  // GET /gudang/permintaan-stok
  getPermintaanStok: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/gudang/permintaan-stok');
  },

  // GET /gudang/permintaan-stok/{id}
  getPermintaanStokById: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/permintaan-stok/${id}`);
  },

  // PUT /gudang/permintaan-stok/{id}
  updatePermintaanStok: async (id: number, status: string): Promise<ApiResponse<any>> => {
    return makeRequest(`/gudang/permintaan-stok/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// ==================== KARYAWAN APIs ====================

export const karyawanAPI = {
  // GET /produk
  getProduk: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/produk');
  },

  // GET /produk/{id}
  getProdukById: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/produk/${id}`);
  },

  // POST /produk
  createProduk: async (data: { nama: string; harga: number; gambar?: any; komposisi: { bahan_id: number; quantity: number }[] }): Promise<ApiResponse<any>> => {
    if (data.gambar) {
      const formData = new FormData();
      formData.append('nama', data.nama);
      formData.append('harga', data.harga.toString());
      formData.append('gambar', data.gambar);
      formData.append('komposisi', JSON.stringify(data.komposisi));
      return makeFormDataRequest('/produk', formData);
    }
    return makeRequest('/produk', {
      method: 'POST',
      body: JSON.stringify({
        nama: data.nama,
        harga: data.harga,
        komposisi: data.komposisi,
      }),
    });
  },

  // PUT /produk/{id}
  updateProduk: async (id: number, data: { nama: string; harga: number; gambar?: any; komposisi: { bahan_id: number; quantity: number }[] }): Promise<ApiResponse<any>> => {
    if (data.gambar) {
      const formData = new FormData();
      formData.append('nama', data.nama);
      formData.append('harga', data.harga.toString());
      formData.append('gambar', data.gambar);
      formData.append('komposisi', JSON.stringify(data.komposisi));
      return makeFormDataRequest(`/produk/${id}`, formData, 'PUT');
    }
    return makeRequest(`/produk/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama: data.nama,
        harga: data.harga,
        komposisi: data.komposisi,
      }),
    });
  },

  // DELETE /produk/{id}
  deleteProduk: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/produk/${id}`, {
      method: 'DELETE',
    });
  },

  // GET /transaksi
  getTransaksi: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/transaksi');
  },

  // GET /transaksi/{id}
  getTransaksiById: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/transaksi/${id}`);
  },

  // POST /transaksi
  createTransaksi: async (data: { tanggal: string; metode_bayar: string; bukti_qris?: any; items: { produk_id: number; quantity: number }[] }): Promise<ApiResponse<any>> => {
    // Items harus sebagai JSON string sesuai dokumentasi
    const itemsString = JSON.stringify(data.items);
    
    if (data.bukti_qris) {
      const formData = new FormData();
      formData.append('tanggal', data.tanggal);
      formData.append('metode_bayar', data.metode_bayar);
      formData.append('bukti_qris', data.bukti_qris);
      formData.append('items', itemsString);
      return makeFormDataRequest('/transaksi', formData);
    }
    // Jika tidak ada bukti_qris, tetap gunakan FormData karena items adalah JSON string
    const formData = new FormData();
    formData.append('tanggal', data.tanggal);
    formData.append('metode_bayar', data.metode_bayar);
    formData.append('items', itemsString);
    return makeFormDataRequest('/transaksi', formData);
  },

  // PUT /transaksi/{id}
  updateTransaksi: async (id: number, data: { tanggal: string; metode_bayar: string; bukti_qris?: any; items: { produk_id: number; quantity: number }[] }): Promise<ApiResponse<any>> => {
    // Items harus sebagai JSON string sesuai dokumentasi
    const itemsString = JSON.stringify(data.items);
    
    const formData = new FormData();
    formData.append('tanggal', data.tanggal);
    formData.append('metode_bayar', data.metode_bayar);
    if (data.bukti_qris) {
      formData.append('bukti_qris', data.bukti_qris);
    }
    formData.append('items', itemsString);
    return makeFormDataRequest(`/transaksi/${id}`, formData, 'PUT');
  },

  // DELETE /transaksi/{id}
  deleteTransaksi: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/transaksi/${id}`, {
      method: 'DELETE',
    });
  },

  // GET /permintaan-stok
  getPermintaanStok: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/permintaan-stok');
  },

  // GET /permintaan-stok/{id}
  getPermintaanStokById: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/permintaan-stok/${id}`);
  },

  // POST /permintaan-stok
  createPermintaanStok: async (data: { bahan_id: number; jumlah: number }): Promise<ApiResponse<any>> => {
    return makeRequest('/permintaan-stok', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // PUT /permintaan-stok/{id}
  updatePermintaanStok: async (id: number, data: { bahan_id: number; jumlah: number }): Promise<ApiResponse<any>> => {
    return makeRequest(`/permintaan-stok/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // DELETE /permintaan-stok/{id}
  deletePermintaanStok: async (id: number): Promise<ApiResponse<any>> => {
    return makeRequest(`/permintaan-stok/${id}`, {
      method: 'DELETE',
    });
  },

  // GET /stok/outlet
  getStokOutlet: async (): Promise<ApiResponse<any[]>> => {
    return makeRequest('/stok/outlet');
  },
};

// Export all APIs
export default {
  auth: authAPI,
  owner: ownerAPI,
  gudang: gudangAPI,
  karyawan: karyawanAPI,
  getToken,
  removeToken,
};

