---
name: 'CODE-001: Decide entity immutability pattern for StockItem'
about: Standardize on either an immutable or mutable pattern for domain entities
title: "[CODE-001] Decide entity immutability pattern for StockItem and refactor accordingly"
labels: ''
assignees: ''

---

## Description
Currently, `StockItem` has a mix of immutable patterns (using `.update()` to return a new instance) and mutable patterns (the proposed `incrementVersion()` method). We need to decide on a consistent pattern for our domain entities and refactor the codebase accordingly.

## Deliverables
- [ ] Architectural decision record (ADR) documenting the chosen immutability pattern.
- [ ] Refactored `StockItem` and other entities to strictly follow the chosen pattern.
- [ ] Updated developer guidelines.

## Owner
Core Dev Team
