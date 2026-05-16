# ADR 006: Pin GitHub Actions to Full Commit SHAs

## Status
Accepted

## Context
Dalam repositori `devPSA-Business/PSA-Business-Suite`, semua GitHub Actions sebelum ini menggunakan semantic version tags (misalnya `@v4`, `@v2`). Hal ini menimbulkan risiko keamanan di mana *maintainer* dari action tersebut dapat melakukan update tag diam-diam, yang dapat merusak alur kerja (workflow) CI/CD atau menyuntikkan kode berbahaya. Ini bertentangan dengan kebijakan Zero-Trust dan persyaratan keamanan *offline-first* PWA perusahaan kami.

## Keputusan
Mulai saat ini, semua GitHub Actions harus dipasang dengan *commit SHA* penuh (40 karakter) dari rilis yang stabil, dan disertakan dengan komentar versi yang jelas (contoh: `@<commit-sha> # v4.3.3`).

Kami telah melakukan *pinning* SHA untuk action berikut di dalam `/.github/workflows/ci.yml`:
- `actions/upload-artifact@65462800fd760344b1a7b4382951275a0abb4808 # v4.3.3` (sebelumnya `@v4`)
- `davelosert/vitest-coverage-report-action@5a78cb16e761204097ad8a39369ea5d0ff7c8a5d # v2.8.0` (sebelumnya `@v2`)

Dan semua workflow lainnya (`deploy.yml`, `release.yml`) telah menggunakan full SHAs.

## Konsekuensi
### Kelebihan
- **Stabilitas & Reproducibility:** Workflow CI/CD bersifat fixed; setiap run akan menggunakan kode yang sama dari GitHub Actions.
- **Keamanan:** Membantu memitigasi serangan re-routing tag atau sisipan malicious payload pada dependensi yang dapat menghancurkan *security state* repository.

### Kekurangan
- **Maintenance Tambahan:** Membutuhkan manual checking atau dependabot/skrip internal untuk mengetahui apakah ada pembaruan rutin dan valid. Lakukan review manual bila harus meng-update SHA tersebut ke versi terbaru agar auditability tetap kuat.
