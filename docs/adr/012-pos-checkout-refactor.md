# ADR 012: POS Checkout Refactor (Architecture Layering)

**Status:** IN_PROGRESS
**Date:** 2026-05-08
**Context:** POS Checkout (`src/features/pos`) saat ini mengakses Firestore langsung, melanggar arsitektur *Offline-First* dan *Clean Architecture*.

## Decision
Memindahkan logika akses DB dari komponen UI ke `useCheckoutStore` (Zustand) → `CheckoutUseCase` → `IUnitOfWork` (IndexedDB).

## Consequences
- **Positif:** Kepatuhan terhadap *architecture guidelines*, *testability* meningkat, *offline-first* terjamin.
- **Negatif:** *Breaking change* bagi UI, memerlukan waktu refactor yang signifikan.

## Plan
1. Refactor `CheckoutModal.tsx` & `CheckoutButton.tsx`.
2. Implement `CheckoutUseCase`.
3. Use `DatabaseMutex` to prevent race conditions.
