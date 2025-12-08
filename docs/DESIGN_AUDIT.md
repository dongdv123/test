# Design System Audit Report

## Tổng quan
Báo cáo này liệt kê tất cả các inconsistencies và hardcoded values cần được migrate sang Design System tokens.

## 1. Colors - Cần migrate sang Design Tokens

### Hardcoded Colors trong `styles/product-detail.css`:
- `#0b6b44` → `var(--color-primary-dark)` hoặc `var(--color-success)`
- `#fff` → `var(--color-neutral-100)` hoặc `var(--color-text-on-primary)`
- `#0b5336` → `var(--color-primary-darker)`
- `#0c8a68` → `var(--color-primary)`
- `#0a6b52` → `var(--color-primary-light)`
- `#0b3b29` → `var(--color-text-primary)` hoặc `var(--color-primary-dark)`
- `#5b6b64` → `var(--color-text-tertiary)`
- `#666` → `var(--color-text-muted)`
- `#c54a32` → `var(--color-error)`
- `#33433c` → Cần thêm vào design system hoặc dùng `var(--color-text-secondary)`

### Hardcoded Colors trong `styles/components/buttons.css`:
- `#fff` → `var(--color-text-on-primary)`
- `#0c8a68` → `var(--color-primary)`
- `box-shadow: 0 18px 35px rgba(12, 138, 104, 0.25)` → `var(--shadow-6xl)` hoặc `var(--shadow-primary-lg)`

### Hardcoded Colors trong `styles/components/product-card.css`:
- `#fff` → `var(--color-neutral-100)`
- `#0b6b44` → `var(--color-primary-dark)`
- `box-shadow: 0 25px 60px rgba(0, 0, 0, 0.08)` → `var(--shadow-7xl)`
- `box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15)` → `var(--shadow-3xl)`

### Hardcoded Colors trong `styles/components/footer.css`:
- `#fff8e2` → `var(--color-bg-warm)` hoặc `var(--cream)`
- `#0b3b29` → `var(--color-text-primary)`
- `#999` → `var(--color-text-muted)`
- `#0c8a68` → `var(--color-primary)`
- `rgba(12, 138, 104, 0.1)` → Cần thêm vào design system
- `#d32f2f` → `var(--color-error)` hoặc cần thêm vào design system

## 2. Typography - Cần migrate sang Design Tokens

### Font Sizes cần migrate:
- `13px` → `var(--font-size-base)`
- `14px` → `var(--font-size-md)`
- `15px` → `var(--font-size-lg)`
- `16px` → `var(--font-size-xl)`
- `18px` → `var(--font-size-2xl)`
- `20px` → `var(--font-size-3xl)`
- `24px` → `var(--font-size-4xl)`
- `28px` → `var(--font-size-5xl)`
- `32px` → `var(--font-size-6xl)`

### Font Weights:
- Đã sử dụng đúng: `400`, `500`, `600`, `700`, `800`
- Nên migrate sang: `var(--font-weight-normal)`, `var(--font-weight-medium)`, etc.

### Line Heights:
- Cần kiểm tra và migrate sang design tokens nếu có hardcoded values

## 3. Spacing - Cần migrate sang Design Tokens

### Spacing values cần migrate:
- `4px` → `var(--spacing-1)`
- `6px` → `var(--spacing-2)`
- `8px` → `var(--spacing-3)`
- `10px` → `var(--spacing-4)`
- `12px` → `var(--spacing-5)`
- `14px` → `var(--spacing-6)`
- `16px` → `var(--spacing-7)`
- `18px` → `var(--spacing-8)`
- `20px` → `var(--spacing-9)`
- `24px` → `var(--spacing-10)`
- `28px` → `var(--spacing-11)`
- `32px` → `var(--spacing-12)`
- `40px` → `var(--spacing-13)`

### Gap values:
- Tất cả gap values nên migrate sang spacing tokens

## 4. Border Radius - Cần migrate sang Design Tokens

