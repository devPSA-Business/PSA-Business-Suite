/**
 * @file ui_registry.ts
 * @description Single Source of Truth for all UI Labels and Technical Names.
 * @strategy Two-Layer Naming (Display Label vs Technical Name)
 */

export const UI_REGISTRY = {
  PAGES: {
    HOME: {
      tech: 'home',
      label: 'Beranda',
    },
    WORKSPACE: {
      tech: 'workspace',
      label: 'Operasional Toko',
    },
    OFFICE: {
      tech: 'office',
      label: 'Manajemen',
    },
    CASHIER: {
      tech: 'cashier',
      label: 'Kasir Ritel',
    },
    INVENTORY: {
      tech: 'inventory',
      label: 'Manajemen Stok',
    },
    SETTINGS: {
      tech: 'settings',
      label: 'Pengaturan Sistem',
    },
  },
  ACTIONS: {
    SAVE: {
      tech: 'action_save',
      label: 'Simpan Perubahan',
    },
    CREATE: {
      tech: 'action_create',
      label: 'Tambah',
    },
    DELETE: {
      tech: 'action_delete',
      label: 'Hapus Data',
    },
    CANCEL: {
      tech: 'action_cancel',
      label: 'Batal',
    },
    PRINT: {
      tech: 'action_print',
      label: 'Cetak Struk',
    },
    CLOSE_SHIFT: {
      tech: 'action_close_shift',
      label: 'Tutup Shift',
    },
    REVIEW: {
      tech: 'action_review',
      label: 'Review & Tutup',
    },
  },
  STATUS: {
    PENDING: {
      tech: 'status_pending',
      label: 'Menunggu',
    },
    SUCCESS: {
      tech: 'status_success',
      label: 'Berhasil',
    },
    FAILED: {
      tech: 'status_failed',
      label: 'Gagal',
    },
  },
} as const;

export type PageTechName = typeof UI_REGISTRY.PAGES[keyof typeof UI_REGISTRY.PAGES]['tech'];
