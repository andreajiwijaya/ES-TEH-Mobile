export const Colors = {
  // --- BRANDING (Green DNA) ---
  primary: '#43A047',       // Hijau utama (Fresh & Professional)
  primaryDark: '#2E7D32',   // Hijau tua untuk aksen berat
  primaryLight: '#E8F5E9',  // Hijau sangat muda (untuk background icon/badge)
  
  // --- BACKGROUNDS ---
  background: '#F8F9FA',    // Abu-abu sangat muda (Clean Look, tidak bikin sakit mata)
  backgroundLight: '#FFFFFF', // Putih murni untuk Kartu (Card) & Modal

  // --- TYPOGRAPHY (Teks) ---
  text: '#1F2937',          // Hitam soft (Modern Black)
  textSecondary: '#6B7280', // Abu-abu medium untuk subtitle/keterangan

  // --- STATUS INDICATORS ---
  success: '#10B981',       // Hijau Sukses (Modern)
  warning: '#F59E0B',       // Kuning/Orange Peringatan
  error: '#EF4444',         // Merah Error (Soft Red)
  info: '#3B82F6',          // Biru Informasi

  // --- BORDERS & LINES ---
  border: '#E5E7EB',        // Garis pemisah tipis
  
  // --- LOGO COLORS (Opsional, simpan saja) ---
  logoRed: '#E53935',
  logoGreen: '#2E7D32',
  logoYellow: '#FDD835',
};

// Semantic Material color palette (Light theme)
export const semanticColors = {
  // Surfaces
  surface: '#FFFFFF',
  surfaceVariant: '#F5F7FA',
  background: '#F8F9FA',

  // Content
  onSurface: '#1E293B',
  onSurfaceVariant: '#64748B',

  // Primary brand
  primary: Colors.primary,
  onPrimary: '#FFFFFF',

  // Secondary and accents
  secondary: '#6B7280',
  onSecondary: '#FFFFFF',

  // Status
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,

  // Dividers / borders
  outline: '#E2E8F0',

  // Effects
  ripple: 'rgba(0,0,0,0.12)',
};

// Optional: dark theme placeholders (not active yet)
export const semanticColorsDark = {
  surface: '#121212',
  surfaceVariant: '#1E1E1E',
  background: '#0F1115',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#B3B3B3',
  primary: Colors.primary,
  onPrimary: '#FFFFFF',
  secondary: '#A1A1AA',
  onSecondary: '#000000',
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
  outline: '#2A2A2A',
  ripple: 'rgba(255,255,255,0.16)',
};
