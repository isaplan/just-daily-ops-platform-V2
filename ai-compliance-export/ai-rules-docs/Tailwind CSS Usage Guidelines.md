# Tailwind CSS Usage Guidelines

## Configuration (`tailwind.config.js`)

- **Theme Customization:** Define project-specific colors, fonts, spacing, breakpoints, etc., within `theme.extend`. Avoid modifying the base theme directly unless necessary. Reference design tokens if applicable.
- **Plugins:** List all required official and third-party plugins (e.g., `@tailwindcss/forms`, `@tailwindcss/typography`).
- **Content:** Ensure the `content` array accurately reflects all file paths where Tailwind classes are used (e.g., `./app/**/*.{js,ts,jsx,tsx}`, `./components/**/*.{js,ts,jsx,tsx}`).

## Utility Class Usage

- **Prefer Utilities:** Use utility classes directly in HTML/JSX whenever possible.
- **Readability:** For long lists of utilities, consider formatting them across multiple lines or using tools/plugins that help manage class strings (e.g., `prettier-plugin-tailwindcss`).
- **Avoid `@apply`:** Use `@apply` sparingly in global CSS files for base styles or very complex, reusable component patterns *only if necessary*. Overuse can negate Tailwind's benefits. Prefer component abstractions in React/Vue/etc.
- **No Arbitrary Values (Generally):** Stick to the defined theme values. Use arbitrary values (`[color: #123456]`, `[margin: 13px]`) only as a last resort for unique exceptions that don't warrant a theme addition. Document reasons for their use.

## Component Styling Patterns

- **Buttons:** Define standard button styles using utility combinations. Consider using `cva` (Class Variance Authority) for variants (primary, secondary, sizes).
- **Cards:** Establish consistent padding, background, border, and shadow utilities for card elements.
- **Forms:** Utilize the `@tailwindcss/forms` plugin for sensible default form styling and customize as needed.

## Example (`cva` pattern for Buttons)

```typescript
// components/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={buttonVariants({ variant, size, className })} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';
```

## Attached References

- `@tailwind.config.js` (Attach the actual config file)
- `@DesignSystemTokens.json`
