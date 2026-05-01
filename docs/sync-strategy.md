# Strategi Sinkronisasi (Sync Strategy)

Dokumen ini menjelaskan mekanisme sinkronisasi data antara IndexedDB (lokal) dan Server Utama pada PSA Business Suite.

## 1. Offline-First Behavior
Aplikasi dirancang untuk selalu membaca dan menulis ke database lokal (Dexie) terlebih dahulu. 
- Setiap operasi mutasi (Create, Update, Delete) akan dicatat ke dalam tabel `sync_events`.
- UI tidak pernah menunggu respons dari server untuk menampilkan perubahan (Optimistic UI).

## 2. Retry Policy & Exponential Backoff
`SyncServiceImpl` berjalan di latar belakang (Background Worker/Interval).
- Jika perangkat offline atau server tidak merespons, event akan tetap berada di tabel `sync_events` dengan status `PENDING`.
- **Retry Logic:** Sistem akan mencoba mengirim ulang setiap 30 detik. Jika gagal berturut-turut, interval akan meningkat secara eksponensial (30s, 1m, 2m, 4m, dst) maksimal hingga 1 jam.

## 3. Conflict Resolution
Mengingat aplikasi dapat digunakan oleh beberapa kasir secara bersamaan:
- **Last Write Wins (LWW) dengan Timestamp:** Untuk entitas non-kritis (seperti profil pelanggan), perubahan dengan `updatedAt` terbaru akan menimpa data lama.
- **CRDT (Conflict-free Replicated Data Type) / Delta Updates:** Untuk entitas kritis seperti **Stok Barang**, sinkronisasi tidak mengirimkan "Total Stok Akhir", melainkan mengirimkan "Delta" (misal: `-2 item`). Server akan mengakumulasi delta ini untuk mencegah *race condition*.
- **Idempotency Key:** Setiap transaksi (`Checkout`, `CloseShift`) dilengkapi dengan `id` unik (UUID v4) yang bertindak sebagai *idempotency key*. Jika server menerima ID yang sama dua kali akibat *retry*, server akan mengabaikan *request* kedua.