### Border radius cần migrate:
- `20px` → `var(--radius-2xl)`
- `4px` → `var(--radius-sm)`
- `2px` → Cần thêm vào design system hoặc dùng `var(--radius-sm)`
- `999px` → `var(--radius-pill)`
- `50%` → `var(--radius-full)`
- `0.75em` → `var(--card-radius)` hoặc `var(--button-border-radius)`
- `0.75rem` → `var(--card-radius)`

## 5. Shadows - Cần migrate sang Design Tokens

### Shadows cần migrate:
- `0 18px 35px rgba(12, 138, 104, 0.25)` → `var(--shadow-6xl)` hoặc `var(--shadow-primary-lg)`
- `0 25px 60px rgba(0, 0, 0, 0.08)` → `var(--shadow-7xl)`
- `0 10px 25px rgba(0, 0, 0, 0.15)` → `var(--shadow-3xl)`
- `0 2px 8px rgba(0, 0, 0, 0.08)` → `var(--shadow-lg)`
- `0 2px 12px rgba(12, 138, 104, 0.15)` → `var(--shadow-primary-xl)`

## 6. Transitions - Cần migrate sang Design Tokens

### Transitions cần migrate:
- `0.2s ease` → `var(--transition-base)`
- `0.3s ease` → `var(--transition-slower)`
- `all 0.2s` → `var(--transition-all)`

## 7. Components cần kiểm tra

### Buttons (`styles/components/buttons.css`):
- ✅ Đã sử dụng `var(--fern)` 
- ❌ Hardcoded `#fff`, `#0c8a68`
- ❌ Hardcoded `padding: 14px 28px` → nên dùng `var(--button-padding-y) var(--button-padding-x)`
- ❌ Hardcoded `font-size: 15px` → nên dùng `var(--button-font-size)`
- ❌ Hardcoded `border-radius: .75em` → nên dùng `var(--button-border-radius)`

### Product Card (`styles/components/product-card.css`):
- ✅ Đã sử dụng `var(--card-radius)`
- ❌ Hardcoded `#fff`, `#0b6b44`
- ❌ Hardcoded shadows
- ❌ Hardcoded spacing values

### Footer (`styles/components/footer.css`):
- ✅ Đã sử dụng `var(--stone)`, `var(--border)`
- ❌ Hardcoded colors: `#fff8e2`, `#0b3b29`, `#999`, `#0c8a68`
- ❌ Hardcoded spacing values
- ❌ Hardcoded font sizes

### Header (`styles/components/header.css`):
- Cần kiểm tra chi tiết

### Product Detail (`styles/product-detail.css`):
- Nhiều hardcoded values cần migrate

## 8. Text Content - Cần kiểm tra consistency

### Typography inconsistencies:
- Cần kiểm tra các heading tags (h1, h2, h3, h4, h5, h6) có sử dụng đúng font-family không
- Cần kiểm tra text colors có consistent không
- Cần kiểm tra text sizes có theo scale không

## 9. Action Items

### Priority 1 (Critical):
1. Migrate tất cả hardcoded colors sang design tokens
2. Migrate tất cả hardcoded spacing sang design tokens
3. Migrate tất cả hardcoded font sizes sang design tokens

### Priority 2 (Important):
4. Migrate shadows sang design tokens
5. Migrate border radius sang design tokens
6. Migrate transitions sang design tokens

### Priority 3 (Nice to have):
7. Thêm các missing colors vào design system
8. Tạo utility classes cho các patterns thường dùng
9. Document các custom values nếu cần thiết

## 10. Missing Design Tokens

Các giá trị này cần được thêm vào design system:
- `#33433c` - Dark green variant
- `#d32f2f` - Error red variant
- `rgba(12, 138, 104, 0.1)` - Primary color với opacity
- `rgba(211, 47, 47, 0.1)` - Error color với opacity
- `2px` border radius variant
- Các shadow variants với opacity khác nhau

## 11. Recommendations

1. **Tạo migration script** để tự động thay thế các hardcoded values
2. **Thêm linting rules** để prevent hardcoded values trong tương lai
3. **Code review checklist** để đảm bảo sử dụng design tokens
4. **Documentation** về cách sử dụng design tokens
5. **Regular audits** để maintain consistency

