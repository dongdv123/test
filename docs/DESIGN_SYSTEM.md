# Design System Documentation

## Overview
This design system provides a centralized set of design tokens and utilities for maintaining consistency across the entire website.

## Color System

### Primary Colors
- `--color-primary` (#0c8a68): Main brand color (Fern)
- `--color-primary-dark` (#0a5a45): Darker variant
- `--color-primary-darker` (#014126): Darkest green
- `--color-primary-light` (#0a6b52): Lighter variant for hover states

### Secondary Colors
- `--color-secondary` (#f3bf2f): Accent yellow (Sun)
- `--color-secondary-dark` (#c4941b): Darker yellow

### Neutral Colors
- `--color-neutral-100` (#fff): Pure white
- `--color-neutral-50` (#fdfefe): Off-white
- `--color-neutral-25` (#fafbfa): Very light gray
- `--color-neutral-10` (#f8faf8): Lightest gray
- `--color-neutral-5` (#f6f8f4): Subtle gray
- `--color-neutral-0` (#f1f5f1): Sage - Light background

### Text Colors
- `--color-text-primary` (#10231b): Main text (Ink)
- `--color-text-secondary` (#5f6c67): Secondary text (Stone)
- `--color-text-tertiary` (#5b6b64): Muted text
- `--color-text-muted` (#999): Placeholder text
- `--color-text-light` (#4d4d4d): Light text
- `--color-text-on-primary` (#fff): White text on colored backgrounds

### Background Colors
- `--color-bg-primary` (#fff): Main background
- `--color-bg-secondary` (#f1f5f1): Sage - Secondary background
- `--color-bg-tertiary` (#f3eee2): Header background
- `--color-bg-accent` (#e2efe7): Light green background
- `--color-bg-warm` (#fff6df): Cream - Warm background

### Border Colors
- `--color-border` (#e5e8e3): Main border
- `--color-border-light` (#dfe5de): Light border
- `--color-border-lighter` (#cfe2d7): Lighter border
- `--color-border-dark` (#cde2d8): Darker border

## Typography

### Font Families
- `--font-primary`: "Nunito Sans", "Inter", system fonts (Body text)
- `--font-heading`: "Playfair Display", Georgia, serif (Headings)

### Font Sizes
- `--font-size-xs`: 11px
- `--font-size-sm`: 12px
- `--font-size-base`: 13px
- `--font-size-md`: 14px
- `--font-size-lg`: 15px
- `--font-size-xl`: 16px
- `--font-size-2xl`: 18px
- `--font-size-3xl`: 20px
- `--font-size-4xl`: 24px
- `--font-size-5xl`: 28px
- `--font-size-6xl`: 32px
- `--font-size-7xl`: 36px
- `--font-size-8xl`: 40px
- `--font-size-hero`: clamp(48px, 6vw, 66px)

### Font Weights
- `--font-weight-normal`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600
- `--font-weight-bold`: 700
- `--font-weight-extrabold`: 800

### Line Heights
- `--line-height-tight`: 1.02
- `--line-height-normal`: 1.2
- `--line-height-relaxed`: 1.3
- `--line-height-comfortable`: 1.4
- `--line-height-loose`: 1.5
- `--line-height-relaxed-2`: 1.6
- `--line-height-relaxed-3`: 1.7
- `--line-height-relaxed-4`: 1.8

### Letter Spacing
- `--letter-spacing-tight`: -0.02em
- `--letter-spacing-normal`: 0
- `--letter-spacing-wide`: 0.01em
- `--letter-spacing-wider`: 0.02em
- `--letter-spacing-widest`: 0.05em
- `--letter-spacing-extra-wide`: 0.1em
- `--letter-spacing-ultra-wide`: 0.2em
- `--letter-spacing-mega-wide`: 0.3em

## Spacing System

All spacing values follow an 8px base unit system:

- `--spacing-0`: 0
- `--spacing-1`: 4px
- `--spacing-2`: 6px
- `--spacing-3`: 8px
- `--spacing-4`: 10px
- `--spacing-5`: 12px
- `--spacing-6`: 14px
- `--spacing-7`: 16px
- `--spacing-8`: 18px
- `--spacing-9`: 20px
- `--spacing-10`: 24px
- `--spacing-11`: 28px
- `--spacing-12`: 32px
- `--spacing-13`: 40px
- `--spacing-14`: 48px
- `--spacing-15`: 50px
- `--spacing-16`: 60px
- `--spacing-17`: 70px
- `--spacing-18`: 80px

## Border Radius

- `--radius-none`: 0
- `--radius-sm`: 6px
- `--radius-md`: 8px
- `--radius-lg`: 10px
- `--radius-xl`: 12px
- `--radius-2xl`: 20px
- `--radius-full`: 50%
- `--radius-pill`: 999px
- `--card-radius`: 0.75rem (12px) - Main card radius

## Shadows

### Standard Shadows
- `--shadow-xs`: 0 1px 2px rgba(0, 0, 0, 0.05)
- `--shadow-sm`: 0 2px 4px rgba(0, 0, 0, 0.05)
- `--shadow-md`: 0 2px 6px rgba(0, 0, 0, 0.08)
- `--shadow-lg`: 0 2px 8px rgba(0, 0, 0, 0.1)
- `--shadow-xl`: 0 4px 12px rgba(0, 0, 0, 0.1)
- `--shadow-2xl`: 0 4px 16px rgba(0, 0, 0, 0.12)
- `--shadow-3xl`: 0 6px 20px rgba(0, 0, 0, 0.15)
- `--shadow-4xl`: 0 10px 30px rgba(0, 0, 0, 0.12)
- `--shadow-5xl`: 0 12px 35px rgba(0, 0, 0, 0.08)
- `--shadow-6xl`: 0 18px 35px rgba(12, 138, 104, 0.25)
- `--shadow-7xl`: 0 25px 60px rgba(0, 0, 0, 0.12)

### Primary Color Shadows
- `--shadow-primary-sm`: 0 2px 6px rgba(12, 138, 104, 0.1)
- `--shadow-primary-md`: 0 4px 12px rgba(12, 138, 104, 0.08)
- `--shadow-primary-lg`: 0 4px 16px rgba(12, 138, 104, 0.1)
- `--shadow-primary-xl`: 0 6px 20px rgba(12, 138, 104, 0.15)
- `--shadow-primary-2xl`: 0 10px 30px rgba(12, 138, 104, 0.06)

## Transitions

- `--transition-fast`: 0.15s ease
- `--transition-base`: 0.2s ease
- `--transition-slow`: 0.25s ease
- `--transition-slower`: 0.3s ease
- `--transition-slowest`: 0.4s ease

### Transition Presets
- `--transition-all`: all var(--transition-base)
- `--transition-color`: color var(--transition-base)
- `--transition-transform`: transform var(--transition-base)
- `--transition-opacity`: opacity var(--transition-base)
- `--transition-shadow`: box-shadow var(--transition-slow)
- `--transition-border`: border-color var(--transition-base)

## Layout

- `--site-max-width`: 80%
- `--container-padding`: 0
- `--section-width`: 80%

### Z-Index Scale
- `--z-index-base`: 1
- `--z-index-dropdown`: 10
- `--z-index-sticky`: 20
- `--z-index-overlay`: 100
- `--z-index-modal`: 200
- `--z-index-popover`: 300
- `--z-index-tooltip`: 400
- `--z-index-toast`: 500
- `--z-index-max`: 1000

## Breakpoints

- `--breakpoint-xs`: 480px
- `--breakpoint-sm`: 600px
- `--breakpoint-md`: 768px
- `--breakpoint-lg`: 900px
- `--breakpoint-xl`: 1024px
- `--breakpoint-2xl`: 1280px

## Component Tokens

### Buttons
- `--button-padding-x`: 28px
- `--button-padding-y`: 14px
- `--button-padding-x-sm`: 24px
- `--button-padding-y-sm`: 12px
- `--button-border-radius`: 0.75em
- `--button-font-size`: 15px
- `--button-font-weight`: 600

### Cards
- `--card-padding`: 20px
- `--card-padding-lg`: 24px
- `--card-padding-xl`: 32px
- `--card-gap`: 12px
- `--card-gap-lg`: 16px
- `--card-gap-xl`: 20px

### Icons
- `--icon-size-xs`: 16px
- `--icon-size-sm`: 18px
- `--icon-size-md`: 20px
- `--icon-size-lg`: 24px
- `--icon-size-xl`: 28px
- `--icon-size-2xl`: 32px
- `--icon-size-3xl`: 40px

### Inputs
- `--input-padding-x`: 20px
- `--input-padding-y`: 12px
- `--input-border-radius`: 12px
- `--input-border-width`: 2px
- `--input-font-size`: 15px

## Utility Classes

### Color Utilities
- `.text-primary` - Primary text color
- `.text-primary-dark` - Dark primary text color
- `.text-secondary` - Secondary text color
- `.text-muted` - Muted text color
- `.text-on-primary` - White text on colored backgrounds
- `.bg-primary` - Primary background color
- `.bg-primary-dark` - Dark primary background
- `.bg-secondary` - Secondary background
- `.bg-warm` - Warm background color
- `.border-primary` - Primary border color
- `.border-light` - Light border color

### Spacing Utilities
- `.gap-xs`, `.gap-sm`, `.gap-md`, `.gap-lg`, `.gap-xl` - Gap utilities
- `.p-xs`, `.p-sm`, `.p-md`, `.p-lg`, `.p-xl` - Padding utilities
- `.m-xs`, `.m-sm`, `.m-md`, `.m-lg`, `.m-xl` - Margin utilities

### Shadow Utilities
- `.shadow-sm`, `.shadow-md`, `.shadow-lg`, `.shadow-xl` - Standard shadows
- `.shadow-primary` - Primary color shadow

### Transition Utilities
- `.transition` - Base transition
- `.transition-fast` - Fast transition
- `.transition-slow` - Slow transition

### Border Radius Utilities
- `.rounded-sm`, `.rounded-md`, `.rounded-lg`, `.rounded-xl` - Standard radius
- `.rounded-full` - Full circle
- `.rounded-card` - Card radius

## Usage Examples

### Using Design Tokens in CSS
```css
.my-component {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-7);
  border-radius: var(--card-radius);
  box-shadow: var(--shadow-primary-md);
  transition: var(--transition-all);
}
```

### Using Utility Classes in HTML
```html
<div class="bg-primary text-on-primary p-lg rounded-card shadow-primary">
  Content here
</div>
```

## Migration Guide

When updating existing components to use the design system:

1. Replace hardcoded colors with design tokens
2. Replace hardcoded spacing values with spacing tokens
3. Use shadow tokens instead of custom shadows
4. Use transition tokens for consistent animations
5. Use utility classes where appropriate

## Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Use semantic color names** (e.g., `--color-text-primary` instead of `#10231b`)
3. **Follow the spacing scale** (multiples of 4px)
4. **Use consistent transitions** for similar interactions
5. **Leverage utility classes** for common patterns
6. **Document custom tokens** if you need to add new ones

