# Es Teh Favorit - Mobile POS System

A comprehensive Point of Sale (POS) system mobile application for managing multiple outlets, inventory, and business operations.

## 📱 Features

### Employee Dashboard (Karyawan)
- **Transaksi**: Point of Sale interface with product catalog and order management
- **Stok Bahan**: Monitor raw material stock levels at outlet
- **Riwayat**: View transaction history with filters
- **Pengaturan**: Account and app settings

### Warehouse Dashboard (Gudang)
- **Overview**: Central warehouse stock monitoring
- **Barang Masuk**: Record incoming goods from suppliers
- **Barang Keluar**: Manage outgoing shipments to outlets
- **Stok Opname**: Physical stock recording and adjustment

### Owner Dashboard
- **Dashboard**: Business metrics, sales charts, and outlet performance
- **Outlet**: Manage outlet information and status
- **Karyawan**: Employee account management
- **Laporan**: Generate and download business reports (CSV/PDF)

## 🏗️ Project Structure

```
es-teh/
├── app/
│   ├── (auth)/              # Authentication screens
│   │   └── login.tsx
│   ├── (employee)/          # Employee/Karyawan dashboard
│   │   ├── _layout.tsx
│   │   ├── transaksi.tsx
│   │   ├── stok.tsx
│   │   ├── riwayat.tsx
│   │   └── pengaturan.tsx
│   ├── (warehouse)/         # Warehouse/Gudang dashboard
│   │   ├── _layout.tsx
│   │   ├── overview.tsx
│   │   ├── barang-masuk.tsx
│   │   ├── barang-keluar.tsx
│   │   └── stok-opname.tsx
│   ├── (owner)/             # Owner dashboard
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── outlet.tsx
│   │   ├── karyawan.tsx
│   │   └── laporan.tsx
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Entry point
├── types/
│   └── index.ts             # TypeScript interfaces
├── constants/
│   └── Colors.ts            # Color scheme
└── assets/
    └── images/              # App icons and images
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

3. Run on your preferred platform:
   - Press `a` for Android
   - Press `i` for iOS
   - Press `w` for Web
   - Scan QR code with Expo Go app

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Language**: TypeScript
- **Icons**: @expo/vector-icons

## 📋 User Roles

1. **Karyawan (Employee)**: Handle transactions, monitor stock, view history
2. **Gudang (Warehouse)**: Manage inventory, record incoming/outgoing goods
3. **Owner**: View analytics, manage outlets and employees, generate reports

## 📝 Notes

- All screens are designed to match the use case and class diagrams
- The app uses Indonesian language (Bahasa Indonesia)
- Color scheme follows the Es Teh Favorit brand (green theme)

## 📄 License

Private project for Es Teh Favorit Indonesia
