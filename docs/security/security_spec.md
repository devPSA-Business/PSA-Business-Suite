# Security Specification - Firestore Rules

## Data Invariants
- `users`: `branchId` is mandatory and must match user's branch.
- `stock`: `branchId` is mandatory, must match user's branch, items must have valid name, barcode, price, quantity.
- `transactions`: `branchId` must exist, associated with the user, valid structure.
- `audit_logs`: Immutable, created with branchId.

## The "Dirty Dozen" Payloads (Examples)
1. Shadow update of transaction total by a non-Manager.
2. Attempt to inject a large (1MB) string into a transaction field.
3. Update a `StockItem` without `branchId`.
4. Update a `StockItem` with a `branchId` that does not match user's branch.
5. Create an `AuditLog` for a different branch.
6. Delete a `Transaction` by a normal user.
7. Set `role` of own `User` profile to 'ADMIN'.
8. Inject junk ID as `{stockId}`.
9. Create `StockItem` with negative `price`.
10. Update `createdAt` field in `Customer`.
11. Read `users` profile of a different user.
12. Attempt to query `transactions` across all branches.

## Plan
1.  Implement `isValid[Entity]` for all entities.
2.  Add action-based updates using `affectedKeys().hasOnly()`.
3.  Add immutable field checks (`branchId`, `createdAt`, `userId`).
4.  Add `isOwner` or `isManager` checks.
5.  Add server timestamp checks (`request.time`).
