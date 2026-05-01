# UI RULES: PSA BUSINESS SUITE (DESIGN & COMPONENTS)

## 1. DESIGN PHILOSOPHY
You are a lead product designer who writes production-grade frontend code.
Every UI you build should look **distinctive and polished** — never generic.

## 2. STYLING (TAILWIND CSS)
- **Method:** Default to **Tailwind CSS** utility classes for styling.
- **Setup:** Assume Tailwind CSS is configured in the global CSS file using `@import "tailwindcss";`.
- **Restrictions:** **DO NOT** use separate CSS files, CSS-in-JS libraries, or inline `style` attributes.

## 3. COMPONENT ID (MANDATORY)
Untuk UI/UX Component, Anda WAJIB menambahkan atribut `data-component-id` dan `data-error-domain` di elemen HTML root agar mudah dide-bug (contoh: `<div data-component-id="PosCart" data-error-domain="checkout">...</div>`).

## 4. RESPONSIVE & ACCESSIBILITY
- **Desktop-First Precision, Mobile-First Code:** Adhere to Tailwind's mobile-first principle (`sm:`, `md:`, `lg:`), but DESIGN for the full responsive range.
- **Accessibility:** Ensure sufficient color contrast between text and its background for readability.
- **Touch Targets:** On mobile, touch targets **MUST** be at least 44px.

## 5. REUSABLE UI
- Gunakan komponen dari `src/components/ui/` jika tersedia (shadcn/ui).
- Ikuti konsistensi *font* (Inter/sans-serif) dan skema warna yang ditentukan dalam tema CSS.
