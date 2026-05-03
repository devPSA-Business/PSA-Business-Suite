# ADR 011: Rollback App Check Disabling di Firestore Rules

## Konteks dan Latar Belakang
Pada sesi perbaikan sebelumnya (terkait remediasi bug), dilakukan modifikasi sementara pada fungsi `isAppCheckVerified()` di `firestore.rules` agar me-return `true`. Modifikasi ini ditujukan untuk memitigasi isu onboarding perangkat baru ke Firestore bila App Check belum terkonfigurasi secara matang pada level frontend.

Namun, evaluasi arsitektur kritis lanjutan menyimpulkan bahwa perubahan ini **menimbulkan regresi keamanan tingkat tinggi (Security Regression Level Parah)**. Hal ini disebabkan karena `isHardened()` sebelumnya didefinisikan sebagai:
`function isHardened() { return isAppCheckVerified() && isVerified(); }`

Dengan `isAppCheckVerified()` mengembalikan `true` secara global, `isHardened()` menjadi identik sepenuhnya dengan validasi verifikasi biasa (`isVerified()`). Kondisi ini secara eksplisit **mem-bypass semua lapisan proteksi App Check** pada rule seperti pengaksesan dokumen `customers` maupun `repair_services`. Bypass semacam ini jauh lebih berbahaya dibandingkan isu *friction* onboarding kasir. Kata "sementara" atau anotasi "// TODO" tidak dapat diterima dalam lingkup *zero-trust rules*. Aturan keamanan (security rules) yang cacat akan selamanya cacat hingga ada intervensi manual yang memperbaikinya.

## Keputusan & Tindakan Perbaikan
Berdasarkan pertimbangan kritis (zero-trust policy and least privilege), kami melakukan hal-hal berikut:

1. **Reversion/Rollback Mutlak `isAppCheckVerified()`**
   - Melakukan pengembalian implementasi `isAppCheckVerified` dari `return true;` kembali menjadi bentuk semula:
   `function isAppCheckVerified() { return request.app != null; }`

2. **Verifikasi Silang Integritas Checkout (BUG-001)**
   - Menginspeksi skrip `src/features/pos/usecases/CheckoutUseCase.ts` untuk menjamin tidak ada residu operasi aritmatika JS murni (`+`, `-`, `*`, `/`) di luar pembungkus valid `MathUtils` dan desimal (khususnya untuk `finalTotal`, `grossProfit`, atau operasional pengurangan diskon lainnya). Semua instansi variabel keuangan yang berkaitan telah terbungkus dengan kalkulasi `MathUtils`.

3. **Verifikasi Ulang Pengujian**
   - Integrasi Vitest dieksekusi 100% dan terbukti menghasilkan luaran sukses `56 passed, 0 failed` untuk meyakinkan kelurusan flow test dan operasional tanpa menyembunyikan kesalahan konsol terminal.

## Status
**Selesai dan Diterapkan (Reverted Security Defect)**

## Penulis
- Sistem AI Pendamping / Tim IT Virtual (Sesi Evaluasi Kritis)
