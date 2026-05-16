## Ringkasan Perubahan
<!-- Jelaskan apa yang diubah dan mengapa. 2-3 kalimat sudah cukup. -->


## Tipe Perubahan
<!-- Centang yang sesuai -->
- [ ] 🐛 Bug fix
- [ ] ✨ Fitur baru
- [ ] ♻️  Refactor (tidak mengubah fungsionalitas)
- [ ] 📦 Update dependensi
- [ ] 📝 Dokumentasi
- [ ] 🔒 Keamanan
- [ ] ⚙️  CI/CD / Konfigurasi

## File Krusial yang Diubah?
<!-- Bot akan otomatis mendeteksi dan memblokir auto-merge jika ya -->
- [ ] `src/features/auth/` (autentikasi)
- [ ] `src/shared/api/db.ts` (schema database)
- [ ] `firestore.rules` (aturan keamanan Firestore)
- [ ] `src/infrastructure/crypto/` (enkripsi)
- [ ] Tidak ada — perubahan aman untuk auto-merge

## Checklist
- [ ] `npm run build` berhasil di lokal
- [ ] Tidak ada TypeScript error (`npx tsc --noEmit`)
- [ ] Tests lulus (`npm test`)
- [ ] Tidak ada console.log yang memuat data sensitif (PII)
